import { defaultFetchParams } from './request-utils'
import { detachedOwnerRefsAnnotation } from '../state/actions/resources'
import queryString from 'query-string'

export default class AccessEvaluator {
  
  constructor(props) {
    this.props = props
    this.getState = props.getState
    this.dispatch = props.dispatch
    this.permissions = {}
    this.initialize()
  }

  initialize = async () => {
    this.swagger = this.swagger || this.getState().apimodels.swagger
    this.kubeKinds = this.kubeKinds || this.getState().apimodels.kinds
  }

  /**
   * Returns an object where keys are the supported UI actions,
   * and values are 'true' when the action is permitted.
   * 
   * @param {object} resource
   */
  getObjectAccess = async (resource) => {
    return this.getObjectPermissions(resource)
      .then(permissions => {
        // TODO: what about StatefulSet and DaemonSet?
        let replicas = (resource.status && (
          resource.status.readyReplicas || 
          resource.status.replicas || 
          resource.status.numberReady ||
          (typeof resource.status.active === 'number' && resource.status.active) ||
          (resource.status.active && resource.status.active.length)
        )) || -1

        return {
          get: !!permissions.get,
          edit: !!permissions.put,
          delete: !!permissions.delete,
          logs: this.canViewLogs(permissions, resource, replicas),
          terminal: this.canViewTerminal(permissions, resource, replicas),
          detach: this.canDetach(permissions, resource),
          scale: !!permissions.put && replicas >= 0,
          suspend: this.canSuspend(permissions, resource, replicas),
        }
      })
  }

  canViewLogs = (permissions, resource, replicas) => {
    return !!permissions.logs && (
      replicas > 0 || 
      resource.kind === 'Pod' ||
      (resource.status && (
        resource.status.completionTime || 
        resource.status.lastScheduleTime)
      )
    )
  }

  canViewTerminal = (permissions, resource, replicas) => {
    return !!permissions.exec && (
      replicas > 0 || 
      (resource.kind === 'Pod' && resource.statusSummary !== 'complete')
    )
  }

  canDetach = (permissions, resource) => {
    return !!permissions.put && 
      resource.kind === 'Pod' && 
      resource.metadata.annotations && 
      (!!resource.metadata.annotations && !(detachedOwnerRefsAnnotation in resource.metadata.annotations))
  }

  canSuspend = (permissions, resource, replicas) => {
    return !!permissions.put && (
      replicas > 0 || 
      (resource.spec && 'suspend' in resource.spec && !resource.spec.suspend)
    )
  }

  getObjectPermissions = async (resource) => {
    await this.initialize()

    let clusterPerms = this.permissions[`${resource.kind}`] = this.permissions[`${resource.kind}`] || {}
    let namespacePerms = {}
    if (resource.metadata && resource.metadata.namespace) {
      namespacePerms = this.permissions[`${resource.kind}/${resource.metadata.namespace}`] =
      this.permissions[`${resource.kind}/${resource.metadata.namespace}`] || {}
    }
    let key = resource.key
    let objectPerms = this.permissions[key] = this.permissions[key] || {}
    let permissions = {...clusterPerms, ...namespacePerms, ...objectPerms}

    if ('get' in permissions && 
        'put' in permissions && 
        'delete' in permissions &&
        'logs' in permissions &&
        'exec' in permissions) {
      return permissions
    }
    
    setTimeout(()=>{
      accessReview(resource.kind).then(perms=>{
        clusterPerms = Object.assign(clusterPerms, perms)
      })
    },250)

    setTimeout(()=>{
      accessReview(resource.kind, resource.metadata.namespace).then(perms=>{
        namespacePerms = Object.assign(namespacePerms, perms)
      })
    },250)

    return accessReview(resource.kind, resource.metadata.namespace, resource.metadata.name)
      .then(perms=>{
        objectPerms = Object.assign(objectPerms, perms)
        return perms
      })
  }
}

async function accessReview(kind, namespace='', name='') {
  
  let params = {
    kind: kind, 
    namespace: (namespace && namespace.replace(/~/, "")) || "",
    name: name,
  }
  let url = '/proxy/_/accessreview?' + queryString.stringify(params)
  return fetch(url, defaultFetchParams)
    .then(resp => {
      if (!resp.ok) {
        return {}
      } else {
        return resp.json()
      }
    })
}
