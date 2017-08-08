import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { selectNamespaces } from '../../state/actions/usersettings'
import UtilizationPieChart from './UtilizationPieChart'
import DiscreteBarChart from './DiscreteBarChart'
import './NamespaceBarChart.css'

const mapStateToProps = function(store) {
  return {
    selectedNamespaces: store.usersettings.selectedNamespaces,
    clusterMetrics: store.metrics.cluster,
    namespaceMetrics: store.metrics.namespace,
  }
}

const mapDispatchToProps = function(dispatch, ownProps) {
  return {
    selectNamespaces: function(selectedNamespaces) {
      dispatch(selectNamespaces(selectedNamespaces))
    },
  } 
}

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

// const usageQuantiles = [20, 40, 60, 80, 100]

export default connect(mapStateToProps, mapDispatchToProps) (
class NamespaceBarChart extends React.PureComponent {

  static propTypes = {
    clusterMetrics: PropTypes.object,
    namespaceMetrics: PropTypes.object,
  }

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

  handleSelectNamespaces = (selectedNamespaces) => {
    this.props.selectNamespaces(selectedNamespaces)
  }

  render() {

    let { props } = this
    let { clusterMetrics, namespaceMetrics, stats } = props
    if (!clusterMetrics || !namespaceMetrics) {
      return null
    }

    let items = {}
    let max = {cpu: -100, memory: -100, volumes: -100}
    for (let ns in namespaceMetrics) {
      let metrics = namespaceMetrics[ns]
      for (let m of ['cpu','memory','volumes']) {
        let u = 100 * metrics[m].ratio
        max[m] = Math.max(u, max[m])
        items[m] = items[m] || []
        items[m].push({name: ns, value: u})
      }
    }

    return (
      <div style={{...styles.wrapper, ...props.style}} className="row">
        <div className={`col-xs-12 col-sm-5 col-md-6 col-lg-6 namespace-barchart by-${this.state.selectBy}`}>
          <DiscreteBarChart 
            items={items[this.state.selectBy] || []}
            onSelection={this.handleSelectNamespaces}
            initialSelection={this.props.selectedNamespaces}
            max={max[this.state.selectBy]}
            />
          <div className="legend">
            <div className="title">{`relative ${this.state.selectBy} used by namespace`}</div>
            {/* {usageQuantiles.map(q=><div key={q} className={'usage le-'+q} >{q}</div>)} */}
          </div> 
        </div>

        <div className={`col-xs-12 col-sm-7 col-md-6 col-lg-6 namespace-utilization by-${this.state.selectBy}`}>
          <div className="row" style={styles.chartBox}>
            <UtilizationPieChart 
              total={stats.cpu.total} 
              used={stats.cpu.usage} 
              label={'cpu utilization'}
              style={styles.utilizationChart} 
              className="col-xs-4 col-sm-4 col-md-4 col-lg-4"
              data-select-by={'cpu'}
              onTouchTap={this.handleSelect}
              percent={true}
              />
            
            <UtilizationPieChart 
              total={stats.memory.total} 
              used={stats.memory.usage} 
              label={'memory utilization'}
              style={styles.utilizationChart} 
              className="col-xs-4 col-sm-4 col-md-4 col-lg-4"
              data-select-by={'memory'}
              onTouchTap={this.handleSelect}
              percent={true}
              />
            
            <UtilizationPieChart 
              total={stats.volumes.total} 
              used={stats.volumes.usage} 
              label={'volume utilization'}
              style={styles.utilizationChart} 
              className="col-xs-4 col-sm-4 col-md-4 col-lg-4"
              data-select-by={'volumes'}
              onTouchTap={this.handleSelect}
              percent={true}
              />

            {/* <UtilizationPieChart 
              total={utilization.memory.total} 
              used={(utilization.memory.usage)} 
              label={'net inbound'}
              style={styles.utilizationChart} 
              className="col-xs-4 col-sm-4 col-md-4 col-lg-4"
              data-select-by={'netRx'}
              onTouchTap={this.handleSelect}
              />

            <UtilizationPieChart 
              total={utilization.memory.total} 
              used={(utilization.memory.usage)} 
              label={'net outbound'}
              style={styles.utilizationChart} 
              className="col-xs-4 col-sm-4 col-md-4 col-lg-4"
              data-select-by={'netTx'}
              onTouchTap={this.handleSelect}
              /> */}

          </div>
          <div className="selector">
          </div>
        </div>  
      </div>
    )
  }
})
