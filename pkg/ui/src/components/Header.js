import React from 'react'
import AppBar from 'material-ui/AppBar'
import {Toolbar, ToolbarGroup, ToolbarSeparator} from 'material-ui/Toolbar'
import MenuItem from 'material-ui/MenuItem'
import DropDownMenu from 'material-ui/DropDownMenu'
import {grey200, grey500, grey700, grey800, grey900, blueA200, red900, white} from 'material-ui/styles/colors'
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
      value: this.setMenuFromUrl(),
      open: false,
    }
  }

  setMenuFromUrl = () => {
    for (let item of this.props.menu) {
      if (this.props.location.pathname.startsWith(item.path)) {
        return item.name
      }
    }
    return this.props.menu[0].name
  }

  handleOpen = () => {
    this.setState({open: true})
  }

  handleClose = () => {
    this.setState({open: false})
  }

  handleChange = (event, index, value) => this.setState({value})

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
      dropdownMenu: {
        overflowX: 'hidden',
        paddingTop: 0,
        paddingBottom: 0,
        backgroundColor: grey900,
      },
      dropdownMenuItems: {
        fontSize: 18,
        padding: 8,
        color: grey200,
        fontWeight: 600,
      },
      dropdownSelectedItem: {
        fontSize: 18,
        padding: 8,
        color: '#326DE6',
        fontWeight: 600,
      },
      menu: {
        backgroundColor: 'transparent',
        color: grey200,
        fontSize: 18,
        fontWeight: 600,
      },
      menuButton: {
        marginLeft: 0
      },
      iconsRightContainer: {
        marginLeft: 20
      },
      logo: {
        cursor: 'pointer',
        fontSize: 22,
        color: typography.textFullWhite,
        lineHeight: `${spacing.desktopKeylineIncrement}px`,
        backgroundColor: grey800,
        backgroundImage: 'url(' + require('../images/kubernetes-logo.svg') + ')',
        backgroundSize: '36px 36px',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'left center',
        paddingLeft: 50,
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
        iconElementLeft={null}
        style={{...props.styles, ...styles.appBar}}
        title={
        <Toolbar style={{...styles.menu}}>
          <ToolbarGroup firstChild={true}>
            <div style={styles.logo}>Kubernetes</div>
            <ToolbarSeparator style={{backgroundColor: grey500, marginRight: 24}}/>
            <DropDownMenu
              style={{backgroundColor: grey900}}
              selectedMenuItemStyle={styles.dropdownSelectedItem}
              menuItemStyle={styles.dropdownMenuItems} 
              listStyle={styles.dropdownMenu}
              value={this.state.value}
              onChange={this.handleChange}
              labelStyle={styles.menu}>
              {props.menu.map((menuItem, index) =>
                <MenuItem
                  key={index}
                  value={menuItem.name}
                  style={styles.menuItem}
                  primaryText={menuItem.name}
                  containerElement={<Link to={menuItem.link}/>}
                />
              )}
            </DropDownMenu>
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
          title={<div>Dashboard Errors
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

