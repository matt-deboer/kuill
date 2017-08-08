import React from 'react'
// import { GridGenerator, HexGrid, Layout, Path, Hexagon, Text, Pattern, Hex } from 'react-hexgrid'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { blueA400, grey200, blueA100, red900, white } from 'material-ui/styles/colors'
import { zoneLabel } from '../../utils/filter-utils'
import UtilizationPieChart from './UtilizationPieChart'
import HexagonChart from './HexagonChart'
import d3 from 'd3'
import ReactFauxDOM from 'react-faux-dom'
import './NodeHeatmap.css'

const styles = {
  legend: {
    paddingTop: 20,
  },
  wrapper: {
    padding: 15,
    backgroundColor: 'rgb(66,66,66)',
    marginTop: -15,
  },
  utilizationChart: {
    position: 'relative',
    textAlign: 'center',
    height: 100,
    cursor: 'pointer',
  },
  chartBox: {
    width: 360,
    padding: 5,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
}

const usageQuantiles = [20, 40, 60, 80, 100]

export default class NodeHeatmap extends React.PureComponent {

  constructor(props) {
    super(props)
    this.state = {
      selectBy: 'cpu'
    }
    this.handleSelect = this.handleSelect.bind(this)
  }

  handleSelect = (event) => {
    
    event.preventDefault();

    this.setState({
      selectBy: event.currentTarget.dataset.selectBy,
    })
  }

  render() {

    let { nodes, nodeMetrics } = this.props
    
    let utilization = {
      cpu: {
        usage: 0,
        total: 0,
      },
      memory: {
        usage: 0,
        total: 0,
      },
      disk: {
        usage: 0,
        total: 0,
      }
    }

    let items = []
    if (nodeMetrics) {
      for (let n of nodes) {
        let zone = ''
        if (n.metadata.labels && zoneLabel in n.metadata.labels) {
          zone = n.metadata.labels[zoneLabel]
        }
        let item = {group: zone, classes: []}
        if (!n.isFiltered) {
          let metricsForNode = nodeMetrics[n.metadata.name]
          if (!metricsForNode) {
            item.classes.push('error')
          } else {
            for (let m in utilization) {
              if (m in metricsForNode) {
                if ('usage' in metricsForNode[m] && 'total' in metricsForNode[m]) {
                  let u = Math.round(100 * metricsForNode[m].usage / metricsForNode[m].total)
                  for (let q of usageQuantiles) {
                    if (u <= q) {
                      item.classes.push(m + '-le-' + q)
                      break
                    }
                  }
                  utilization[m].usage += metricsForNode[m].usage
                  utilization[m].total += metricsForNode[m].total
                }
              }
            }
          }
        } else {
          item.classes.push('filtered')
        }
        item.label = zone.substr(-2)
        items.push(item)
      }
    }

    return (
      <div style={styles.wrapper} className="row">
        <div className={`col-xs-12 col-sm-5 col-md-6 col-lg-6 node-heatmap by-${this.state.selectBy}`}>
           <HexagonChart items={items}/>
          <div className="legend">
            <div className="title">{`% ${this.state.selectBy} used by node`}</div>
            {usageQuantiles.map(q=><div key={q} className={'usage le-'+q} >{q}</div>)}
          </div> 
        </div>

        <div className={`col-xs-12 col-sm-7 col-md-6 col-lg-6 node-utilization by-${this.state.selectBy}`}>
          <div className="row" style={styles.chartBox}>
            <UtilizationPieChart total={utilization.cpu.total} used={(utilization.cpu.usage)} label={'cpu utilization'}
              style={styles.utilizationChart} className="col-xs-4 col-sm-4 col-md-4 col-lg-4"
              data-select-by={'cpu'}
              onTouchTap={this.handleSelect}
              percent={true}
              />
            <UtilizationPieChart total={utilization.memory.total} used={(utilization.memory.usage)} label={'memory utilization'}
              style={styles.utilizationChart} className="col-xs-4 col-sm-4 col-md-4 col-lg-4"
              data-select-by={'memory'}
              onTouchTap={this.handleSelect}
              percent={true}
              />
            <UtilizationPieChart total={utilization.disk.total} used={(utilization.disk.usage)} label={'disk utilization'}
              style={styles.utilizationChart} className="col-xs-4 col-sm-4 col-md-4 col-lg-4"
              data-select-by={'disk'}
              onTouchTap={this.handleSelect}
              percent={true}
              />
          </div>
          <div className="selector">
          </div>
        </div>  
      </div>
    )
  }
}
