import { invalidateSession, updatePermissionsForKind } from './session'
import { requestSwagger, requestKinds } from './apimodels'
import { requestMetrics } from './metrics'
import { selectLogsFor } from './logs'
import { selectTerminalFor } from './terminal'
import { routerActions } from 'react-router-redux'
import queryString from 'query-string'
import { arraysEqual, objectEmpty } from '../../comparators'
import { keyForResource, isResourceOwnedBy, sameResource } from '../../utils/resource-utils'
import ResourceKindWatcher from '../../utils/ResourceKindWatcher'
import { watchEvents, selectEventsFor, reconcileEvents } from './events'
import { addError } from './errors'
import { defaultFetchParams, createPost, createPatch } from '../../utils/request-utils'
import { doRequest } from './requests'


export var types = {}
for (let type of [
  'RECEIVE_RESOURCES',
  'FILTER_ALL',
  'PUT_RESOURCE',
  'REMOVE_RESOURCE',
  'FILTER_RESOURCE',
  'ADD_FILTER',
  'REMOVE_FILTER',
  'SET_FILTER_NAMES',
  'EDIT_RESOURCE',
  'RECEIVE_RESOURCE_CONTENTS',
  'CLEAR_EDITOR',
  'SELECT_RESOURCE',
  'SET_WATCHES',
  'DISABLE_KIND',
  'PUT_NAMESPACES',
  'PUT_GLOBAL_FILTERS',
]) {
  types[type] = `resources.${type}`
}

export const maxReloadInterval = 5000
export const excludedKinds = {
  'APIService': true,
  'ComponentStatus': true,
  'ControllerRevision': true,
  'Event': true,
  'Endpoints': true,
}

export function receiveResources(resources) {
  return function(dispatch, getState) {
    let kubeKinds = getState().apimodels.kinds
    dispatch({
      type: types.RECEIVE_RESOURCES,
      resources: resources,
      kubeKinds: kubeKinds,
    })
  }
}

export function filterAll() {
  return {
    type: types.FILTER_ALL
  }
}

export function viewResource(resource, view='config') {

  return function(dispatch, getState) {
    let kubeKinds = getState().apimodels.kinds
    let ns, name, kind
    if (typeof resource === 'string') {
      [ kind, ns, name ] = resource.split('/')
    } else {
      ns = resource.namespace || (!!resource.metadata && resource.metadata.namespace) || "~"
      name = resource.name || resource.metadata.name
      kind = resource.kind
    }
    let kubeKind = kubeKinds[kind]
    let path = (kubeKind && kubeKind.resourceGroup ) || 'workloads'
    let query = view === '' ? '' : `?view=${view}`
    dispatch(routerActions.push(`/${path}/${ns}/${kind}/${name}${query}`))
  }
}

export function putResource(newResource, isNew) {
  return function(dispatch, getState) {
    let state = getState()
    let kubeKinds = state.apimodels.kinds
    let { maxResourceVersionByKind } = state.resources
    if (newResource.metadata.resourceVersion > maxResourceVersionByKind[newResource.kind] || 0) {
      // only allow events we've not yet seen to change resource state
      dispatch({
        type: types.PUT_RESOURCE,
        resource: newResource,
        isNew: isNew,
        kubeKinds: kubeKinds,
      })

      let { resource, resources } = getState().resources
      
      dispatch(reconcileEvents(resources))

      if (sameResource(newResource, resource)
      || isResourceOwnedBy(resources, newResource, resource)
      || isResourceOwnedBy(resources, resource, newResource)) {
        dispatch({
          type: types.SELECT_RESOURCE,
          namespace: resource.metadata.namespace,
          kind: resource.kind,
          name: resource.metadata.name,
        })
        let { pods } = getState().resources
        if (resource.statusSummary === 'disabled') {
          pods = {}
        }
        selectAllForResource(dispatch, resources, resource, pods)
      }
    }
  }
}

export function applyGlobalFilters(namespaces, kinds) {
  return function(dispatch, getState) {
    let kubeKinds = getState().apimodels.kinds
    dispatch({
      type: types.PUT_GLOBAL_FILTERS,
      namespaces: namespaces,
      kinds: kinds,
      kubeKinds: kubeKinds,
    })
  }
}

