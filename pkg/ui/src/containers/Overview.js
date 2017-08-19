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

import { watchEvents } from '../state/actions/events'
import { requestResources as requestClusterResources } from '../state/actions/cluster'
import { requestResources as requestWorkloadsResources } from '../state/actions/workloads'
import { calculateMetrics } from '../utils/summary-utils'
import { connect } from 'react-redux'
import './Overview.css'

const mapStateToProps = function(store) {
  return {
    // cores: store.cluster.cores,
    // nodes: store.cluster.nodes,
    // memory: store.cluster.memory,
    // podCount: store.workloads.podCount,
    // memoryUnits: store.cluster.memoryUnits,
    isFetching: store.cluster.isFetching,
    user: store.session.user,
    recentEvents: store.events.recentEvents,
    events: store.events.events,
    eventsRevision: store.events.revision,
    countsByNamespace: store.workloads.countsByNamespace,
    workloadsRevision: store.workloads.revision,
    clusterRevision: store.cluster.resourceRevision,
    clusterResources: store.cluster.resources,
    clusterMetrics: store.metrics.cluster,
    namespaceMetrics: store.metrics.namespace,
    selectedNamespaces: store.usersettings.selectedNamespaces,
    metricsRevision: store.metrics.revision,
  }
}

const mapDispatchToProps = function(dispatch, ownProps) {
  return {
    watchEvents: function() {
      dispatch(watchEvents())
    },
    requestClusterResources: function() {
      dispatch(requestClusterResources())
    },
    requestWorkloadsResources: function() {
      dispatch(requestWorkloadsResources())
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
    this.nodes = Object.entries(props.clusterResources).map(([k,v])=> v).filter(v => v.kind === 'Node')
  }

  fetch = () => {
    let { props } = this
    props.requestWorkloadsResources()
    props.watchEvents()
    props.requestClusterResources()
  }

  componentWillReceiveProps = (nextProps) => {
    if (!!nextProps.user && !this.props.user) {
      this.fetch()
    }
    this.nodes = Object.entries(this.props.clusterResources).map(([k,v])=> v).filter(v => v.kind === 'Node')
  }

  shouldComponentUpdate = (nextProps, nextState) => {
    return (this.props.workloadsRevision !== nextProps.workloadsRevision
      || this.props.clusterRevision !== nextProps.clusterRevision
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
        background: 'rgb(99,99,99)',
        padding: '15px 0.5rem',
        height: 'calc(100vh - 110px)',
        border: '1px solid rgba(0,0,0,0.1)',
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
        // background: 'rgb(66,66,66)',
        margin: 0,
        paddingTop: 15,
        paddingBottom: 0,
      },
      listBoxes: {
        paddingLeft: 16,
        paddingRight: 16,
      }
    }

    let { namespaceMetrics, clusterMetrics, selectedNamespaces, countsByNamespace } = this.props
    let stats = calculateMetrics(clusterMetrics, namespaceMetrics, selectedNamespaces, countsByNamespace)

    // nm.summary.netTx.usage += p.network.txBytes
    // nm.summary.netTx.duration += duration

    let { props } = this
    return (
      <Paper style={styles.wrapper} zDepth={1} className={'overview'}>

        <div style={styles.heatmap}>
          <NamespaceBarChart
            stats={stats}
            style={{paddingTop: 50}}
            clusterRevision={props.clusterRevision}/>
        </div>

        <div className="row" style={styles.summaryStatsBox}>

          <div className="col-xs-4 col-sm-4 col-md-4 col-lg-4 m-b-15" style={styles.col}>
            <div style={{marginBottom: 15}}>
              <InfoBox Icon={IconCPU}
                      color={blueA700}
                      title="cpu"
                      usage={stats.cpu.usage}
                      total={stats.cpu.total}
                      units={stats.cpu.units}
              />
            </div>
            <div>
              <InfoBox Icon={IconMemory}
                      color={blueA200}
                      title="mem"
                      usage={stats.memory.usage}
                      total={stats.memory.total}
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
