import React from 'react';
import {blueA200, blueA700, lightBlueA400, lightBlue900} from 'material-ui/styles/colors' 

import IconMemory from 'material-ui/svg-icons/hardware/memory'
import IconCPU from 'material-ui/svg-icons/content/select-all'

import IconStorage from 'material-ui/svg-icons/device/storage'
import IconNetwork from 'material-ui/svg-icons/action/settings-ethernet'

import Paper from 'material-ui/Paper'

import InfoBox from '../components/dashboard/InfoBox'
import RecentUpdates from '../components/dashboard/RecentUpdates'
import ResourceProblems from '../components/dashboard/ResourceProblems'
import ResourceCounts from '../components/dashboard/ResourceCounts'
import NamespaceBarChart from '../components/dashboard/NamespaceBarChart'

import { requestResources } from '../state/actions/resources'
import { requestMetrics } from '../state/actions/metrics'
import { calculateMetrics } from '../utils/summary-utils'
import { connect } from 'react-redux'
import './Overview.css'

const mapStateToProps = function(store) {
  return {
    user: store.session.user,
    recentEvents: store.events.recentEvents,
    events: store.events.events,
    eventsRevision: store.events.revision,
    countsByNamespace: store.resources.countsByNamespace,
    workloadsRevision: store.resources.revision,
    resourceRevision: store.resources.resourceRevision,
    resources: store.resources.resources,
    clusterMetrics: store.metrics.cluster,
    namespaceMetrics: store.metrics.namespace,
    selectedNamespaces: store.usersettings.selectedNamespaces,
    metricsRevision: store.metrics.revision,
    quotasByNamespace: store.resources.quotasByNamespace,
  }
}

const mapDispatchToProps = function(dispatch, ownProps) {
  return {
    requestResources: function() {
      dispatch(requestResources())
    },
    requestMetrics: function() {
      dispatch(requestMetrics())
    },
  }
}

export default connect(mapStateToProps, mapDispatchToProps) (
class Overview extends React.Component {

  constructor(props) {
    super(props)
    if (props.user) {
      this.fetch()
    }
    this.nodes = Object.entries(props.resources).map(([k,v])=> v).filter(v => v.kind === 'Node')
  }

  fetch = () => {
    let { props } = this
    props.requestMetrics()
    props.requestResources()
  }

  componentWillReceiveProps = (nextProps) => {
    if (!!nextProps.user && !this.props.user) {
      this.fetch()
    }
    this.nodes = Object.entries(this.props.resources).map(([k,v])=> v).filter(v => v.kind === 'Node')
  }

  shouldComponentUpdate = (nextProps, nextState) => {
    return (this.props.workloadsRevision !== nextProps.workloadsRevision
      || this.props.resourceRevision !== nextProps.resourceRevision
      || this.props.metricsRevision !== nextProps.metricsRevision
      || this.props.eventsRevision !== nextProps.eventsRevision
      || this.props.selectedNamespaces !== nextProps.selectedNamespaces
      || this.props.countsByNamespace !== nextProps.countsByNamespace
    )
  }

  render() {

    const styles = {
      col: {
        paddingRight: '0.5rem',
        paddingLeft: '0.5rem',
      },
      wrapper: {
        position: 'relative',
        background: 'rgb(125, 120, 120)',
        padding: '15px 0.5rem',
        height: 'calc(100vh - 110px)',
        border: '1px solid rgba(33,33,33,0.8)',
      },
      heatmap: {
        paddingTop: 20,
        paddingBottom: 20,
        paddingRight: '1rem',
        paddingLeft: '1rem',
        background: 'rgb(66,66,66)',
        margin: '-20px -0.5rem 0px',
        borderBottom: '1px solid rgb(0,0,0)',
        height: 185,
      },
      summaryStatsBox: {
        margin: 0,
        paddingTop: 15,
        paddingBottom: 0,
      },
      listBoxes: {
        paddingLeft: 16,
        paddingRight: 16,
      }
    }

    let { namespaceMetrics, clusterMetrics, selectedNamespaces, quotasByNamespace } = this.props
    let stats = calculateMetrics(clusterMetrics, namespaceMetrics, selectedNamespaces, quotasByNamespace)

    let { props } = this
    return (
      <Paper style={styles.wrapper} zDepth={1} className={'overview'}>

        <div style={styles.heatmap}>
          <NamespaceBarChart
            stats={stats}
            style={{paddingTop: 50}}
            resourceRevision={props.resourceRevision}/>
        </div>

        <div className="row" style={styles.summaryStatsBox}>

          <div className="col-xs-4 col-sm-4 col-md-4 col-lg-4 m-b-15" style={styles.col}>
            <div style={{marginBottom: 15}}>
              <InfoBox Icon={IconCPU}
                      color={blueA700}
                      title="cpu"
                      usage={stats.cpu.usage}
                      limitsUsage={stats.cpu.limitsUsage}
                      requestsUsage={stats.cpu.requestsUsage}
                      total={stats.cpu.total}
                      limitsTotal={stats.cpu.limitsTotal}
                      requestsTotal={stats.cpu.requestsTotal}
                      units={stats.cpu.units}
              />
            </div>
            <div>
              <InfoBox Icon={IconMemory}
                      color={blueA200}
                      title="mem"
                      usage={stats.memory.usage}
                      limitsUsage={stats.memory.limitsUsage}
                      requestsUsage={stats.memory.requestsUsage}
                      total={stats.memory.total}
                      limitsTotal={stats.memory.limitsTotal}
                      requestsTotal={stats.memory.requestsTotal}
                      units={stats.memory.units}
              />
            </div>
          </div>

          <div className="col-xs-4 col-sm-4 col-md-4 col-lg-4 m-b-15" style={styles.col}>
            <div style={{marginBottom: 15}}>
              <InfoBox Icon={IconStorage}
                      color={lightBlueA400}
                      title="disk"
                      usage={stats.disk.usage}
                      total={stats.disk.total}
                      units={stats.disk.units}
              />
            </div>
            <div>
              <InfoBox Icon={IconStorage}
                      color={lightBlueA400}
                      title="vols"
                      usage={stats.volumes.usage}
                      total={stats.volumes.total}
                      units={stats.volumes.units}
              />
            </div>
          </div>

          <div className="col-xs-4 col-sm-4 col-md-4 col-lg-4 m-b-15" style={styles.col}>
            <div style={{marginBottom: 15}}>
              <InfoBox Icon={IconNetwork}
                      color={lightBlue900}
                      title="net out"
                      total={stats.netTx.ratio}
                      units={stats.netTx.units}
              />
            </div>
            <div>
              <InfoBox Icon={IconNetwork}
                      color={lightBlue900}
                      title="net in"
                      total={stats.netRx.ratio}
                      units={stats.netRx.units}
              />
            </div>
          </div>
        </div>

        <div className="row" style={styles.listBoxes}>
          <div className="col-xs-12 col-sm-4 col-md-4 col-lg-4 m-b-15 list" style={styles.col}>
            <ResourceProblems />
          </div>
          <div className="col-xs-12 col-sm-4 col-md-4 col-lg-4 m-b-15 list" style={styles.col}>
            <ResourceCounts />
          </div>
          <div className="col-xs-12 col-sm-4 col-md-4 col-lg-4 m-b-15 list" style={styles.col}>
            <RecentUpdates />
          </div>
        </div>
      </Paper>
    )
  }
})