export function filterResource(resource) {
  return {
    type: types.FILTER_RESOURCE,
    resource: resource
  }
}

/**
 * Add a filter
 * @param {*} filter 
 */
export function addFilter(filter) {
  
  return function(dispatch, getState) {

    dispatch({
      type: types.ADD_FILTER,
      filter: filter,
    })
    return updateFilterUrl(dispatch, getState)
  }
}

/**
 * 
 * @param {*} filter 
 * @param {*} index 
 */
export function removeFilter(filter, index) {
  
  return function(dispatch, getState) {

    dispatch({
      type: types.REMOVE_FILTER,
      filter: filter,
      index: index,
    })
    return updateFilterUrl(dispatch, getState)
  }
}

/**
 * Update the filters query parameter to reflect the
 * currently selected set of filters.
 * 
 * @param {*} dispatch 
 * @param {*} getState 
 */
function updateFilterUrl(dispatch, getState) {
  let state = getState()
  let newFilterNames = state.resources.filterNames.slice(0)
  let path = state.routing.location.pathname
  let query = queryString.parse(state.routing.location.search)
  let currentFilterNames = query.filters
  if (currentFilterNames && currentFilterNames.constructor !== Array) {
    currentFilterNames = [currentFilterNames]
  } else {
    currentFilterNames && currentFilterNames.sort()
  }
  newFilterNames && newFilterNames.sort()
  
  if (!arraysEqual(newFilterNames, currentFilterNames)) {
    query.filters = newFilterNames
    let filterQuery = newFilterNames && newFilterNames.length > 0 ? 
      `?${queryString.stringify(query)}` :
      ''
    dispatch(routerActions.push(`${path}${filterQuery}`))
  }
}

/**
 * Reconcile the internal filters based on the provided array
 * of filterNames
 * 
 * @param {Array} filterNames 
 */
export function setFilterNames(filterNames, group) {
  return function(dispatch, getState) {
    if (!filterNames) {
      filterNames = []
    } else if (filterNames.constructor !== Array) {
      filterNames = [filterNames]
    }
    let state = getState()
    let currentFilterNames = state.resources.filterNames.slice(0)
    currentFilterNames.sort()
    let newFilterNames = filterNames.slice(0)
    newFilterNames.sort()

    if (currentFilterNames.length !== newFilterNames.length ||
        !currentFilterNames.every((element,i) => newFilterNames[i] === element)) {
      dispatch({
        type: types.SET_FILTER_NAMES,
        filterNames: filterNames,
      })
    }
    updateFilterUrl(dispatch, getState)
  }
}

/**
 * Scales a resource to the desired number of replicas
 * 
 * @param {String} namespace 
 * @param {String} kind 
 * @param {String} name 
 * @param {Object} contents 
 */
export function scaleResource(namespace, kind, name, replicas) {
  return async function (dispatch, getState) {
      
    await doRequest(dispatch, getState, 'resource.contents', async () => {
      await fetchResourceContents(dispatch, getState, namespace, kind, name)
    })

    let { contents } = getState().resources.editor 
    if (contents) {
      let resource = createPost(contents)
      let spec = resource.spec
      if (spec && ('replicas' in spec || 'readyReplicas' in spec)) {
        let prevReplicas = spec.replicas
        spec.replicas = (typeof replicas === 'string' ? parseInt(replicas, 10) : replicas)
        
        // Provide immediate feedback that the resource is scaling
        resource.statusSummary = 'scaling ' + (prevReplicas > spec.replicas ? 'down' : 'up')
        dispatch(putResource(resource, false))

        doRequest(dispatch, getState, 'resource.contents', async () => {
          await updateResourceContents(dispatch, getState, namespace, kind, name, resource)
        })
      }
    }
  }
}

/**
 * Called by editors to send updated resource contents
 * 
 * @param {String} namespace 
 * @param {String} kind 
 * @param {String} name 
 * @param {Object} contents 
 */
