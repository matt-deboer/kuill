import React from 'react'
import Paper from 'material-ui/Paper'
import { white, grey600, grey800 } from 'material-ui/styles/colors'
import typography from 'material-ui/styles/typography'
import { fixPrecision, fixUnits, convertUnits } from '../../converters'
import './InfoBox.css'

export default class InfoBox extends React.PureComponent {

  render() {
    let {color, title, total, units, Icon} = this.props    
    let data = {}
    
    if ('usage' in this.props && total > 0) {
      data.usage = this.props.usage
      data.utilization = Math.round(100 * this.props.usage / total)
      data.total = total
    }
    
    if ('limitsUsage' in this.props && this.props.limitsTotal > 0) {
      data.limitsUsage = this.props.limitsUsage
      data.limitsTotal = this.props.limitsTotal
      data.limitsUtilization = Math.round(100 * data.limitsUsage / data.limitsTotal)
      if (!('utilization' in data)) {
        data.usage = data.limitsUsage
        data.total = data.limitsTotal
        data.utilization = data.limitsUtilization
      }
    }

    if ('requestsUsage' in this.props && this.props.requestsTotal > 0) {
      data.requestsUsage = this.props.requestsUsage
      data.requestsTotal = this.props.requestsTotal
      data.requestsUtilization = Math.round(100 * data.requestsUsage / data.requestsTotal)
      if (!('utilization' in data)) {
        data.usage = data.requestsUsage
        data.total = data.requestsTotal
        data.utilization = data.requestsUtilization
      }
    }

    let [ , newUnits] = fixUnits(data.total, units)
    if (newUnits !== units) {
      // data.total = newTotal
      for (let v in data) {
        data[v] = convertUnits(data[v], units, newUnits)
      }
      units = newUnits
    }
    data.total = fixPrecision(data.total)
    data.usage = fixPrecision(data.usage)

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
      },
      tooltipTitle: {
        backgroundColor: grey600,
        left: 0,
        right: 0,
        marginLeft: -8,
        marginRight: -8,
        marginTop: -2,
        padding: '5px 20px',
        borderBottom: '1px solid rgba(33,33,33,1)',
      }
    }

    return (
      <Paper style={styles.wrapper} className={'infobox'}>        
        <span style={styles.iconSpan}>
          <span style={styles.text}>{title}</span>
          <Icon color={white} style={styles.icon} />
        </span>

        <div style={styles.content}>
          { 'utilization' in data &&
          <div className="usage-container">
            <div className="usage current" style={{width: `calc(${data.utilization}%)`}}/>
            {'requestsTotal' in data &&
              <div className="usage requests" style={{width: `calc(${Math.round(100 * data.requestsTotal / data.total)}%)`}}/>
            }
            {'limitsTotal' in data &&
              <div className="usage limits" style={{width: `calc(${Math.round(100 * data.limitsTotal / data.total)}%)`}}/>
            }
            <div className="usage-border" data-rh={`#infobox-tooltip-${title}`} data-rh-cls={'infobox'}/>
          </div>
          }
          <div style={styles.total}>{data.total}</div>
          <div style={styles.units}>{units}</div>
        </div>

        <div id={`infobox-tooltip-${title}`} className={'infobox-tooltip'}>
          <div className={'tooltip-contents'}>
            <h3>{title}</h3>
            <table>
              <thead>
                <tr>
                  <th>{units}</th>
                  <th>used</th>
                  <th>total</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {'requestsTotal' in data &&
                  <tr>
                    <td style={{fontWeight: 600}}>requests</td>
                    <td>{data.requestsUsage}</td>
                    <td>{data.requestsTotal}</td>
                    <td>{ fixPrecision(100 * data.requestsUsage / data.requestsTotal) }%</td>
                  </tr>
                }
                {'limitsTotal' in data &&
                  <tr>
                    <td style={{fontWeight: 600}}>limits</td>
                    <td>{data.limitsUsage}</td>
                    <td>{data.limitsTotal}</td>
                    <td>{ fixPrecision(100 * data.limitsUsage / data.limitsTotal) }%</td>
                  </tr>
                }
                <tr>
                  <td style={{fontWeight: 600}}>actual</td>
                  <td>{data.usage}</td>
                  <td>{data.total}</td>
                  <td>{ fixPrecision(100 * data.usage / data.total) }%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Paper>
      );
  }
}

