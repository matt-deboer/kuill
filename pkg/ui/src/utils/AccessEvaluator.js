import { defaultFetchParams } from './request-utils'
import { keyForResource } from './resource-utils'
import { detachedOwnerRefsAnnotation, requestNamespaces } from '../state/actions/resources'
import { doRequest } from '../state/actions/requests'

const rulesReviewType = 'io.k8s.api.authorization.v1.SelfSubjectRulesReview'

const denyAll = {
  'get':false,
  'put':false,
  'delete':false,
  'logs':false,
  'exec':false,
  'watch':false,
}

const allowAll = {
  'get':true,
  'put':true,
  'delete':true,
  'logs':true,
  'exec':true,
  'watch':true,
}

export default class AccessEvaluator {
  
  constructor(props) {
    this.props = props
    this.getState = props.getState
    this.dispatch = props.dispatch
    this.permissions = {}
    this.initialize()
  }

  initialize = () => {
    this.swagger = this.swagger || this.getState().apimodels.swagger
    this.kubeKinds = this.kubeKinds || this.getState().apimodels.kinds
    let that = this
    if (this.getState().session.user && this.swagger && this.swagger.definitions) {
      if (!('useRulesReview' in this) && rulesReviewType in this.swagger.definitions) {
        doRequest(this.dispatch, this.getState, rulesReviewType + ':test', async () => {
          await rulesReview().then(resp => {
            if (resp.status === 403) {
              that.useRulesReview = false
            } else {
              that.getRules().then(rules => {
                that.rules = rules
                that.useRulesReview = true
              }).catch(error => {
                that.rules = null
                that.useRulesReview = false
              })
            }
          })
        })
      }
    }
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
          detach: permissions.put && resource.kind === 'Pod' 
            && resource.metadata.annotations 
            && !(detachedOwnerRefsAnnotation in resource.metadata.annotations),
          scale: permissions.put && replicas >= 0,
          suspend: permissions.put && replicas > 0,
        }
      })
  }

  getObjectPermissions = async (resource) => {
    this.initialize()

    if (this.useRulesReview) {
      return resolveNamespacePermissions(resource, this.rules, this.kubeKinds)
    }

    let kubeKind = this.kubeKinds[resource.kind]
    let clusterPerms = this.permissions[`${resource.kind}`] = this.permissions[`${resource.kind}`] || {}
    let namespacePerms = {}
    if (resource.metadata && resource.metadata.namespace) {
      namespacePerms = this.permissions[`${resource.kind}/${resource.metadata.namespace}`] =
      this.permissions[`${resource.kind}/${resource.metadata.namespace}`] || {}
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

  getRules = async () => {

    let requests = [rulesReview()]
    let namespaces = this.getState().resources.namespaces
    if (!namespaces) {
      await this.dispatchEvent(requestNamespaces())
      namespaces = this.getState().resources.namespaces
    }

    for (let ns of namespaces) {
      requests.push(rulesReview(ns))
    }

    let rules = {}
    let results = await Promise.all(requests)
    for (let result of results) {
      if (result.status === 403) {
        // we can't actually use this method, even though the version supports it :(
        return null
      } else if (result.spec) {
        let ns = (result.spec && result.spec.namespace) || ''
        let nsRules = rules[ns] = rules[ns] || {}
        if (result.status.resourceRules) {
          for (let rule of result.status.resourceRules) {
            for (let resource of rule.resources) {
              let resourceNames = rule.resourceNames || ['']
              for (let name of resourceNames) {
                let kindKey = resource + (name ? ':' + name : '')
                let kindRules = nsRules[kindKey] = nsRules[kindKey] || {}
                for (let verb of rule.verbs) {
                  kindRules[verb] = true
                }
              }
            }
          }
        }
      }
    }

    return rules
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
  getWatchableNamespaces = async (kind) => {
    this.initialize()

    let kubeKind = this.kubeKinds[kind]
    if (!kubeKind.verbs.includes('watch')) {
      return []
    }

    if (this.useRulesReview) {
      return resolveWatchableFromRules(kind, this.rules, this.kubeKinds)
    }
    
    let requests = []
    requests.push(accessReview(kubeKind, 'watch'))
    if (kubeKind.namespaced) {
      for (let ns of this.getState().resources.namespaces) {
        requests.push(accessReview(kubeKind, 'watch', ns))
      }
    }
    let results = await Promise.all(requests)
    let clusterLevel = false
    let watchableNamespaces = []
    for (let result of results) {
      let allowed = result.status.allowed
      let attrs = result.spec.resourceAttributes
      if (allowed) {
        if ('namespace' in attrs) {
          watchableNamespaces.push(attrs.namespace)
        } else {
          clusterLevel = true
          break
        }
      }
    }
    return clusterLevel ? ['*'] : watchableNamespaces
  }
}

function resolveWatchableFromRules(kind, rules, kubeKinds) {
  let watchable = {}
  let kubeKind = kubeKinds[kind]
  let clusterPerms = resolveNamespacePermissions({kind: kind, metadata: {namespace: '', name: ''}}, rules, kubeKinds)
  if (clusterPerms.watch) {
    return ['*']
  } else if (kubeKind.namespaced) {
    for (let ns in rules) {
      let nsPerms = resolveNamespacePermissions({kind: kind, metadata: {namespace: ns, name: ''}}, rules, kubeKinds)
      if (nsPerms.watch) {
        watchable[ns] = true
      }
    }
    return Object.keys(watchable)
  }
}


function resolveNamespacePermissions(resource, rules, kubeKinds) {
  let nsRules = rules[resource.metadata.namespace || '']
  if (nsRules) {
    return resolveKindPermissions(resource, nsRules, kubeKinds)
  } else {
    return denyAll
  }
}

function resolveKindPermissions(resource, rules, kubeKinds) {
  if (rules) {
    let allKindsPerms = resolveVerbs(rules['*'])
    let plural = kubeKinds[resource.kind].plural
    let kindPerms = resolveVerbs(rules[plural])
    let namePerms = resolveVerbs(rules[`${plural}:${resource.metadata.name}`])
    return {...allKindsPerms, ...kindPerms, ...namePerms}
  }
}

function resolveVerbs(verbs) {
  if (verbs) {
    if ('*' in verbs) {
      return allowAll
    } else {
      return verbs
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
  if (!('watch' in permissions)) {
    requests.push(accessReview(kubeKind, 'watch'))
    requests.push(accessReview(kubeKind, 'watch', resource.metadata.namespace))
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


async function rulesReview(namespace='') {
  
  let body = {
    kind: 'SelfSubjectRulesReview',
    apiVersion: 'authorization.k8s.io/v1',
    spec: {}
  }
  if (namespace === '~') {
    namespace = ''
  }
  body.spec = {
    namespace: namespace,
  }

  let bodyString = JSON.stringify(body)
  let url = '/proxy/apis/authorization.k8s.io/v1/selfsubjectrulesreviews'
  return await fetch( url, {...defaultFetchParams, 
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: bodyString,
  }).then(resp => {
    if (!resp.ok) {
      return resp
    } else {
      return resp.json()
    }
  }).then(json => {
    if (json && json.spec) {
      json.spec.namespace = namespace
    }
    return json
  })
}