export function applyResourceChanges(namespace, kind, name, contents) {
  return async function (dispatch, getState) {
      let success = await doRequest(dispatch, getState, 'resources.contents', async () => {
        return await updateResourceContents(dispatch, getState, namespace, kind, name, contents)
      })
      // TODO: should we really be controlling routing here?
      if (success) {
        let link = getState().session.linkGenerator.linkForResource({
          name: name, namespace: namespace, kind: kind})
        dispatch(routerActions.push({
          pathname: link.split('?')[0],
          search: '?view=events',
          hash: '',
        }))
      }
  }
}

/**
 * 
 */
export function requestNamespaces() {
  return async function (dispatch, getState) {
    doRequest(dispatch, getState, 'namespaces', async () => {
      await fetchNamespaces(dispatch, getState)
    })
  }
}


async function fetchNamespaces(dispatch, getState) {
  
  let url = '/namespaces'
  let result = await fetch(url, defaultFetchParams
  ).then(resp => {
    if (!resp.ok) {
      if (resp.status === 401) {
        dispatch(invalidateSession())
      }
      return resp
    } else {
      return resp.json()
    }
  })

  if ('namespaces' in result) {
    dispatch({
      type: types.PUT_NAMESPACES,
      namespaces: result.namespaces,
    })
  } else {
    let msg = `result for ${url} returned error code ${result.code}: "${result.message}"`
    console.error(msg)
  }
}

/**
 * @param {Boolean} force
 * @param {Function} filter function(kubeKind) => boolean; returns true
 *  if the kubeKind should be fetched
 */
export function requestResources(force, filter) {
  return async function (dispatch, getState) {
    if (!getState().apimodels.swagger) {
      await requestSwagger()(dispatch, getState)
    } 

    doRequest(dispatch, getState, 'resources', async () => {
        await fetchResources(dispatch, getState, force, filter)
      })
  }
}

/**
 * 
 * @param {*} namespace 
 * @param {*} kind 
 * @param {*} name 
 */
export function requestResource(namespace, kind, name) {
  return async function (dispatch, getState) {
      doRequest(dispatch, getState, 'resources.selected', async () => {
        await fetchResource(dispatch, getState, namespace, kind, name)
      })
  }
}

/**
 * Creates a new resource with the provided contents
 */
export function createResource(contents) {
  return async function (dispatch, getState) {
      let resource = null
      await doRequest(dispatch, getState, 'resources.create', async () => {
        resource = await createResourceFromContents(dispatch, getState, contents)
      })
      // let workloads = getState().resources
      if (!!resource) {
        let link = getState().session.linkGenerator.linkForResource(resource)
        dispatch(routerActions.push({
          pathname: link.split('?')[0],
          search: '?view=events',
        }))
      }
  }
}

/**
 * Removes the specified resource
 */
export function removeResource(...resourcesToRemove) {
  return async function (dispatch, getState) {
      
      let { resources, resource } = getState().resources
      let updateSelected = false
      for (let toBeRemoved of resourcesToRemove) {
        if (isResourceOwnedBy(resources, toBeRemoved, resource)
        || isResourceOwnedBy(resources, resource, toBeRemoved)) {
          updateSelected = true
          break
        }
      }

      await doRequest(dispatch, getState, 'resources.delete', async () => {
        await removeResources(dispatch, getState, resourcesToRemove)
      })

      if (updateSelected) {
        dispatch({
          type: types.SELECT_RESOURCE,
          namespace: resource.metadata.namespace,
          kind: resource.kind,
          name: resource.metadata.name,
        })
        let { pods } = getState().resources
        selectAllForResource(dispatch, resources, resource, pods)
      }
  }
}

async function shouldFetchResources(dispatch, getState, force) {
  let state = getState()
  let { resources, lastLoaded } = state.resources
  let { user } = state.session
  let { kinds } = state.apimodels

  // TODO: should also check on resources last loaded time
  let shouldRefresh = (!!force && (Date.now() - lastLoaded) > maxReloadInterval)
  let noResources = (!resources || Object.keys(resources).length === 0)

  let shouldFetch = (!!user) && (noResources || shouldRefresh)    

  if (shouldFetch && !kinds) {
    await requestKinds()(dispatch, getState)
    kinds = getState().apimodels.kinds
  }

  return shouldFetch
}

