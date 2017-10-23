import { defaultFetchParams } from './request-utils'
import { keyForResource } from './resource-utils'

export default class AccessEvaluator {
  
  constructor(props) {
    this.props = props
    this.getState = props.getState
    this.dispatch = props.dispatch
    this.forbiddenByKind = {}
    this.permissions = {}
  }

  initialize = () => {    
    this.swagger = this.swagger || this.getState().apimodels.swagger
    this.kubeKinds = this.kubeKinds || this.getState().apimodels.kinds
    this.permissionsByKind = this.permissionsByKind || this.getState().session.permissionsByKind
  }

  forbidden = (kind, verb, namespace='') => {
    let perms = this.forbiddenByKind[kind] = this.forbiddenByKind[kind] || {}
    let perm = perms[verb] = perms[verb] || {}
    let ns = namespace === '~' ? '' : namespace
    perm[ns] = 'forbidden'
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
        let replicas = (resource.status && (resource.status.readyReplicas || resource.status.replicas || resource.status.numberReady)) || -1

        return {
          get: permissions.get,
          edit: permissions.put,
          delete: permissions.delete,
          logs: permissions.logs && (replicas > 0 || resource.kind === 'Pod'),
          exec: permissions.exec && (replicas > 0 || resource.kind === 'Pod'),
          scale: permissions.put && replicas >= 0,
          suspend: permissions.put && replicas > 0,
        }
      })
  }

  getObjectPermissions = async (resource) => {
    this.initialize()
    let kubeKind = this.kubeKinds[resource.kind]
    let clusterPerms = this.permissions[`${resource.kind}`] = this.permissions[`${resource.kind}`] || {}
    let namespacePerms = {}
    if (resource.metadata && resource.metadata.namespace) {
      namespacePerms = this.permissions[`${resource.kind}/${resource.namespace}`] =
      this.permissions[`${resource.kind}/${resource.namespace}`] || {}
    }
    let key = keyForResource(resource)
    let objectPerms = this.permissions[key] = this.permissions[key] || {}
    let permissions = {...clusterPerms, ...namespacePerms, ...objectPerms}

    if ('get' in permissions && 
        'put' in permissions && 
        'delete' in permissions &&
        'logs' in permissions &&
        'exec' in permissions) {
      return permissions
    }

    let results = await resolveResourcePermissions(resource, permissions, kubeKind, this.kubeKinds)
    for (let result of results) {
      let allowed = result.status.allowed
      let attrs = result.spec.resourceAttributes
      if (allowed) {
        let action = (attrs.subresource || attrs.verb).replace('log', 'logs')
        if (!('namespace' in attrs)) {
          clusterPerms[action] = true
        } else if (!('name' in attrs)) {
          namespacePerms[action] = true
        } else {
          objectPerms[action] = true
        }
      }
    }

    permissions = {...clusterPerms, ...namespacePerms, ...objectPerms}
    if (!('get' in permissions)) {
      objectPerms.get = permissions.get = false
    }
    if (!('put' in permissions)) {
      objectPerms.put = permissions.put = false
    }
    if (!('delete' in permissions)) {
      objectPerms.delete = permissions.delete = false
    }
    if (!('logs' in permissions)) {
      objectPerms.logs = permissions.logs = false
    }
    if (!('exec' in permissions)) {
      objectPerms.exec = permissions.exec = false
    }
    return permissions
  }

  /**
   * Returns an array of namespaces in which the current user
   * is allowed to watch the provided kubeKind object.
   * 
   * If the user is allowed to watch this resource at the cluster
   * level, then ['*'] is returned.
   * 
   * If the user is not allowed to watch this resource in any
   * namespaces, or the resource simply doesn't support watching
   * at any level, then [] is returned.
   * 
   * @param {String} kind 
   */
  getWatchableNamespaces = (kind) => {
    this.initialize()
    let kubeKind = this.kubeKinds[kind]
    let permissions = this.permissionsByKind[kind]
    let swagger = this.swagger

    if (permissions && permissions.namespaced) {
      if (permissions.namespaces && 
          permissions.namespaces.length > 0 && 
          !!swagger && `/${kubeKind.base}/watch/namespaces/{namespace}/${kubeKind.plural}` in swagger.paths) {
        return permissions.namespaces
      }
    } else if (!!swagger && `/${kubeKind.base}/watch/${kubeKind.plural}` in swagger.paths) {
      return (permissions && permissions.disabled) ? [] : ['*']
    }
    return []
  }

  /**
   * Returns true if the kind is namespaced
   * 
   * @param {String} kind
   */
  isNamespaced = (kind) => {
    this.initialize()
    let kubeKind = this.kubeKinds[kind]
    return this.swagger && `/${kubeKind.base}/namespaces/{namespace}/${kubeKind.plural}` in this.swagger.paths
  }

  /**
   * Returns true if the resource can be listed at the specified namespace
   * use '' for namespace to list at the cluster level
   */
  canList = (kind, namespace) => {
    let perms = this.forbiddenByKind[kind]
    if (perms && 'list' in perms && namespace in perms.list) {
      let forbidden = perms.list[namespace]
      return !forbidden
    }
  }
}

