import React from 'react'
import Paper from 'material-ui/Paper'
import { white, grey800 } from 'material-ui/styles/colors'
import typography from 'material-ui/styles/typography'
import './InfoBox.css'

export default class InfoBox extends React.PureComponent {

  render() {
    let {color, title, total, units, Icon} = this.props

    let hasUsage = false
    let hasLimit = false
    let utilization = 0
    let usage = 0
    let limit = 0
    let limitPercent = 0
    if ('usage' in this.props && total > 0) {
      hasUsage = true
      usage = this.props.usage
      utilization = Math.round(100 * this.props.usage / total)
    }
    if ('limit' in this.props && total > 0) {
      hasLimit = true
      limit = this.props.limit
      limitPercent = 50
      utilization = Math.round(50 * this.props.usage / limit)
    }

    if (total > 0 && total < 1) {
      if (total < 0.1) {
        total = total.toFixed(2)
      } else {
        total = total.toFixed(1)
      }
    } else if (total > 99) {
      total = Math.round(total)
    } else {
      total = total.toFixed(1)
    }

    if (usage > 0 && usage < 1) {
      if (usage < 0.1) {
        usage = usage.toFixed(2)
      } else {
        usage = usage.toFixed(1)
      }
    } else if (usage > 99) {
      usage = Math.round(usage)
    } else {
      usage = usage.toFixed(1)
    }

    const styles = {
      wrapper: {
        backgroundColor: 'rgb(77,77,77)',
        border: '1px solid rgba(0,0,0,0.5)',
        height: 60,
        position: 'relative',
      },
      content: {
        padding: '5px 10px',
        height: 50,
        fontSize: 50,
        textAlign: 'right',
        color: 'rgb(180,180,180)',
        position: 'absolute',
        top: 0,
        right: 0,
        width: '100%',
        pointerEvents: 'none',
      },
      number: {
        display: 'block',
        fontWeight: typography.fontWeightMedium,
        fontSize: 18,
        color: grey800
      },
      total: {
        position: 'absolute',
        paddingRight: 10,
        paddingTop: 5,
        fontWeight: 600,
        fontSize: 30,
        lineHeight: '36px',
        height: 50,
        color: 'rgb(180,180,180)',
        width: '100%',
        right: 0,
        top: 0,
        zIndex: 3,
        pointerEvents: 'none',
      },
      units: {
        fontSize: 16,
        lineHeight: '16px',
        color: 'rgb(150,150,150)',
        paddingTop: 38,
        paddingRight: 10,
        position: 'absolute',
        height: 60,
        textAlign: 'right',
        width: '100%',
        right: 0,
        top: 0,
        zIndex: 11,
        pointerEvents: 'none',
      },
      remains: {
        display: 'block',
        fontWeight: typography.fontWeightMedium,
        fontSize: 18,
        color: grey800
      },
      text: {
        fontSize: 16,
        top: 5,
        left: 0,
        color: 'rgba(255,255,255,0.7)',
        position: 'absolute',
        textAlign: 'center',
        width: '100%',
      },
      iconSpan: {
        position: 'absolute',
        top: 0,
        float: 'left',
        height: 58,
        width: 58,
        textAlign: 'center',
        backgroundColor: color,
        zIndex: 10,
      },
      icon: {
        height: 30,
        width: 30,
        marginTop: 25,
        maxWidth: '100%',
        fill: 'rgba(255,255,255,0.7)',
      }
    }

    return (
      <Paper style={styles.wrapper} className={'infobox'}>        
        <span style={styles.iconSpan}>
          <span style={styles.text}>{title}</span>
          <Icon color={white} style={styles.icon} />
        </span>

        <div style={styles.content}>
          { hasUsage &&
          <div className="usage-container">
            <div className="usage current" style={{width: `calc(${utilization}%)`}}/>
            {/* <div className="usage average" style={{width: `calc(12%)`}}/> */}
            <div className="usage limit" style={{width: `calc(${limitPercent}%)`}}/>
            <div className="usage-border" data-rh={`This is the tooltip`} data-rh-cls={'infobox'}/>
          </div>
          }
          <div style={styles.total}>{total}</div>
          <div style={styles.units}>{units}</div>
        </div>
      </Paper>
      );
  }
}