async function fetchResources(dispatch, getState, force, filter) {
  
  let shouldFetch = await shouldFetchResources(dispatch, getState, force)
  if (shouldFetch) {
    let usersettings = getState().usersettings
    dispatch({
      type: types.PUT_GLOBAL_FILTERS,
      namespaces: usersettings.selectedNamespaces,
      kinds: usersettings.selectedKinds,
    })
    
    let kubeKinds = getState().apimodels.kinds
    let entryFilter = (typeof filter === 'function') ?
      function(entry) { return !(entry[0] in excludedKinds) && filter(entry[1]) } : 
      function(entry) { return !(entry[0] in excludedKinds) }

    let urls = Object.entries(kubeKinds).filter(entryFilter).map(entry => [entry[1], `/proxy/${entry[1].base}/${entry[1].plural}`])
    let requests = urls.map(([kubeKind,url],index) => fetch(url, defaultFetchParams
      ).then(resp => {
        if (!resp.ok) {
          if (resp.status === 401) {
            dispatch(invalidateSession())
          } else if (resp.status === 403) {
            if (kubeKind.namespaced) {
              dispatch(updatePermissionsForKind(kubeKind.name, {
                namespaced: true
              }))
              return fetchResourcesByNamespace(dispatch, getState, kubeKind)
            }
          } else if (resp.status !== 404) {
            dispatch(addError(resp,'error',`Failed to fetch ${url}: ${resp.statusText}`,
              'Try Again', () => { dispatch(requestResources()) } ))
          }
          return resp
        } else {
          return resp.json()
        }
      }
    ))

    let results = await Promise.all(requests)
    parseResults(dispatch, getState, results)
  }
}

async function fetchResourcesByNamespace(dispatch, getState, kubeKind) {
  let namespaces = getState().resources.namespaces
  if (!namespaces) {
    await dispatch(requestNamespaces())
    namespaces = getState().resources.namespaces
  }

  let urls = namespaces.map(ns => [kubeKind.name, `/proxy/${kubeKind.base}/namespaces/${ns}/${kubeKind.plural}`, ns])
  let requests = urls.map(([kind,url,ns],index) => fetch(url, defaultFetchParams
    ).then(resp => {
      if (!resp.ok) {
        if (resp.status === 401) {
          dispatch(invalidateSession())
        } else if (resp.status !== 403) {
          dispatch(addError(resp,'error',`Failed to fetch ${url}: ${resp.statusText}`,
            'Try Again', () => { dispatch(requestResources()) } ))
        }
        return resp
      } else {
        let allowedNamespaces = {}
        allowedNamespaces[ns] = true
        dispatch(updatePermissionsForKind(kind, {
          namespaces: allowedNamespaces,
        }))
        return resp.json()
      }
    }
  ))
  return Promise.all(requests)
}

function parseResults(dispatch, getState, results) {
  
  let resources = {}
  
  while (results.length) {
    let result = results.shift()
    if (result) {
      if (result.constructor === Array) {
        results.push(...result)
      } else {
        if ('items' in result) {
          let kind = result.kind.replace(/List$/,'')
          var items = result.items
          if (!!items) {
            for (var j=0, itemsLen = items.length; j < itemsLen; ++j) {
              var resource = items[j]
              resource.kind = kind
              resource.key = keyForResource(resource)
              resources[resource.key] = resource
            }
          }
        } else if ('status' in result && result.status !== 403) {
          let msg = `result for ${result.url} returned error code ${result.status}: "${result.message}"`
          console.error(msg)
        } else {
          console.error(`unexpected result type ${result}`)
        }
      }
    }
  }

  dispatch(receiveResources(resources))
  dispatch(reconcileEvents(resources))
  dispatch(watchEvents(resources))
  dispatch(requestMetrics(resources))
  watchResources(dispatch, getState)
}


