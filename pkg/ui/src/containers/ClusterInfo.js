import React from 'react'
import { connect } from 'react-redux'
import { routerActions } from 'react-router-redux'
import { editResource, removeResource, requestResource, applyResourceChanges } from '../state/actions/resources'
import { invalidateSession } from '../state/actions/session'
import { tryGoBack } from '../state/actions/location'
import { withRouter } from 'react-router-dom'
import ResourceInfoPage from '../components/ResourceInfoPage'
import LoadingSpinner from '../components/LoadingSpinner'
import LogFollower from '../utils/LogFollower'
import ResourceNotFoundPage from '../components/ResourceNotFoundPage'
import { sameResource, resourceMatchesParams } from '../utils/resource-utils'
import Loadable from 'react-loadable'
import LoadingComponentStub from '../components/LoadingComponentStub'

const AsyncEditorPage = Loadable({
  loader: () => import('../components/EditorPage'),
  loading: LoadingComponentStub
})


const mapStateToProps = function(store) {
  return { 
    resource: store.resources.resource,
    fetching: store.requests.fetching,
    user: store.session.user,
    editor: store.resources.editor,
    logPodContainers: store.logs.podContainers,
    events: store.events.selectedEvents,
  }
}

const mapDispatchToProps = function(dispatch, ownProps) {
  return {
    editResource: function(namespace, kind, name) {
      dispatch(editResource(namespace, kind, name))
    },
    cancelEditor: function() {
      dispatch(tryGoBack())
    },
    onEditorApply: function(contents) {
      let { namespace, kind, name } = ownProps.match.params
      dispatch(applyResourceChanges(namespace, kind, name, contents))
      let { location } = ownProps
      let newSearch = '?view=config'
      dispatch(routerActions.push({
        pathname: location.pathname,
        search: newSearch,
        hash: location.hash,
      }))
    },
    removeResource: function(resource) {
      dispatch(removeResource(resource))
      dispatch(tryGoBack())
    },
    requestResource: function(namespace, kind, name) {
      dispatch(requestResource(namespace, kind, name))
    },
    invalidateSession: function() {
      dispatch(invalidateSession())
    },
    selectView: function(tab) {
      if (tab === 'edit') {
        let { params } = ownProps.match
        dispatch(editResource(params.namespace, params.kind, params.name))
      }
      
      let { location } = ownProps
      let newSearch = `?view=${tab}`
      dispatch(routerActions.push({
        pathname: location.pathname,
        search: newSearch,
        hash: location.hash,
      }))
    },
    dispatch: dispatch,
  }
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps) (
class ClusterInfo extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      resource: props.resource,
      editor: props.editor,
      logPodContainers: props.logPodContainers,
    }
    this.logFollowers = {}
    this.events = []
    this.logs = new LogFollower.Buffer()

    this.ensureResource(props)
    this.watchLogs()
  }

  watchLogs = () => {
    let { props } = this
    if (!!this.state.resource && !!props.logPodContainers) {
      let oldFollowers = this.logFollowers
      this.logFollowers = {}
      for (let key of props.logPodContainers) {
        let lf = oldFollowers[key]
        let [pod, cnt] = key.split('/')
        if (lf) {
          this.logFollowers[key] = lf
          delete oldFollowers[key]
        } else {
          // Add new follower
          this.logFollowers[key] = new LogFollower({
            logs: this.logs,
            namespace: this.state.resource.metadata.namespace,
            pod: pod,
            container: cnt,
            dispatch: props.dispatch,
          })
        }
      }
      
      for (let key in oldFollowers) {
        // clean up no-longer-selected followers
        let lf = oldFollowers[key]
        lf && lf.destroy()
      }
    } 
  }

  ensureResource = (props) => {
    let editing = (props.location.search === '?view=edit')
    let { params } = props.match
    if (editing && !props.editor.contents) {
      props.editResource(params.namespace, params.kind, params.name)
    } else if (!!props.user && !resourceMatchesParams(props.resource, params)) {
      props.requestResource(params.namespace, params.kind, params.name)
    }
  }

  componentWillReceiveProps = (props) => {
    
    if (!sameResource(props.resource, this.state.resource) || (props.editor.contents !== this.props.editor.contents)) {
      this.setState({
        resource: props.resource,
        editor: props.editor,
      })
    }
  }

  shouldComponentUpdate = (nextProps, nextState) => {
    return !sameResource(this.state.resource, nextProps.resource)
        || this.props.isFetching !== nextProps.isFetching
        || this.props.user !== nextProps.user
        || this.state.editor.contents !== nextProps.editor.contents
        || this.props.location !== nextProps.location
        || this.props.events !== nextProps.events
  }

  componentDidMount = () => {
    this.ensureResource(this.props)
    this.watchLogs()
  }

  componentDidUpdate = () => {
    // this.ensureResource(this.props)
    // this.watchLogs()
  }

  componentWillUnmount = () => {
    for (let key in this.logFollowers) {
      let logFollower = this.logFollowers[key]
      logFollower && logFollower.destroy()
    }
    this.eventFollower && this.eventFollower.destroy()
  }

  onEditorOpen = () => {
    this.props.editResource(
      this.state.resource.metadata.namespace,
      this.state.resource.kind,
      this.state.resource.metadata.name
      )
  }

  onEditorCancel = () => {
    this.props.cancelEditor()
  }

  onLogsActivated = () => {
    // this.watchLogs()
  }

  render() {

    let { logs, events, props } = this
    
    let fetching = Object.keys(props.fetching).length > 0
    let resourceInfoPage = null
    let resourceNotFound = null

    if (!!this.state.resource && !fetching) {
      if (this.state.resource.notFound) {
        resourceNotFound = <ResourceNotFoundPage resourceGroup={'workloads'} {...props.match.params}/>
      } else {
        resourceInfoPage = 
          
          <ResourceInfoPage
            removeResource={props.removeResource}
            editResource={props.editResource}
            viewKind={props.viewKind}
            viewFilters={props.viewFilters}
            selectView={props.selectView}
            resourceGroup={'cluster'}
            resource={this.state.resource}
            logs={logs}
            events={events}
            onLogsActivated={this.onLogsActivated.bind(this)}
            activeTab={(props.location.search || 'config').replace('?view=','')}
            />
      }
    }

    return (<div>
      
      <AsyncEditorPage 
        open={!!this.state.resource && !!this.state.editor.contents && props.location.search === '?view=edit'}
        onEditorApply={props.onEditorApply}
        onEditorCancel={this.onEditorCancel}
        resource={this.state.resource}
        resourceGroup={'cluster'}
        contents={this.state.editor.contents}
        />

        
      {resourceInfoPage}
      {resourceNotFound}

      <LoadingSpinner loading={fetching} />
    </div>)
  }
}))