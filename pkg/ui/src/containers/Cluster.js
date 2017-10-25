import React from 'react'
import { connect } from 'react-redux'
import { requestResources } from '../state/actions/resources'
import ClusterPage from '../components/cluster/ClusterPage'
import { withRouter } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'

const mapStateToProps = function(store) {
  return {
    resources: store.resources.resources,
    filterNames: store.resources.filterNames,
    fetching: store.requests.fetching,
    user: store.session.user,
  }
}

const mapDispatchToProps = function(dispatch, ownProps) {
  return {
    requestResources: function() {
      dispatch(requestResources())
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
      <LoadingSpinner loading={Object.keys(this.props.fetching).length > 0} />
      <ClusterPage {...this.props} />
    </div>)
  }
}))

