import React from 'react'
import AppBar from 'material-ui/AppBar'
import {Toolbar, ToolbarGroup, ToolbarSeparator} from 'material-ui/Toolbar'
import MenuItem from 'material-ui/MenuItem'
import DropDownMenu from 'material-ui/DropDownMenu'
import {grey200, grey300, grey400, grey500, grey700, grey800, grey900, blueA200, red900, white} from 'material-ui/styles/colors'
import {spacing, typography} from 'material-ui/styles'
import {Link} from 'react-router-dom'
import Avatar from 'react-avatar'
import Badge from 'material-ui/Badge'
import IconButton from 'material-ui/IconButton'
import IconHome from 'material-ui/svg-icons/action/home'
import IconChevronRight from 'material-ui/svg-icons/hardware/keyboard-arrow-right'

export default class Breadcrumbs extends React.Component {

  parseFromPath = (path) => {
    let crumbs = []
    let rel = path.substring(1)
    if (!!rel) {
      let parts = rel.split('/')
      let part = parts.shift()
      let base = `/${part}`
      crumbs.push({name: part, link: base})
      if (parts.length > 0) {
        let last = parts.join(' / ')
        crumbs.push({name: last, link: `${base}/${last}`})
      }
    }
    return crumbs
  }

  render() {

    let separator = <IconChevronRight style={{
      fill: grey500,
      verticalAlign: 'middle',
      marginRight: 5,
    }}/>

    const styles = {
      link: {
        color: grey300,
      }
    }

    let { props } = this
    let crumbs = this.parseFromPath(props.location.pathname)
    let renderedCrumbs = []
    
    if (crumbs.length > 0) {
      renderedCrumbs.push(<Link to={'/'}><IconButton style={{
          verticalAlign: 'middle',
          paddingRight: 0,
          paddingLeft: 0,
          marginRight: -5,
          marginLeft: -5,
        }} iconStyle={{fill: grey300}}><IconHome /></IconButton></Link>)
      renderedCrumbs.push(separator)
      for (let i=0, len=crumbs.length; i < len; ++i) {
        let crumb = crumbs[i]
        if (i < (len - 1)) {
          renderedCrumbs.push(<Link to={crumb.link} style={styles.link}>{crumb.name}</Link>)
          renderedCrumbs.push(separator)
        } else {
          renderedCrumbs.push(<div style={{display: 'inline-block'}}>{crumb.name}</div>)
        }
      }
    } else {
      renderedCrumbs.push(<div style={{height: 48, width: 48, padding: 12}}><IconHome /></div>)
    }

    return (
      <div style={{display: 'inline-block', fontSize: '15px'}}>
        {renderedCrumbs}
      </div>
    )
  }
}

