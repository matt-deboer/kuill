import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { selectNamespaces } from '../../state/actions/usersettings'
import UtilizationPieChart from './UtilizationPieChart'
import DiscreteBarChart from './DiscreteBarChart'
import HelpText from '../../i18n/help-text'
import './NamespaceBarChart.css'

const mapStateToProps = function(store) {
  return {
    locale: store.session.locale,
    selectedNamespaces: store.usersettings.selectedNamespaces,
    clusterMetrics: store.metrics.cluster,
    namespaceMetrics: store.metrics.namespace,
    countsByNamespace: store.workloads.countsByNamespace,
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
    let { clusterMetrics, namespaceMetrics, stats, countsByNamespace } = props
    if (!clusterMetrics || !namespaceMetrics) {
      return null
    }

    let items = {}
    let max = {cpu: -100, memory: -100, volumes: -100}
    
    for (let ns in countsByNamespace) {
      if (ns in namespaceMetrics) {
        let metrics = namespaceMetrics[ns]
        for (let m of ['cpu','memory','volumes']) {
          let u = 100 * metrics[m].ratio
          max[m] = Math.max(u, max[m])
          items[m] = items[m] || []
          items[m].push({name: ns, value: u})
        }
      } else {
        for (let m of ['cpu','memory','volumes']) {
          items[m] = items[m] || []
          items[m].push({name: ns, value: 0})
        }
      }
    }

    if (items[this.state.selectBy]) {
      items[this.state.selectBy].sort((a,b)=> {
        let aSelected = (a.name in this.props.selectedNamespaces)
        let bSelected = (b.name in this.props.selectedNamespaces)
        if (aSelected && !bSelected) {
          return -1
        } else if (!aSelected && bSelected) {
          return 1
        } else {
          return a.name.localeCompare(b.name)
        }
      })
    }

    return (
      <div style={{...styles.wrapper, ...props.style}} className="row namespace-panel">
        <div className="title">Allocated Resource Usage</div>
        
        <div className={`col-xs-12 col-sm-5 col-md-6 col-lg-6 namespace-barchart by-${this.state.selectBy}`}>
          <HelpText style={{position: 'absolute', bottom: 0, left: 0}} 
            locale={'en'} 
            textId={`NamespaceBarChart.barchart`}
            orientation={'right'}/>
          <DiscreteBarChart 
            items={items[this.state.selectBy] || []}
            onSelection={this.handleSelectNamespaces}
            initialSelection={this.props.selectedNamespaces}
            max={max[this.state.selectBy]}
            />
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
          <div className="legend">
            <div className="title">{`relative ${this.state.selectBy} used by namespace`}</div>
            <HelpText style={{position: 'absolute', bottom: 0, right: 0}} 
              locale={'en'} 
              textId={`NamespaceBarChart.donuts`}
              orientation={'left'}/>

            {/* {usageQuantiles.map(q=><div key={q} className={'usage le-'+q} >{q}</div>)} */}
          </div> 
        </div>  
      </div>
    )
  }
})
