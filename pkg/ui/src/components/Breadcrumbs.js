import React from 'react'
import { grey300, grey500 } from 'material-ui/styles/colors'
import { Link } from 'react-router-dom'
import IconButton from 'material-ui/IconButton'
import IconHome from 'material-ui/svg-icons/action/home'
import IconChevronRight from 'material-ui/svg-icons/hardware/keyboard-arrow-right'
import './Breadcrumbs.css'

export default class Breadcrumbs extends React.Component {

  parseFromPath = (path) => {
    let crumbs = []
    let rel = path.substring(1)
    if (!!rel) {
      let parts = rel.split('/')
      let part = parts.shift()
      let base = `/${part}`
      let link = base
      if (this.props.previousLocation && this.props.previousLocation.pathname === link) {
        link += this.props.previousLocation.search
      }
      crumbs.push({value: part, link: link})
      if (parts.length > 0) {
        let lastPart = parts[parts.length-1]
        let prefix = parts.slice(0, parts.length - 1).join(' / ') + ' / '
        let last = <span><span className="last-breadcrumb-prefix">{prefix}</span>{lastPart}</span>
        crumbs.push({value: last, link: `${base}/${last}`})
      }
    }
    return crumbs
  }

  shouldComponentUpdate = (nextProps) => {
    return nextProps.location.pathname !== this.props.location.pathname
  }

  render() {

    const styles = {
      link: {
        color: grey300,
      },
      separator: {
        fill: grey500,
        verticalAlign: 'middle',
        marginRight: 5,
      }
    }

    let { props } = this
    let crumbs = this.parseFromPath(props.location.pathname)
    let renderedCrumbs = []
    
    if (crumbs.length > 0) {
      renderedCrumbs.push(<Link key={renderedCrumbs.length} to={'/'}><IconButton style={{
          verticalAlign: 'middle',
          paddingRight: 0,
          paddingLeft: 0,
          marginRight: -5,
          marginLeft: -5,
        }} iconStyle={{fill: grey300}} data-rh={'Home'} data-rh-at={'bottom'}><IconHome /></IconButton></Link>)
      renderedCrumbs.push(<IconChevronRight key={renderedCrumbs.length} style={styles.separator}/>)
      for (let i=0, len=crumbs.length; i < len; ++i) {
        let crumb = crumbs[i]
        if (i < (len - 1)) {
          renderedCrumbs.push(<Link key={renderedCrumbs.length} to={crumb.link} style={styles.link}>{crumb.value}</Link>)
          renderedCrumbs.push(<IconChevronRight key={renderedCrumbs.length} style={styles.separator}/>)
        } else {
          renderedCrumbs.push(<div key={renderedCrumbs.length} style={{display: 'inline-block'}}>{crumb.value}</div>)
        }
      }
    } else {
      renderedCrumbs.push(<div key={renderedCrumbs.length} style={{height: 48, width: 48, padding: 12}}><IconHome /></div>)
    }

    return (
      <div className="breadcrumbs">
        {renderedCrumbs}
      </div>
    )
  }
}

