import React from 'react'
import { connect } from 'react-redux'
import { requestResources, selectResource, setFilterNames, maxReloadInterval } from '../state/actions/workloads'
import WorkloadsPage from '../components/WorkloadsPage'
import { withRouter } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'

const mapStateToProps = function(store) {
  return {
    resources: store.workloads.resources,
    filterNames: store.workloads.filterNames,
    possibleFilters: store.workloads.possibleFilters,
    isFetching: store.workloads.isFetching,
    user: store.session.user,
  };
}

const mapDispatchToProps = function(dispatch, ownProps) {
  return {
    requestResources: function() {
      dispatch(requestResources())
    },
    setFilterNames: function(filterNames) {
      dispatch(setFilterNames(filterNames))
    },
    clearResource: function() {
      dispatch(selectResource())
    },
  }
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps) (
class Workloads extends React.Component {

  componentDidUpdate = (prevProps, prevState) => {
    if (!!this.props.user && !prevProps.user) {
      this.props.requestResources()
    }
  }

  componentWillMount = () => {
    if (!!this.props.user) {
      this.props.requestResources()
    }
    this.reloadInterval = window.setInterval(this.props.requestResources.bind(this,true), maxReloadInterval + 100)
  }

  componentWillUnmount = () => {
    window.clearInterval(this.reloadInterval)
  }

  render() {
    return (<div>
      <LoadingSpinner loading={this.props.isFetching} />
      <WorkloadsPage {...this.props} />
    </div>)
  }
}))