function watchResources(dispatch, getState) {
  
  let accessEvaluator = getState().session.accessEvaluator
  let watches = getState().resources.watches || {}
  let maxResourceVersionByKind = getState().resources.maxResourceVersionByKind
  let kubeKinds = getState().apimodels.kinds
  var watchableNamespaces

  if (!objectEmpty(watches)) {
    // Update/reset any existing watches
    for (let kind in kubeKinds) {
      if (kind in excludedKinds) {
        continue
      }
      watchableNamespaces = accessEvaluator.getWatchableNamespaces(kind)
      if (watchableNamespaces.length > 0) {
        let watch = watches[kind]
        if (!!watch && watch.closed()) {
          watch.destroy()
          watches[kind] = new ResourceKindWatcher({
            kubeKinds: kubeKinds,
            kind: kind,
            dispatch: dispatch,
            resourceVersion: maxResourceVersionByKind[kind] || 0,
            resourceGroup: 'workloads',
            namespaces: watchableNamespaces,
          })
        }
      }
    }
  } else {
    for (let kind in kubeKinds) {
      if (kind in excludedKinds) {
        continue
      }
      watchableNamespaces = accessEvaluator.getWatchableNamespaces(kind)
      if (watchableNamespaces.length > 0) {
        watches[kind] = new ResourceKindWatcher({
          kubeKinds: kubeKinds,
          kind: kind, 
          dispatch: dispatch,
          resourceVersion: maxResourceVersionByKind[kind] || 0,
          resourceGroup: 'workloads',
          namespaces: watchableNamespaces,
        })
      }
    }
  }
  dispatch({
    type: types.SET_WATCHES,
    watches: watches,
  })
}


async function fetchResource(dispatch, getState, namespace, kind, name) {
  await fetchResources(dispatch, getState)
  
  let currentResource = getState().resources.resource
  if (!currentResource 
      || currentResource.metadata.namespace !== namespace
      || currentResource.kind !== kind
      || currentResource.metadata.name !== name) {
    
    dispatch({
      type: types.SELECT_RESOURCE,
      namespace: namespace,
      kind: kind,
      name: name,
    })
  
    // TODO: this sets defaults and options for terminal and logs viewer;
    // there is probably a better way to do this
    let { pods, resource, resources } = getState().resources
    
    if (!!resource) {
      selectAllForResource(dispatch, resources, resource, pods)
    }
  } else {
    console.log(`skipping ${types.SELECT_RESOURCE}`)
  }
}

function selectAllForResource(dispatch, resources, resource, pods) {
  if (!!pods) {
    let podContainers = []
    for (let name in pods) {
      
      let pod = pods[name]
      if (podContainers.length === 0) {
        dispatch(selectTerminalFor(`${name}/${pod.spec.containers[0].name}`))
      }
      if (!!pod.spec.initContainers) {
        podContainers.push(...pod.spec.initContainers.map(c=>`${name}/${c.name}`))
      }
      podContainers.push(...pod.spec.containers.map(c=>`${name}/${c.name}`))
    }
    dispatch(selectLogsFor(podContainers))
  }
  dispatch(selectEventsFor(resources, resource))
}

async function updateResourceContents(dispatch, getState, namespace, kind, name, contents) {
  
  let resource = getState().resources.resource
  let body = JSON.stringify(createPatch(resource, contents))
  let kubeKinds = getState().apimodels.kinds
  // mimic kubectl annotations so that changes applied in
  // the UI are compatible with those applied in the cli
  // @see https://github.com/kubernetes/community/blob/master/contributors/devel/strategic-merge-patch.md

  let api = kubeKinds[kind]
  let url = `/proxy/${api.base}/namespaces/${namespace}/${api.plural}/${name}`
  return await fetch(url, { ...defaultFetchParams,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/strategic-merge-patch+json'
    },
    method: 'PATCH',
    body: body,
  }).then(resp => {
    if (!resp.ok) {
      if (resp.status === 401) {
        dispatch(invalidateSession())
      } else if (resp.status < 500) {
        return resp.json()
      } else {
        dispatch(addError(resp,'error',`Failed to update contents for ${kind}/${namespace}/${name}: ${resp.statusText}`))
      }
    } else {
      return resp.json()
    }
  }).then(resource => {
    if (resource.code) {
      dispatch(addError(resource,'error',`Failed to update contents for ${kind}/${namespace}/${name}: ${resource.message}`))
    } else {
      dispatch({ type: types.SELECT_RESOURCE, namespace: namespace, kind: kind, name: name, })
      dispatch(receiveResource(resource, resource))
      return true
    }
  })
}

