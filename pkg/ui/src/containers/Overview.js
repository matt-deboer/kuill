import React from 'react';
import {blueA200, blueA700, lightBlueA400, lightBlue900} from 'material-ui/styles/colors' 

import IconMemory from 'material-ui/svg-icons/hardware/memory'
import IconCPU from 'material-ui/svg-icons/content/select-all'
import IconNodes from 'material-ui/svg-icons/navigation/apps'
import IconPods from 'material-ui/svg-icons/image/grain'


import InfoBox from '../components/dashboard/InfoBox'
// import NewOrders from '../components/dashboard/NewOrders'
// import MonthlySales from '../components/dashboard/MonthlySales'
// import ResourceUsage from '../components/dashboard/ResourceUsage'
import RecentUpdates from '../components/dashboard/RecentUpdates'
import ResourceProblems from '../components/dashboard/ResourceProblems'
import { watchEvents } from '../state/actions/events'
import { requestResources as requestClusterResources } from '../state/actions/cluster'
import { requestResources as requestWorkloadsResources } from '../state/actions/workloads'
import { connect } from 'react-redux'

const mapStateToProps = function(store) {
  return {
    cores: store.cluster.cores,
    nodes: store.cluster.nodes,
    memory: store.cluster.memory,
    podCount: store.workloads.podCount,
    problemResources: store.workloads.problemResources,
    memoryUnits: store.cluster.memoryUnits,
    isFetching: store.cluster.isFetching,
    user: store.session.user,
    recentEvents: store.events.recentEvents,
    events: store.events.events,
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
  }

  render() {
    let { props } = this
    return (
      <div>
        <div className="row">

          <div className="col-xs-6 col-sm-6 col-md-3 col-lg-3 m-b-15 ">
            <InfoBox Icon={IconCPU}
                    color={blueA700}
                    title="cpu"
                    total={props.cores}
                    units="cores"
            />
          </div>


          <div className="col-xs-6 col-sm-6 col-md-3 col-lg-3 m-b-15 ">
            <InfoBox Icon={IconMemory}
                    color={blueA200}
                    title="mem"
                    total={props.memory}
                    units={props.memoryUnits}
            />
          </div>

          <div className="col-xs-6 col-sm-6 col-md-3 col-lg-3 m-b-15 ">
            <InfoBox Icon={IconPods}
                    color={lightBlueA400}
                    title="pods"
                    total={props.podCount}
            />
          </div>

          <div className="col-xs-6 col-sm-6 col-md-3 col-lg-3 m-b-15 ">
            <InfoBox Icon={IconNodes}
                    color={lightBlue900}
                    title="nodes"
                    total={props.nodes}
            />
          </div>
        </div>

        {/*<div className="row">
          <div className="col-xs-12 col-sm-6 col-md-6 col-lg-6 col-md m-b-15">
            <NewOrders data={Data.dashBoardPage.newOrders}/>
          </div>

          <div className="col-xs-12 col-sm-6 col-md-6 col-lg-6 m-b-15">
            <MonthlySales data={Data.dashBoardPage.monthlySales}/>
          </div>
        </div>*/}

        <div className="row">
          <div className="col-xs-12 col-sm-12 col-md-6 col-lg-6 m-b-15 ">
            <ResourceProblems problemResources={props.problemResources} events={props.events}/>
          </div>
          <div className="col-xs-12 col-sm-12 col-md-6 col-lg-6 m-b-15 ">
            <RecentUpdates recentEvents={props.recentEvents}/>
          </div>

          {/*<div className="col-xs-12 col-sm-12 col-md-6 col-lg-6 m-b-15 ">
            <ResourceUsage />
          </div>*/}
        </div>
      </div>
    )
  }
})
