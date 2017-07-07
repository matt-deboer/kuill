import React from 'react';
import Drawer from 'material-ui/Drawer';
import {spacing, typography} from 'material-ui/styles';
import {white, grey700, grey800} from 'material-ui/styles/colors';
import MenuItem from 'material-ui/MenuItem';
import Menu from 'material-ui/Menu';
import {Link} from 'react-router-dom';

export default function LeftDrawer(props) {

  const styles = {
    logo: {
      cursor: 'pointer',
      fontSize: 22,
      color: typography.textFullWhite,
      lineHeight: `${spacing.desktopKeylineIncrement}px`,
      backgroundColor: grey800,
      backgroundImage: 'url(' + require('../images/kubernetes-logo.svg') + ')',
      backgroundSize: '15%',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: '6% center',
      paddingLeft: 40,
      height: 56,
      overflow: 'none',
    },
    menuItem: {
      color: white,
      fontSize: 14,
    },
    menuInnerStyle: {
      paddingLeft: 54,
      background: 'transparent',
      border: '1px rgba(0,0,0,0.66)'
    }
  };

  return (
    <Drawer
      width={170}
      docked={true}
      open={true}
      containerStyle={{overflow: 'hidden'}}>
      <div style={styles.logo}>
        Kubernetes
      </div>
      <Menu
        selectedMenuItemStyle={{backgroundColor: grey700}}>
        {props.menu.map((menuItem, index) =>
          <MenuItem
            key={index}
            style={styles.menuItem}
            primaryText={menuItem.name}
            leftIcon={menuItem.icon}
            innerDivStyle={styles.menuInnerStyle}
            containerElement={<Link to={menuItem.link}/>}
          />
        )}
      </Menu>
    </Drawer>
  );
}
