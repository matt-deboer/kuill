import React from 'react'
import AppBar from 'material-ui/AppBar'
import {Toolbar, ToolbarGroup, ToolbarSeparator} from 'material-ui/Toolbar'
import {grey200, grey300, grey800, blueA200} from 'material-ui/styles/colors'
import {typography} from 'material-ui/styles'
import {Link} from 'react-router-dom'
import { withRouter } from 'react-router-dom'
import { connect } from 'react-redux'
import { clearErrors } from '../state/actions/errors'
import Avatar from 'react-avatar'
import Badge from 'material-ui/Badge'
import IconButton from 'material-ui/IconButton'
import IconError from 'material-ui/svg-icons/action/info'
import RaisedButton from 'material-ui/FlatButton'

import Breadcrumbs from './Breadcrumbs'
import ErrorsDialog from './ErrorsDialog'
import Snackbar from 'material-ui/Snackbar'
import './Header.css'

const mapStateToProps = function(store) {
  return {
    user: store.session.user,
    errors: store.errors.errors,
    latestError: store.errors.latestError,
    location: store.routing.location,
  }
}

const mapDispatchToProps = function(dispatch) {
  return {
    clearError: function(error) {
      dispatch(clearErrors(error))
    },
    clearAllErrors: function(errors) {
      dispatch(clearErrors(...errors))
    }
  }
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps) (
class Header extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      open: false,
      latestErrorOpen: !!props.latestError,
      latestError: props.latestError,
      location: props.location,
    }
    this.handleLatestErrorRequestClose = this.handleLatestErrorRequestClose.bind(this)
  }

  handleLatestErrorRequestClose = () => {
    this.setState({
      latestErrorOpen: false,
    })
  }

  handleOpen = () => {
    this.setState({open: true})
  }

  handleClose = () => {
    this.setState({open: false})
  }

  componentWillReceiveProps = (props) => {
    let nextState = {}

    if (this.state.open && props.errors.length === 0) {
      nextState.open = false
    }

    if (props.latestError !== this.state.latestError) {
      nextState.latestError = props.latestError
      nextState.latestErrorOpen = !!props.latestError
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
    }

    let { props } = this
    return (
      <AppBar
        iconElementLeft={<Avatar
          src={require('../images/kubernetes-logo.svg')}
          size={30}
          style={{background: 'transparent', marginLeft: 10, marginTop: 8}}
        />}
        style={{...props.styles, ...styles.appBar}}
        title={
        <Toolbar style={{...styles.menu}}>
          <ToolbarGroup firstChild={true}>
            <ToolbarSeparator className="separator-bar"/>
            {
              props.menu.map(menuItem =>
                <Link to={menuItem.link} key={menuItem.name} >
                  <RaisedButton
                    label={menuItem.name}
                    icon={menuItem.icon}
                    className={'menu-button'}
                    labelStyle={styles.menuButtonLabel}
                    data-rh={menuItem.name}
                    data-rh-at={'bottom'}
                    data-rh-cls={'menu-button-rh'}
                  />
                </Link>)}
            
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
            <Avatar email={props.user} name={props.user} color={blueA200} round={true} size={42} style={styles.avatar}/>
          </ToolbarGroup>
        </Toolbar>
      }>
        <ErrorsDialog open={this.state.open}/>

        <Snackbar
          className="error-bar"
          style={{right: 10, top: 65, transform: 'translate3d(0px, 0px, 0px)', transition: '-webkit-transform 225ms cubic-bezier(0, 0, 0.2, 1) 0ms', bottom: 'auto', left: 'auto'}}
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

