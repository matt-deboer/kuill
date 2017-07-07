import React from 'react'
import AppBar from 'material-ui/AppBar'
import {Toolbar, ToolbarGroup, ToolbarSeparator} from 'material-ui/Toolbar'
import MenuItem from 'material-ui/MenuItem'
import DropDownMenu from 'material-ui/DropDownMenu'
import {grey200, grey500, grey800, grey900, blueA200} from 'material-ui/styles/colors'
import {spacing, typography} from 'material-ui/styles'
import {Link} from 'react-router-dom'
import { connect } from 'react-redux'
import Avatar from 'react-avatar'
import Badge from 'material-ui/Badge'
import IconButton from 'material-ui/IconButton'
import IconError from 'material-ui/svg-icons/action/info'

const mapStateToProps = function(store) {
  return {
    user: store.session.user,
    errors: store.errors.errors,
  };
}
export default connect(mapStateToProps) (
class Header extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      value: this.setMenuFromUrl(),
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
        // textShadow: '#000 0px 0px 1px',
        // WebkitFontSmoothing: 'antialiased',
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
      chip: {
        // display: 'inline-block'
      },
      avatar: {
        // marginLeft: -20,
        marginRight: 10,
      },
    }

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
                >
                <IconError />
              </IconButton>
            </Badge>
            <Avatar email={props.user} name={props.user} color={blueA200} round={true} size={42} style={styles.avatar}/>
          </ToolbarGroup>
        </Toolbar>
      } />
    )
  }
})

