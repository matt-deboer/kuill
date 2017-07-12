import React from 'react'
import { connect } from 'react-redux'
import { routerActions } from 'react-router-redux'
import { requestResource, editResource } from '../state/actions/workloads'
import { invalidateSession } from '../state/actions/session'
import { withRouter } from 'react-router-dom'
import ResourceInfoPage from '../components/ResourceInfoPage'
import ResourceNotFoundPage from '../components/ResourceNotFoundPage'
import EditorPage from '../components/EditorPage'
import LoadingSpinner from '../components/LoadingSpinner'
import LogFollower from '../utils/LogFollower'
import { sameResource } from '../resource-utils'
import { applyResourceChanges } from '../state/actions/workloads'

const mapStateToProps = function(store) {
  return { 
    resource: store.workloads.resource,
    resourceNotFound: store.workloads.resourceNotFound,
    isFetching: store.workloads.isFetching,
    user: store.session.user,
    editor: store.workloads.editor,
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
      dispatch(routerActions.goBack())
    },
    onEditorApply: function(contents) {
      let { namespace, kind, name } = ownProps.match.params
      dispatch(applyResourceChanges(namespace, kind, name, contents))
      // let { location } = ownProps
      // let newSearch = '?view=configuration'
      // dispatch(routerActions.push({
      //   pathname: location.pathname,
      //   search: newSearch,
      //   hash: location.hash,
      // }))
    },
    requestResource: function(namespace, kind, name) {
      dispatch(requestResource(namespace, kind, name))
    },
    invalidateSession: function() {
      dispatch(invalidateSession())
    },
  }
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps) (
class ResourceInfo extends React.Component {

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
    let { namespace, kind, name } = props.match.params
    if (!!props.user && !props.isFetching && 
        (!props.resource || (props.location.search === '?view=edit' && !props.editor.contents)
          || !sameResource(props.resource, {kind: kind, metadata: {namespace: namespace, name: name}})
        ) &&
        (!props.resourceNotFound)
        ) {
      
      let { params } = props.match
      if (props.location.search === '?view=edit') {
        props.editResource(params.namespace, params.kind,params.name)
      } else {
        props.requestResource(params.namespace, params.kind,params.name)
      }
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

  componentDidUpdate = () => {
    this.ensureResource(this.props)
    this.watchLogs()
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

    let { resource } = this.state
    let { logs, events } = this

    let resourceInfoPage = null
    let resourceNotFound = null
    if (!!this.state.resource) {
      resourceInfoPage = 
        <ResourceInfoPage
          resourceGroup={'workloads'}
          resource={this.state.resource}
          logs={logs}
          events={events}
          enableLogsTab={this.props.logPodContainers && this.props.logPodContainers.length > 0}
          enableTerminalTab={this.props.logPodContainers && this.props.logPodContainers.length > 0}
          onLogsActivated={this.onLogsActivated.bind(this)}
          activeTab={(this.props.location.search || 'configuration').replace('?view=','')}
          />
    } else if (this.props.resourceNotFound) {
      resourceNotFound = <ResourceNotFoundPage resourceGroup={'workloads'} {...this.props.match.params}/>
    }

    return (
      <div>  
        <EditorPage 
          open={!!this.state.resource && !!this.state.editor.contents && this.props.location.search === '?view=edit'}
          onEditorApply={this.props.onEditorApply}
          onEditorCancel={this.onEditorCancel}
          resource={this.state.resource}
          contents={this.state.editor.contents}
          title={!!resource &&
            <div>
              <span style={{ paddingRight: 10}}>Editing:</span>
              <span style={{fontWeight: 600}}>{`${resource.metadata.namespace} / ${resource.kind} / ${resource.metadata.name}`}</span>
            </div>
          }
          />

        {resourceInfoPage}
        {resourceNotFound}
        
        <LoadingSpinner loading={!this.state.resource && this.props.isFetching} />
      </div>
    )
  }
}))