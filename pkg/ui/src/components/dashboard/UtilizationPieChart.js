import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { blueA400, grey600, blueA100, red900, white } from 'material-ui/styles/colors'
import IconButton from 'material-ui/IconButton'
import './UtilizationPieChart.css'

const styles = {
  legend: {
    paddingTop: 20,
  },
  pieChartDiv: {
    height: 100,
    textAlign: 'center',
    position: 'relative',
  }
}

export default class UtilizationPieChart extends React.PureComponent {

  render() {
    let { total, used, label } = this.props

    if (!total) {
      return null
    }

    return (
      <div {...this.props}>
          <ResponsiveContainer>
            <PieChart >
              <Pie
                innerRadius={35}
                outerRadius={42}
                data={[
                  {name: 'used', value: used},
                  {name: 'free', value: (total - used)},
                ]}
                fill="#8884d8"
                stroke="none">
                <Cell key={'used'} fill={blueA400}/>
                <Cell key={'free'} fill={grey600}/>
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="utilization">
            <div className="percentage">{ Math.round(100 * used / total)}</div>
            <div className="label">{label}</div>
          </div>
      </div>
    )
  }
}