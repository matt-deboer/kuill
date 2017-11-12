import React from 'react'
import AppBar from 'material-ui/AppBar'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from 'material-ui/Toolbar'
import { grey200, grey300, grey800, blueA200 } from 'material-ui/styles/colors'
import { typography } from 'material-ui/styles'
import { Link } from 'react-router-dom'
import { withRouter } from 'react-router-dom'
import { connect } from 'react-redux'
import { routerActions } from 'react-router-redux'
import { clearErrors, clearLatestError } from '../state/actions/errors'
import { invalidateSession } from '../state/actions/session'
import { objectEmpty } from '../comparators'
import Avatar from 'react-avatar'
import Badge from 'material-ui/Badge'
import IconButton from 'material-ui/IconButton'
import IconError from 'material-ui/svg-icons/action/info'
import RaisedButton from 'material-ui/FlatButton'
import Popover from 'material-ui/Popover'
import Menu from 'material-ui/Menu'
import MenuItem from 'material-ui/MenuItem'
import IconLogout from 'material-ui/svg-icons/action/power-settings-new'
import IconFilters from 'material-ui/svg-icons/content/filter-list'
import { defaultFetchParams } from '../utils/request-utils'
import Breadcrumbs from './Breadcrumbs'
import ErrorsDialog from './ErrorsDialog'
import FiltersDialog from './FiltersDialog'
import Snackbar from 'material-ui/Snackbar'
import './Header.css'

const mapStateToProps = function(store) {
  return {
    user: store.session.user,
    errors: store.errors.errors,
    latestError: store.errors.latestError,
    location: store.routing.location,
    editing: store.resources.editing,
    selectedNamespaces: store.usersettings.selectedNamespaces,
    selectedKinds: store.usersettings.selectedKinds,
  }
}

