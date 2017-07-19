import React from 'react'
import { connect } from 'react-redux'
import { requestResources, setFilterNames } from '../state/actions/access'
import AccessControlsPage from '../components/AccessControlsPage'
import { withRouter } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'

const mapStateToProps = function(store) {
  return {
    resources: store.access.resources,
    filterNames: store.access.filterNames,
    possibleFilters: store.access.possibleFilters,
    isFetching: store.access.isFetching,
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
class AccessControls extends React.Component {

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
      <AccessControlsPage {...this.props} />
    </div>)
  }
}))