async function createResourceFromContents(dispatch, getState, contents) {
  let resource = createPost(contents)
  let { namespace } = resource.metadata
  let kubeKinds = getState().apimodels.kinds
  let api = kubeKinds[resource.kind]
  let url = `/proxy/${api.base}/namespaces/${namespace}/${api.plural}`
  let body = JSON.stringify(resource)

  return await fetch(url, { ...defaultFetchParams,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: body,
  }).then(resp => {
    if (!resp.ok) {
      if (resp.status === 401) {
        dispatch(invalidateSession())
      } else {
        dispatch(addError(null,'error',`Failed to create resource: ${resp.statusText}`))
      }
    } else {
      return resp.json()
    }
  }).then(json => {
    if (!!json) {
      if (json.code) {
        dispatch(addError(json,'error',`${json.code} ${json.reason}; ${json.message}`))
      } else {
        let resource = json
        resource.key = keyForResource(resource)
        dispatch(putResource(resource, true))
        return getState().resources.resources[resource.key]
      }
    }
  })
}

async function removeResources(dispatch, getState, resources) {
  
  let knownResources = getState().resources.resources
  let kubeKinds = getState().apimodels.kinds
  let resourcesToRemove = []
  for (let r of resources) {
    if (r.key in knownResources) {
      resourcesToRemove.push(r)
    }
  }

  let urls = resourcesToRemove.map(resource => {
    let { namespace, name } = resource.metadata
    let api = kubeKinds[resource.kind]
    return `/proxy/${api.base}/namespaces/${namespace}/${api.plural}/${name}`
  })
  
  let requests = urls.map((url,index) => fetch(url, {...defaultFetchParams, method: 'DELETE'}
    ).then(resp => {
        if (!resp.ok) {
          if (resp.status === 401) {
            dispatch(invalidateSession())
          } else {
            dispatch(addError(resp,'error',`Failed to remove ${resourcesToRemove[index].key}: ${resp.statusText}`,
              'Try Again', () => { dispatch(requestResources()) } ))
          }
          return resp
        } else {
          return resp.json()
        }
      }
  ))

  let results = await Promise.all(requests)
  for (let i=0, len=results.length; i < len; ++i) {
    let result = results[i]
    if (result.code && result.code !== 404) {
      dispatch(addError(result,'error',`${result.code} ${result.reason}; ${result.message}`))
    } else {
      dispatch({
        type: types.REMOVE_RESOURCE,
        resource: resourcesToRemove[i]
      })
    }
  }
}

export function receiveResource(resource, contents, error) {
  return {
    type: types.RECEIVE_RESOURCE_CONTENTS,
    resource: resource,
    contents: contents,
    error: error,
  }
}

export function clearEditor() {
  
  return {
    type: types.RECEIVE_RESOURCE_CONTENTS,
  }
}

export function editResource(namespace, kind, name) {
  return async function (dispatch, getState) {
      doRequest(dispatch, getState, 'resources.current', async () => {
        await fetchResourceContents(dispatch, getState, namespace, kind, name)
      })
  }
}

async function fetchResourceContents(dispatch, getState, namespace, kind, name) {

  let kubeKinds = getState().apimodels.kinds
  if (!kubeKinds) {
    await dispatch(requestKinds())
    kubeKinds = getState().apimodels.kinds
  }

  let api = kubeKinds && kubeKinds[kind]
  if (!!api) {
    await fetchResource(dispatch, getState, namespace, kind, name)
    let resource = getState().resources.resource
    await fetch(`/proxy/${api.base}/namespaces/${namespace}/${api.plural}/${name}`, 
        defaultFetchParams
      ).then(resp => {
        if (!resp.ok) {
          if (resp.status === 401) {
            dispatch(invalidateSession())
          } else {
            dispatch(addError(resp,'error',`Failed to load contents for ${kind}/${namespace}/${name}: ${resp.statusText}`))
          }
          // dispatch(receiveResource(resource, null, resp.statusText))
        } else {
          return resp.json()
        }
      }).then(contents => {
        dispatch(receiveResource(resource, contents))
      })
  }
}