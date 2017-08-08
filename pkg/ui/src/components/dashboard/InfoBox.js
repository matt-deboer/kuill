import React from 'react'
import { ResponsiveContainer, AreaChart, Area } from 'recharts'
import Paper from 'material-ui/Paper'
import { white, grey800 } from 'material-ui/styles/colors'
import typography from 'material-ui/styles/typography'
import './InfoBox.css'

export default class InfoBox extends React.PureComponent {

  render() {
    const {color, title, total, units, Icon} = this.props;

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
      },
      number: {
        display: 'block',
        fontWeight: typography.fontWeightMedium,
        fontSize: 18,
        color: grey800
      },
      total: {
        display: 'block',
        fontWeight: 600,
        fontSize: 30,
        lineHeight: '36px',
        height: 50,
        color: 'rgb(180,180,180)',
        width: '100%',
        right: 0,
        top: 0,
      },
      units: {
        fontSize: 16,
        lineHeight: '16px',
        color: 'rgb(150,150,150)',
        paddingTop: 40,
        paddingRight: 10,
        position: 'absolute',
        height: 60,
        textAlign: 'right',
        width: '100%',
        right: 0,
        top: 0,
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
        backgroundColor: color
      },
      icon: {
        height: 30,
        width: 30,
        marginTop: 25,
        maxWidth: '100%',
        fill: 'rgba(255,255,255,0.7)',
      }
    }
    
    const data = [
          {name: 'Page A', uv: 4000, pv: 2400, amt: 2400},
          {name: 'Page B', uv: 3000, pv: 1398, amt: 2210},
          {name: 'Page C', uv: 2000, pv: 9800, amt: 2290},
          {name: 'Page D', uv: 2780, pv: 3908, amt: 2000},
          {name: 'Page E', uv: 1890, pv: 4800, amt: 2181},
          {name: 'Page F', uv: 2390, pv: 3800, amt: 2500},
          {name: 'Page G', uv: 3490, pv: 4300, amt: 2100},
    ]


    //width={336} height={60}

    return (
      <Paper style={styles.wrapper} className={'infobox'}>

        <ResponsiveContainer style={{}}>
          <AreaChart data={data} margin={{top: 5, right: 0, left: 0, bottom: 5}}>
            <Area type='monotone' dataKey='uv' stroke='rgb(41, 98, 255)' fill='rgba(41, 98, 255, 0.3)' />
          </AreaChart>
        </ResponsiveContainer>
        
        
        <span style={styles.iconSpan}>
          <span style={styles.text}>{title}</span>
          <Icon color={white}
                style={styles.icon}
          />
        </span>

        <div style={styles.content}>
          <div style={styles.total}>{total}</div>
          <div style={styles.units}>{units}</div>
          {/*<span style={styles.negative}>-</span><span style={styles.total}>{allocated}</span>
          <hr/>
          <span style={styles.remains}>{total - allocated}</span>*/}
        </div>
      </Paper>
      );
  }
}

