import React from 'react'
import { connect } from 'react-redux'
import { requestResources, selectResource, setFilterNames } from '../state/actions/cluster'
import ClusterPage from '../components/ClusterPage'
import { withRouter } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'

const mapStateToProps = function(store) {
  return {
    resources: store.cluster.resources,
    filterNames: store.cluster.filterNames,
    possibleFilters: store.cluster.possibleFilters,
    isFetching: store.cluster.isFetching,
    user: store.session.user,
  }
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
class Cluster extends React.Component {

  componentDidUpdate = (prevProps, prevState) => {
    if (!!this.props.user && !prevProps.user) {
      this.props.requestResources()
    }
  }

  componentWillMount = () => {
    if (!!this.props.user) {
      this.props.requestResources()
    }
  }

  render() {
    return (<div>
      <LoadingSpinner loading={this.props.isFetching} />
      <ClusterPage {...this.props} />
    </div>)
  }
}))

