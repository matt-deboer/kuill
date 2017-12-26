import React from 'react'
import { connect } from 'react-redux'
import { routerActions } from 'react-router-redux'
import { applyResourceChanges, requestResource, editResource, removeResource, scaleResource } from '../state/actions/resources'
import { invalidateSession } from '../state/actions/session'
import { tryGoBack } from '../state/actions/location'
import { withRouter } from 'react-router-dom'
import ResourceInfoPage from '../components/ResourceInfoPage'
import ResourceNotFoundPage from '../components/ResourceNotFoundPage'
import LoadingSpinner from '../components/LoadingSpinner'
import LogFollower from '../utils/LogFollower'
import { sameResourceVersion, resourceMatchesParams } from '../utils/resource-utils'
import queryString from 'query-string'
import Loadable from 'react-loadable'
import LoadingComponentStub from '../components/LoadingComponentStub'

const AsyncEditorPage = Loadable({
  loader: () => import('../components/EditorPage'),
  loading: LoadingComponentStub
})

const defaultRelatedFilters = ['status:!disabled']

const mapStateToProps = function(store) {
  return { 
    resource: store.resources.resource,
    resources: store.resources.resources,
    fetching: store.requests.fetching,
    user: store.session.user,
    editor: store.resources.editor,
    logPodContainers: store.logs.podContainers,
    events: store.events.selectedEvents,
    resourceRevision: store.resources.resourceRevision,
    kinds: store.apimodels.kinds,
    linkGenerator: store.session.linkGenerator,
  }
}

const mapDispatchToProps = function(dispatch, ownProps) {
  return {
    cancelEditor: function() {
      dispatch(tryGoBack())
    },
    onEditorApply: function(contents) {
      let { namespace, kind, name } = ownProps.match.params
      dispatch(applyResourceChanges(namespace, kind, name, contents))
    },
    requestResource: function(namespace, kind, name) {
      dispatch(requestResource(namespace, kind, name))
    },
    invalidateSession: function() {
      dispatch(invalidateSession())
    },
    editResource: function(namespace, kind, name) {
      dispatch(editResource(namespace, kind, name))
      let { params } = ownProps.match
      dispatch(editResource(params.namespace, params.kind, params.name))
    },
    removeResource: function(resource, filterNames) {
      dispatch(removeResource(resource))
      
      let search = queryString.stringify({filters: filterNames})
      if (!!search) {
        search = '?'+search
      }
      dispatch(routerActions.push({
        pathname: `/workloads`,
        search: search,
      }))
    },
    scaleResource: function(resource, replicas) {
      dispatch(scaleResource(
        resource.metadata.namespace,
        resource.kind,
        resource.metadata.name,
        replicas))
    },
    viewKind: function(kind, namespace) {
      let ns = {}
      if (!!namespace) {
        ns[namespace] = true
      }
      let link = ownProps.linkGenerator.linkForKind(kind, ns)
      dispatch(routerActions.push(link))
    },
    viewFilters: function(filters) {
      let search = `?${queryString.stringify({filters: filters})}`
      dispatch(routerActions.push({
        pathname: `/workloads`,
        search: search,
      }))
    },
    selectView: function(tab) {
      if (tab === 'edit') {
        let { params } = ownProps.match
        dispatch(editResource(params.namespace, params.kind, params.name))
      }
      
      let { location } = ownProps
      let query = queryString.parse(location.search)
      if (query.view !== tab && tab === 'related') {
        query.filters = defaultRelatedFilters
      }
      query.view = tab
      
      let newSearch = queryString.stringify(query)

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
class WorkloadInfo extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      resource: props.resource,
      editor: props.editor,
      logPodContainers: props.logPodContainers,
      readyContainers: this.filterReadyContainers(props.logPodContainers, props.resources),
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
      for (let key of this.state.readyContainers) {
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
    
    if (!sameResourceVersion(this.state.resource,props.resource)
      || (props.editor.contents !== this.props.editor.contents)
      || (props.resource && this.state.resource && props.resource.metadata.resourceVersion )
    ) {
      this.setState({
        resource: props.resource,
        editor: props.editor,
      })
    }
    if (props.resourceRevision !== this.props.resourceRevision) {
      this.setState({
        readyContainers: this.filterReadyContainers(props.logPodContainers, props.resources),
      })
    }
    this.ensureResource(props)
    this.watchLogs()
  }

  componentDidUpdate = () => {
    this.watchLogs()
  }

  // TODO: consider removing this entirely...
  shouldComponentUpdate = (nextProps, nextState) => {
    let shouldUpdate = (this.props.resourceRevision !== nextProps.resourceRevision
        || !sameResourceVersion(this.state.resource,nextProps.resource)
        || this.props.user !== nextProps.user
        || this.state.editor.contents !== nextProps.editor.contents
        || this.props.location !== nextProps.location
        || this.props.events !== nextProps.events
        || this.props.logPodContainers !== nextProps.logPodContainers
        || this.props.resourceRevision !== nextProps.resourceRevision
        || this.state.readyContainers !== nextState.readyContainers
    )
    return shouldUpdate
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

  filterReadyContainers = (logPodContainers, resources) => {
    let readyContainers = []
    if (!!logPodContainers && !!this.props.resource) {
      for (let lpc of logPodContainers) {
        let [podName, containerName] = lpc.split('/')
        let pod = resources[`Pod/${this.props.resource.metadata.namespace}/${podName}`]
        let containerIndex = -1
        for (let i=0, len=pod.spec.containers.length; i < len; ++i) {
          if (pod.spec.containers[i].name === containerName) {
            containerIndex = i
            break
          }
        }
        if (pod.status.containerStatuses && containerIndex < pod.status.containerStatuses.length) {
          let containerStatus = pod.status.containerStatuses[containerIndex]
          if (containerStatus.ready) {
            readyContainers.push(lpc)
          }
        }
      }
    }
    return readyContainers
  }


  render() {

    let { logs, events, props } = this

    let fetching = Object.keys(props.fetching).length > 0
    let resourceInfoPage = null
    let resourceNotFound = null
    let query = queryString.parse(this.props.location.search)
    let activeTab = query.view || 'config'

    if (!!this.state.resource) {
      if (this.state.resource.notFound && !fetching) {
        resourceNotFound = <ResourceNotFoundPage resourceGroup={'workloads'} {...this.props.match.params}/>
      } else {
        resourceInfoPage = 
          <ResourceInfoPage
            removeResource={props.removeResource}
            editResource={props.editResource}
            scaleResource={props.scaleResource}
            viewKind={props.viewKind}
            viewFilters={props.viewFilters}
            selectView={props.selectView}
            resourceGroup={'workloads'}
            resource={this.state.resource}
            logs={logs}
            events={events}
            activeTab={activeTab}
            />
      }
    }

    return (
      <div>  
        <AsyncEditorPage 
          open={!!this.state.resource && !!this.state.editor.contents && this.props.location.search === '?view=edit'}
          resourceGroup={'workloads'}
          onEditorApply={this.props.onEditorApply}
          onEditorCancel={this.onEditorCancel}
          resource={this.state.resource}
          contents={this.state.editor.contents}
          />

        {resourceInfoPage}
        {resourceNotFound}
        
        <LoadingSpinner loading={!this.state.resource || (this.state.resource.notFound && fetching)} />
      </div>
    )
  }
}))