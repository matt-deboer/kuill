import React from 'react'
import { connect } from 'react-redux'
import { requestResources, setFilterNames } from '../state/actions/resources'
import ClusterPage from '../components/cluster/ClusterPage'
import { withRouter } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'

const mapStateToProps = function(store) {
  return {
    resources: store.resources.resources,
    filterNames: store.resources.filterNames,
    possibleFilters: store.resources.possibleFilters,
    fetching: store.requests.fetching,
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
      <LoadingSpinner loading={this.props.fetching.kinds || this.props.fetching.resources} />
      <ClusterPage {...this.props} />
    </div>)
  }
}))