const mapDispatchToProps = function(dispatch) {
  return {
    clearError: function(error) {
      dispatch(clearErrors(error))
    },
    clearAllErrors: function(errors) {
      dispatch(clearErrors(...errors))
    },
    navigateHome: function() {
      dispatch(routerActions.push('/'))
    },
    invalidateSession: function() {
      dispatch(invalidateSession())
    },
    clearLatestError: function() {
      dispatch(clearLatestError())
    },
  }
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps) (
class Header extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      open: false,
      profileOpen: false,
      filtersOpen: false,
      latestErrorOpen: !!props.latestError,
      latestError: props.latestError,
      location: props.location,
    }
    this.handleLatestErrorRequestClose = this.handleLatestErrorRequestClose.bind(this)
    this.handleProfileTouchTap = this.handleProfileTouchTap.bind(this)
    this.handleOpenFilters = this.handleOpenFilters.bind(this)
    this.handleCloseFilters = this.handleCloseFilters.bind(this)
    this.requestVersion().then(version=> {
      this.setState({version: version})
    })
  }

  handleLatestErrorRequestClose = () => {
    this.setState({
      latestErrorOpen: false,
    })
    this.props.clearLatestError()
  }

  handleOpen = () => {
    this.setState({
      open: true,
      profileOpen: false,
    })
  }

  handleClose = () => {
    this.setState({open: false})
  }

  handleOpenFilters = () => {
    this.setState({
      open: false,
      filtersOpen: true,
      profileOpen: false,
    })
  }

  handleCloseFilters = () => {
    this.setState({filtersOpen: false})
  }

  handleProfileTouchTap = (event) => {
    // This prevents ghost click.
    event.preventDefault();
    this.setState({
      profileOpen: true,
      profileAnchor: event.currentTarget,
    })
  }

  requestVersion = async () => {
    return fetch('/version', defaultFetchParams
    ).then(resp => {
      if (resp.ok) {
        return resp.text()
      }
    }).then(version => {
      if (version) {
        let parts = version.split(/-|\+/)
        version = parts.slice(0,2).join('-')
        if (parts.length > 2) {
          version += '+'
        }
      }
      return version
    })
  }

  handleProfileRequestClose = () => {
    this.setState({profileOpen: false})
  }

  handleLogout = () => {
    this.props.invalidateSession()
    this.setState({
      profileOpen: false,
      filtersOpen: false,
      open: false,
    })
  }

  componentWillReceiveProps = (props) => {
    let nextState = {}

    if (this.state.open && props.errors.length === 0) {
      nextState.open = false
    }

    if (props.latestError !== this.state.latestError) {
      nextState.latestError = props.latestError
      if (!props.editing) {
        nextState.latestErrorOpen = !!props.latestError
      }
    }

    if (props.location !== this.state.location) {
      nextState.previousLocation = this.state.location
      nextState.location = props.location
    }
    if (Object.keys(nextState).length > 0) {
      this.setState(nextState)
    }
  }

  shouldComponentUpdate = (nextProps, nextState) => {
    return nextProps.latestError !== this.props.latestError
      || nextProps.errors.length !== this.props.errors.length
      || nextProps.user !== this.props.user
      || nextProps.location.pathname !== this.props.location.pathname
      || nextState.open !== this.state.open
      || nextState.latestErrorOpen !== this.state.latestErrorOpen
      || nextState.previousLocation !== this.state.previousLocation
      || nextState.profileOpen !== this.state.profileOpen
      || nextState.filtersOpen !== this.state.filtersOpen
  }

  render() {

    const styles = {
      appBar: {
        position: 'fixed',
        top: 0,
        overflow: 'hidden',
        maxHeight: 57,
        width: '100%',
        paddingLeft: 40,
        paddingRight: 30,
        backgroundColor: grey800,
      },
      menu: {
        backgroundColor: 'transparent',
        color: grey200,
        fontSize: 18,
        fontWeight: 600,
      },
      menuButtonLabel: {
        textTransform: 'none',
        color: grey300,
      },
      iconsRightContainer: {
        marginLeft: 20
      },
      name: {
        fontSize: '18px',
        color: typography.textFullWhite,
        lineHeight: '58px',
        backgroundColor: grey800,
        height: 56,
        overflow: 'none',
      },
      avatar: {
        marginRight: 10,
      },
      snackbar: {
        right: 10,
        top: 65,
        transform: 'translate3d(0px, 0px, 0px)',
        transition: '-webkit-transform 225ms cubic-bezier(0, 0, 0.2, 1) 0ms',
        bottom: 'auto',
        left: 'auto',
        zIndex: 15000,
      },
      logo: {
        backgroundImage: `url(${require('../images/logo_small.png')})`,
        backgroundSize: '70px 27px',
        backgroundPosition: '15px 10px',
        backgroundRepeat: 'no-repeat',
        backgroundColor: 'rgb(33,33,33)',
        height: 55,
        borderTop: '3px solid rgb(41, 121, 255)',
        textAlign: 'right',
        fontSize: 14,
        color: 'rgb(180,180,180)',
        lineHeight: '60px',
        paddingRight: 15,
      },
      profileMenu: {
        background: 'white',
        padding: 0, 
        display: 'block'
      },
    }

    let { props } = this
    let { selectedNamespaces, selectedKinds } = props
    let filtersActive = !objectEmpty(selectedNamespaces) || !objectEmpty(selectedKinds)

    return (
      <AppBar
        iconStyleLeft={{marginTop: 8, marginRight: 4, marginLeft: -10}}
        iconElementLeft={
          <Link to={'/'}>
            <RaisedButton
              icon={<Avatar
                src={require('../images/kubernetes-logo.svg')}
                size={30}
                style={{background: 'transparent', marginTop: -4}}
              />}
              style={{marginTop: 4}}
              className={'menu-button'}
              labelStyle={styles.menuButtonLabel}
              data-rh={'Home'}
              data-rh-at={'bottom'}
              data-rh-cls={'menu-button-rh'}
            />
          </Link>
          }
        style={{...props.styles, ...styles.appBar}}
        title={
        <Toolbar style={{...styles.menu}}>
          <ToolbarGroup firstChild={true}>
            <ToolbarSeparator className="separator-bar"/>
            {
              props.menu.map(menuItem =>
                <Link to={menuItem.link} key={menuItem.name} id={`goto-${menuItem.link.replace(/^([^\w]*)([\w-]+)(.*)$/,'$2')}`}>
                  <RaisedButton
                    label={menuItem.name}
                    icon={menuItem.icon}
                    className={'menu-button'}
                    labelStyle={styles.menuButtonLabel}
                    data-rh={menuItem.name}
                    data-rh-at={'bottom'}
                    data-rh-cls={'menu-button-rh'}
                  />
                </Link>)
            }

            <ToolbarSeparator className="separator-bar"/>
            <RaisedButton
              label={'Filters'}
              icon={<IconFilters/>}
              className={`menu-button filters${filtersActive ? ' active':''}`}
              labelStyle={styles.menuButtonLabel}
              data-rh={`Filters${filtersActive ? ' (active)' : '' }`}
              data-rh-at={'bottom'}
              data-rh-cls={'menu-button-rh'}
              onTouchTap={this.handleOpenFilters}
            />

            {props.location.pathname !== '/' &&
              <ToolbarSeparator className="separator-bar"/>
            }
            {props.location.pathname !== '/' &&
              <Breadcrumbs location={props.location} previousLocation={this.state.previousLocation}/>
            }
          </ToolbarGroup>
          
          <ToolbarGroup lastChild={true}>
            {props.errors.length > 0 &&
            <Badge
              badgeContent={props.errors.length}
              primary={true}
              badgeStyle={{top: 32, right: 16, height: 18, width: 18, zIndex: 2}}
            >
              <IconButton
                iconStyle={{height: 36, width: 36}}
                onTouchTap={this.handleOpen}
                data-rh={'Dashboard Errors'}
                data-rh-at={'bottom'}
                >
                <IconError />
              </IconButton>
            </Badge>
            }
            <RaisedButton
              className="profile"
              label={props.user}
              labelPosition="before"
              onTouchTap={this.handleProfileTouchTap}
              icon={<Avatar email={props.user} name={props.user} color={blueA200} round={true} size={32} style={styles.avatar}/>}
              labelStyle={{textTransform: 'none', color: '#9e9e9e'}}
              style={{margin: 0}}
            />
            <Popover
              open={this.state.profileOpen}
              anchorEl={this.state.profileAnchor}
              onRequestClose={this.handleProfileRequestClose}
              anchorOrigin={{horizontal: 'right', vertical: 'bottom'}}
              targetOrigin={{horizontal: 'right', vertical: 'top'}}
              style={{backgroundColor: 'rgb(33,33,33)'}}
              zDepth={4}
            >
              <Menu 
                desktop={false} 
                className={'profile-menu'}
                style={styles.profileMenu}
                >
                <MenuItem primaryText="Log out" 
                  leftIcon={<IconLogout/>}
                  onTouchTap={this.handleLogout}
                  className={'logout'}
                  />
              </Menu>
              <div style={styles.logo}>
              {this.state.version}
              </div>
            </Popover>
          </ToolbarGroup>
        </Toolbar>
      }>
        <ErrorsDialog open={this.state.open} handleClose={this.handleClose}/>

        <FiltersDialog open={this.state.filtersOpen && this.props.user} 
          handleClose={this.handleCloseFilters}/>

        <Snackbar
          className="error-bar"
          style={styles.snackbar}
          open={this.state.latestErrorOpen}
          message={!!this.props.latestError ? this.props.latestError.message : ''}
          autoHideDuration={5000}
          onRequestClose={this.handleLatestErrorRequestClose}
          action={!!this.props.latestError ? this.props.latestError.retry.text : ''}
          onActionTouchTap={!!this.props.latestError ? this.props.latestError.retry.action : null}
        />
      </AppBar>
    )
  }
}))