async function resolveResourcePermissions(resource, permissions, kubeKind, kubeKinds) {
  let requests = []
  if (!('get' in permissions)) {
    requests.push(accessReview(kubeKind, 'get'))
    requests.push(accessReview(kubeKind, 'get', resource.metadata.namespace))
    requests.push(accessReview(kubeKind, 'get', resource.metadata.namespace, resource.metadata.name))
  }
  if (!('edit' in permissions)) {
    requests.push(accessReview(kubeKind, 'put'))
    requests.push(accessReview(kubeKind, 'put', resource.metadata.namespace))
    requests.push(accessReview(kubeKind, 'put', resource.metadata.namespace, resource.metadata.name))
  }
  if (!('delete' in permissions)) {
    requests.push(accessReview(kubeKind, 'delete'))
    requests.push(accessReview(kubeKind, 'delete', 
      resource.metadata.namespace))
    requests.push(accessReview(kubeKind, 'delete', 
      resource.metadata.namespace, resource.metadata.name))
  }
  if (!('logs' in permissions)) {
    requests.push(accessReview(kubeKinds.Pod, 'get', '', '', 'log'))
    requests.push(accessReview(kubeKinds.Pod, 'get', 
      resource.metadata.namespace, '', 'log'))
    requests.push(accessReview(kubeKinds.Pod, 'get', 
      resource.metadata.namespace, resource.metadata.name, 'log'))
  }
  if (!('exec' in permissions)) {
    requests.push(accessReview(kubeKinds.Pod, 'get', '', '', 'exec'))
    requests.push(accessReview(kubeKinds.Pod, 'get', 
      resource.metadata.namespace, '', 'exec'))
    requests.push(accessReview(kubeKinds.Pod, 'get', 
      resource.metadata.namespace, resource.metadata.name, 'exec'))
  }
  return Promise.all(requests)
}

async function accessReview(kubeKind, verb, namespace='', name='', subresource='') {
  
  let body = {
    kind: 'SelfSubjectAccessReview',
    apiVersion: 'authorization.k8s.io/v1',
    spec: {}
  }
  if (namespace === '~') {
    namespace = ''
  }
  let group = ''
  if (kubeKind.base.startsWith('apis/')) {
    group = kubeKind.base.split('/')[1]
  }
  body.spec.resourceAttributes = {
    group: group,
    namespace: namespace,
    name: name,
    resource: kubeKind.plural,
    subresource: subresource,
    verb: verb,
    version: '*',
  }

  let bodyString = JSON.stringify(body)
  let url = '/proxy/apis/authorization.k8s.io/v1/selfsubjectaccessreviews'
  return await fetch( url, {...defaultFetchParams, 
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: bodyString,
  }).then(resp => {
    if (!resp.ok) {
      return resp.text()
    } else {
      return resp.json()
    }
  })
  // if ('status' in result && 'allowed' in result.status) {
  //   return result.status.allowed
  // } else {
  //   console.error(`Unexpected response from selfsubjectaccessreviews: ${result}`)
  //   return false
  // }
}