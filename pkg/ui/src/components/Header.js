import React from 'react'
import AppBar from 'material-ui/AppBar'
import {Toolbar, ToolbarGroup, ToolbarSeparator} from 'material-ui/Toolbar'
import MenuItem from 'material-ui/MenuItem'
import DropDownMenu from 'material-ui/DropDownMenu'
import {grey200, grey300, grey500, grey700, grey800, grey900, blueA200, red900, white} from 'material-ui/styles/colors'
import {spacing, typography} from 'material-ui/styles'
import {Link} from 'react-router-dom'
import { connect } from 'react-redux'
import { clearErrors } from '../state/actions/errors'
import Avatar from 'react-avatar'
import Badge from 'material-ui/Badge'
import IconButton from 'material-ui/IconButton'
import IconError from 'material-ui/svg-icons/action/info'
import IconClearError from 'material-ui/svg-icons/action/delete'
import Dialog from 'material-ui/Dialog'
import FlatButton from 'material-ui/FlatButton'
import RaisedButton from 'material-ui/FlatButton'
import {
  Table,
  TableBody,
  TableRow,
  TableRowColumn,
} from 'material-ui/Table'
import Breadcrumbs from './Breadcrumbs'

const mapStateToProps = function(store) {
  return {
    user: store.session.user,
    errors: store.errors.errors,
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

const errorIcons = {
  error: <IconError style={{color: grey500}}/>,
}

export default connect(mapStateToProps, mapDispatchToProps) (
class Header extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      open: false,
    }
  }

  handleOpen = () => {
    this.setState({open: true})
  }

  handleClose = () => {
    this.setState({open: false})
  }

  render() {

    const styles = {
      appBar: {
        position: 'fixed',
        top: 0,
        overflow: 'hidden',
        maxHeight: 57,
        width: '100%',
        paddingLeft: 15,
        paddingRight: 15,
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
        fontSize: '2vw',
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

    const actions = [
      <FlatButton
        label="Dismiss"
        secondary={true}
        labelStyle={{color: red900, fontWeight: 600}}
        keyboardFocused={true}
        onTouchTap={this.handleClose}
      />,
    ]

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
            <div style={styles.name}>Kubernetes</div>
            <ToolbarSeparator style={{backgroundColor: grey500, marginRight: 18, marginLeft: 18}}/>
            {props.location.pathname === '/' ?
              props.menu.map(menuItem =>
                <Link to={menuItem.link}>
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
        <Dialog
          title={<div>{`Dashboard Errors: ${this.props.errors.length}`}
            <RaisedButton label="Clear All" 
              backgroundColor={grey700} 
              labelColor={white}
              style={{float: 'right', color: white}}
              onTouchTap={this.props.clearAllErrors.bind(this, this.props.errors)}
              />
            </div>}
          titleStyle={{backgroundColor: red900, color: grey200}}
          actions={actions}
          modal={false}
          open={this.state.open && this.props.errors.length > 0}
          onRequestClose={this.handleClose}
          autoScrollBodyContent={true}
        >
          <Table selectable={false} style={{ border: '0', margin: 15}} wrapperStyle={{overflowX: 'hidden'}}>
            <TableBody displayRowCheckbox={false}>
              {props.errors.map((error, index)=>
                <TableRow key={error.id} displayBorder={true} style={{height: 28}}>
                  <TableRowColumn style={{ width: 48, height: 28, padding: 4}}>
                    <IconButton iconStyle={{color: grey500}} data-rh="Clear Error"
                      onTouchTap={this.props.clearError.bind(this, error)}>
                      <IconClearError/>
                    </IconButton>
                  </TableRowColumn>
                  <TableRowColumn style={{ width: 48, height: 28, padding: 4}}>
                    <IconButton iconStyle={{color: red900}}>{errorIcons[error.severity]}</IconButton>
                  </TableRowColumn>
                  <TableRowColumn style={{ height: 28, padding: 4}}>
                    <span style={styles.message}>{error.message}</span>
                  </TableRowColumn>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Dialog>
      </AppBar>
    )
  }
})

