import Kinds from '../kube-kinds'
import { defaultFetchParams } from './request-utils'

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
   * @param {string} resourceGroup
   */
  getObjectAccess = async (resource, resourceGroup) => {
    return this.getObjectPermissions(resource, resourceGroup)
      .then(permissions => {
        // TODO: what about StatefulSet and DaemonSet?
        let replicas = (resource.status && (resource.status.readyReplicas || resource.status.replicas)) || -1

        return {
          edit: permissions.put,
          delete: permissions.delete,
          logs: permissions.logs && replicas > 0,
          exec: permissions.exec && replicas > 0,
          scale: permissions.put && replicas >= 0,
          suspend: permissions.put && replicas > 0,
        }
      })
  }

  getObjectPermissions = async (resource, resourceGroup) => {
    
    let kubeKind = Kinds[resourceGroup][resource.kind]
    let clusterPerms = this.permissions[`${resource.kind}`] = this.permissions[`${resource.kind}`] || {}
    let namespacePerms = this.permissions[`${resource.kind}/${resource.metadata.namespace}`] = 
        this.permissions[`${resource.kind}/${resource.metadata.namespace}`] || {}
    let objectPerms = this.permissions[`${resource.kind}/${resource.metadata.namespace}/${resource.metadata.name}`] =
        this.permissions[`${resource.kind}/${resource.metadata.namespace}/${resource.metadata.name}`] || {}
    let permissions = {...clusterPerms, ...namespacePerms, ...objectPerms}

    if ('put' in permissions && 
        'delete' in permissions &&
        'logs' in permissions &&
        'exec' in permissions) {
      return permissions
    }

    let results = await resolveResourcePermissions(resource, permissions, kubeKind)
    for (let result of results) {
      let allowed = result.status.allowed
      let attrs = result.spec.resourceAttributes
      if (allowed) {
        let action = attrs.subresource || attrs.verb
        if (!('namespace' in attrs)) {
          clusterPerms[action] = true
        } else if (!('name' in attrs)) {
          namespacePerms[action] = true
        } else {
          objectPerms[action] = true
        }
      }
    }

    return {...clusterPerms, ...namespacePerms, ...objectPerms}
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
   * @param {*} kind 
   * @param {*} resourceGroup 
   */
  getWatchableNamespaces = (kind, resourceGroup) => {
    this.initialize()
    let kubeKind = Kinds[resourceGroup][kind]
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
   * Returns true if the item is namespaced
   * @param {*} swagger 
   * @param {*} kubeKind 
   */
  isNamespaced = (kind, resourceGroup) => {
    this.initialize()
    let kubeKind = Kinds[resourceGroup][kind]
    return this.swagger && `/${kubeKind.base}/namespaces/{namespace}/${kubeKind.plural}` in this.swagger.paths
  }

  /**
   * Returns true if the resource can be listed at the specified namespace
   * use '' for namespace to list at the cluster level
   */
  canList = (kind, resourceGroup, namespace) => {
    let perms = this.forbiddenByKind[kind]
    if (perms && 'list' in perms && namespace in perms.list) {
      let forbidden = perms.list[namespace]
      return !forbidden
    }
  }
}

async function resolveResourcePermissions(resource, permissions, kubeKind) {
  let requests = []
  if (!('edit' in permissions)) {
    requests.push(accessReview(kubeKind.plural, 'put'))
    requests.push(accessReview(kubeKind.plural, 'put', resource.metadata.namespace))
    requests.push(accessReview(kubeKind.plural, 'put', resource.metadata.namespace, resource.metadata.name))
  }
  if (!('delete' in permissions)) {
    requests.push(accessReview(kubeKind.plural, 'delete'))
    requests.push(accessReview(kubeKind.plural, 'delete', 
      resource.metadata.namespace))
    requests.push(accessReview(kubeKind.plural, 'delete', 
      resource.metadata.namespace, resource.metadata.name))
  }
  if (!('logs' in permissions)) {
    requests.push(accessReview('pods', 'get', '', '', 'logs'))
    requests.push(accessReview(kubeKind.plural, 'get', 
      resource.metadata.namespace, '', 'logs'))
    requests.push(accessReview(kubeKind.plural, 'get', 
      resource.metadata.namespace, resource.metadata.name, 'logs'))
  }
  if (!('exec' in permissions)) {
    requests.push(accessReview('pods', 'get', '', '', 'exec'))
    requests.push(accessReview('pods', 'get', 
      resource.metadata.namespace, '', 'exec'))
    requests.push(accessReview('pods', 'get', 
      resource.metadata.namespace, resource.metadata.name, 'exec'))
  }
  return Promise.all(requests)
}

async function accessReview(path, verb, namespace='', name='', subresource='') {
  
  let body = {
    kind: 'SelfSubjectAccessReview',
    apiVersion: 'authorization.k8s.io/v1',
    spec: {}
  }
  if (namespace === '~') {
    namespace = ''
  }
  body.spec.resourceAttributes = {
    group: '*',
    namespace: namespace,
    name: name,
    resource: path,
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