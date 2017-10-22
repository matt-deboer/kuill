import React from 'react'
import { connect } from 'react-redux'
import { requestResources, setFilterNames, maxReloadInterval } from '../state/actions/resources'
import WorkloadsPage from '../components/WorkloadsPage'
import { withRouter } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'

const mapStateToProps = function(store) {
  return {
    resources: store.resources.resources,
    filterNames: store.resources.filterNames,
    possibleFilters: store.resources.possibleFilters,
    fetching: store.requests.fetching,
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
      <LoadingSpinner loading={this.props.fetching.kinds || this.props.fetching.resources} />
      <WorkloadsPage {...this.props} />
    </div>)
  }
}))

