import React from 'react'
import AppBar from 'material-ui/AppBar'
import {Toolbar, ToolbarGroup, ToolbarSeparator} from 'material-ui/Toolbar'
import {grey200, grey300, grey500, grey700, grey800, blueA200} from 'material-ui/styles/colors'
import {typography} from 'material-ui/styles'
import {Link} from 'react-router-dom'
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

const mapStateToProps = function(store) {
  return {
    user: store.session.user,
    errors: store.errors.errors,
    latestError: store.errors.latestError,
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

export default connect(mapStateToProps, mapDispatchToProps) (
class Header extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      open: false,
      latestErrorOpen: !!props.latestError,
      latestError: props.latestError,
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
    if (this.state.open && props.errors.length === 0) {
      this.setState({
        open: false,
      })
    } else if (props.latestError !== this.state.latestError) {
      this.setState({
        latestError: props.latestError,
        latestErrorOpen: !!props.latestError,
      })
    }
  }

  shouldComponentUpdate = (nextProps, nextState) => {
    return nextProps.latestError !== this.props.latestError
      || nextProps.errors.length !== this.props.errors.length
      || nextProps.user !== this.props.user
      || nextState.open !== this.state.open
      || nextState.latestErrorOpen !== this.state.latestErrorOpen
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
      menuButton: {
        marginLeft: 0,
        backgroundColor: grey700,
        marginRight: 10,
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
            {/* <div style={styles.name}>Kubernetes</div> */}
            <ToolbarSeparator style={{backgroundColor: grey500, marginRight: 18, marginLeft: 18}}/>
            {props.location.pathname === '/' ?
              props.menu.map(menuItem =>
                <Link to={menuItem.link} key={menuItem.name}>
                  <RaisedButton
                    label={menuItem.name}
                    icon={menuItem.icon}
                    style={styles.menuButton}
                    labelStyle={styles.menuButtonLabel}
                  />
                </Link>)
              : <Breadcrumbs location={props.location}/>
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
                tooltip="Dashboard Errors" 
                iconStyle={{height: 36, width: 36}}
                tooltipPosition={'bottom-left'}
                tooltipStyles={{marginTop: -40, marginRight: 25}}
                onTouchTap={this.handleOpen}
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
          style={{right: 10, top: 65, transform: 'translate3d(0px, 0px, 0px)', transition: '-webkit-transform 225ms cubic-bezier(0, 0, 0.2, 1) 0ms', bottom: 'auto', left: 'auto'}}
          open={this.state.latestErrorOpen}
          message={!!this.props.latestError ? this.props.latestError.message : ''}
          autoHideDuration={3000}
          onRequestClose={this.handleLatestErrorRequestClose}
        />
      </AppBar>
    )
  }
})

