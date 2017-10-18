import { invalidateSession, updatePermissionsForKind } from './session'
import { selectLogsFor } from './logs'
import { selectTerminalFor } from './terminal'
import { requestMetrics } from './metrics'
import { requestSwagger } from './apimodels'
import { routerActions } from 'react-router-redux'
import KubeKinds from '../../kube-kinds'
import queryString from 'query-string'
import { arraysEqual, objectEmpty } from '../../comparators'
import { keyForResource, isResourceOwnedBy, sameResource } from '../../utils/resource-utils'
import ResourceKindWatcher from '../../utils/ResourceKindWatcher'
import { watchEvents, selectEventsFor, reconcileEvents } from './events'
import { defaultFetchParams } from '../../utils/request-utils'
import { addError } from './errors'
import { doRequest } from './requests'
import yaml from 'js-yaml'

export var types = {}
for (let type of [
  'REPLACE_ALL',
  'FILTER_ALL',
  'PUT_RESOURCE',
  'REMOVE_RESOURCE',
  'FILTER_RESOURCE',
  'ADD_FILTER',
  'REMOVE_FILTER',
  'SET_FILTER_NAMES',
  'EDIT_RESOURCE',
  'START_FETCHING',
  'DONE_FETCHING',
  'RECEIVE_RESOURCE_CONTENTS',
  'PUT_NAMESPACES',
  'CLEAR_EDITOR',
  'SELECT_RESOURCE',
  'SET_WATCHES',
]) {
  types[type] = `cluster.${type}`
}

export const defaultFilterNames = 'namespace:default'


export function replaceAll(resources) {
  return {
    type: types.REPLACE_ALL,
    resources: resources,
  }
}

export function filterAll() {
  return {
    type: types.FILTER_ALL
  }
}

export function putResource(newResource) {
  return function(dispatch, getState) {
    
    let { maxResourceVersionByKind } = getState().cluster
    if (newResource.metadata.resourceVersion > maxResourceVersionByKind[newResource.kind] || 0) {
      dispatch({
        type: types.PUT_RESOURCE,
        resource: newResource,
      })

      let { resource, resources } = getState().cluster
      if (sameResource(newResource, resource)
      || isResourceOwnedBy(resources, newResource, resource)
      || isResourceOwnedBy(resources, resource, newResource)) {
        dispatch(selectEventsFor(resources, resource))
      }
    }
  }
}

export function removeResource(resource) {
  return {
    type: types.REMOVE_RESOURCE,
    resource: resource
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
 * 
 */
export function requestNamespaces() {
  return async function (dispatch, getState) {
    doRequest(dispatch, getState, 'fetchNamespaces', async () => {
      await fetchNamespaces(dispatch, getState)
    })
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
  let newFilterNames = state.cluster.filterNames.slice(0)
  let currentFilterNames = queryString.parse(state.routing.location.search).filters
  if (currentFilterNames && currentFilterNames.constructor !== Array) {
    currentFilterNames = [currentFilterNames]
  } else {
    currentFilterNames && currentFilterNames.sort()
  }
  newFilterNames && newFilterNames.sort()
  
  if (!arraysEqual(newFilterNames, currentFilterNames)) {
    let filterQuery = ('?view=nodes') + (newFilterNames && newFilterNames.length > 0 ? 
      `&${queryString.stringify({filters: state.cluster.filterNames})}` :
      '')
    console.log(`updateFilterUrl: pushed new location...`)
    dispatch(routerActions.push(`/cluster${filterQuery}`))
  }
}

/**
 * Reconsile the internal filters based on the provided array
 * of filterNames
 * 
 * @param {Array} filterNames 
 */
export function setFilterNames(filterNames) {
  return function(dispatch, getState) {
    if (!filterNames) {
      filterNames = []
    } else if (filterNames.constructor !== Array) {
      filterNames = [filterNames]
    }
    let state = getState()
    let currentFilterNames = state.cluster.filterNames.slice(0)
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
 * Called by editors to send updated resource contents
 * 
 * @param {String} namespace 
 * @param {String} kind 
 * @param {String} name 
 * @param {Object} contents 
 */
export function applyResourceChanges(namespace, kind, name, contents) {
  return async function (dispatch, getState) {
      doRequest(dispatch, getState, 'updateResourceContents', async () => {
        await updateResourceContents(dispatch, getState, namespace, kind, name, contents)
      })
  }
}

/**
 * 
 */
export function requestResources() {
  return async function (dispatch, getState) {
    if (!getState().apimodels.swagger) {
      await requestSwagger()(dispatch, getState)
    }

    doRequest(dispatch, getState, 'fetchResources', async () => {
      await fetchResources(dispatch, getState)
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
      doRequest(dispatch, getState, 'fetchResource', async () => {
        await fetchResource(dispatch, getState, namespace, kind, name)
      })
  }
}

function shouldFetchResources(getState) {
  let state = getState()
  let { isFetching, resources } = state.cluster
  let { user } = state.session

  // TODO: should also check on resources last loaded time
  let shouldFetch = (!resources || Object.keys(resources).length === 0)
  
  if (!shouldFetch) {
    console.log(`skipping resource fetch: user: ${user}, isFetching: ${isFetching}, hasResources?: ${resources && Object.keys(resources).length}`)
  }

  return shouldFetch
}


async function fetchResources(dispatch, getState) {
  
  if (shouldFetchResources(getState)) {
    let urls = Object.entries(KubeKinds.cluster).map(([kind, api]) => 
      [kind, `/proxy/${api.base}/${api.plural}`, api])
    let requests = urls.map(([kind, url, kubeKind]) => fetch(url, defaultFetchParams
      ).then(resp => {
          if (!resp.ok) {
            if (resp.status === 401) {
              dispatch(invalidateSession())
            } else if (resp.status === 403) {
              let accessEvaluator = getState().session.accessEvaluator
              
              dispatch(updatePermissionsForKind(kind, {
                namespaced: true
              }))

              if (accessEvaluator.isNamespaced(kind, 'cluster')) {
                fetchResourcesByNamespace(dispatch, getState, kind)
              }
            }
            return resp
          } else {
            return resp.json()
          }
        }
    ))

    let results = await Promise.all(requests)

    parseResults(dispatch, getState, results, urls)
  }
}

async function fetchResourcesByNamespace(dispatch, getState, kind) {
  let namespaces = getState().cluster.namespaces
  let kubeKind = KubeKinds.cluster[kind]
  let urls = namespaces.map(ns => [kind, `/proxy/${kubeKind.base}/namespaces/${ns}/${kubeKind.plural}`])
  let requests = urls.map(([kind,url,],index) => fetch(url, defaultFetchParams
    ).then(resp => {
      if (!resp.ok) {
        if (resp.status === 401) {
          dispatch(invalidateSession())
        } else if (resp.status !== 403) {
          dispatch(updatePermissionsForKind(kind, {
            disabled: true
          }))
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
  
  parseResults(dispatch, getState, results, urls)
}

function parseResults(dispatch, getState, results, urls) {
  
  let resources = {}

  for (var i=0, len=results.length; i < len; ++i) {
    var result = results[i]

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
    } else if (result.code !== 403) {
      let url = urls[i][1]
      let msg = `result for ${url} returned error code ${result.code}: "${result.message}"`
      console.error(msg)
    }
  }

  dispatch(replaceAll(resources))
  dispatch(reconcileEvents(resources))
  dispatch(watchEvents(resources))
  dispatch(requestMetrics(resources))
  watchResources(dispatch, getState)
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

function watchResources(dispatch, getState, resourceVersion) {
  
  let accessEvaluator = getState().session.accessEvaluator
  let watches = getState().cluster.watches || {}
  let maxResourceVersionByKind = getState().cluster.maxResourceVersionByKind

  var watchableNamespaces

  if (!objectEmpty(watches)) {
    // Update/reset any existing watches
    for (let kind in KubeKinds.cluster) {
      let watch = watches[kind]
      watchableNamespaces = accessEvaluator.getWatchableNamespaces(kind, 'cluster')
      if (!!watch && watch.closed() && watchableNamespaces.length > 0) {
        watch.destroy()
        watches[kind] = new ResourceKindWatcher({
          kind: kind,
          dispatch: dispatch,
          resourceVersion: maxResourceVersionByKind[kind] || 0,
          resourceGroup: 'cluster',
          namespaces: watchableNamespaces,
        })
      }
    }
  } else {
    for (let kind in KubeKinds.cluster) {
      watchableNamespaces = accessEvaluator.getWatchableNamespaces(kind, 'cluster')
      if (watchableNamespaces.length > 0) {
        watches[kind] = new ResourceKindWatcher({
            kind: kind,
            dispatch: dispatch,
            resourceVersion: maxResourceVersionByKind[kind] || 0,
            resourceGroup: 'cluster',
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
  
  let currentResource = getState().cluster.resource
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
    let { pods, resource, resources } = getState().cluster
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
    if (!!resource) {
      dispatch(selectEventsFor(resources, resource))
    }
  } else {
    console.log(`skipping ${types.SELECT_RESOURCE}`)
  }
}

async function updateResourceContents(dispatch, getState, namespace, kind, name, contents) {
  
  let resource = getState().cluster.resource
  let body = createPatch(resource, contents)

  // mimic kubectl annotations so that changes applied in
  // the UI are compatible with those applied in the cli
  // @see https://github.com/kubernetes/community/blob/master/contributors/devel/strategic-merge-patch.md

  let api = KubeKinds.cluster[kind]
  let url = `/proxy/${api.base}/namespaces/${namespace}/${api.plural}/${name}`
  await fetch(url, { ...defaultFetchParams,
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
      }
    } else {
      return resp.json()
    }
  }).then(resource => {
    // dispatch(putResource(resource))
    dispatch({ type: types.SELECT_RESOURCE, namespace: namespace, kind: kind, name: name, })
    dispatch(receiveResource(resource, resource))
  })
}

const lastConfigAnnotation = 'kubectl.kubernetes.io/last-applied-configuration'

/**
 * Creates a valid patch body (String), compatible with `kubectl apply` functionality
 * 
 * @param {String} contents 
 */
function createPatch(resource, contents) {
  let patch = yaml.safeLoad(contents)
  patch.spec.$patch = 'replace'
  patch.metadata.$patch = 'replace'
  delete patch.kind
  delete patch.apiVersion
  // These are all read-only fields; TODO: either hide them in the editor, or present some
  // UI feedback indicating that they cannot be changed

  delete patch.status
  delete patch.metadata.generation
  delete patch.metadata.creationTimestamp
  delete patch.metadata.resourceVersion
  delete patch.metadata.selfLink
  delete patch.metadata.uid

  if (!!resource) {
    patch.metadata.annotations[lastConfigAnnotation] = createLastConfigAnnotation(resource)
  }
  
  return JSON.stringify(patch)
}

/**
 * Creates the 'kubectl.kubernetes.io/last-applied-configuration' value
 * to be added when creating a patch
 * 
 * @param {*} resource 
 */
function createLastConfigAnnotation(resource) {
  let ann = JSON.parse(JSON.stringify(resource))
  ann.metadata.annotations = {}
  delete ann.isFiltered
  if (!ann.apiVersion) {
    ann.apiVersion = KubeKinds.cluster[resource.kind].base
  }
  delete ann.status
  delete ann.metadata.generation
  delete ann.metadata.creationTimestamp
  delete ann.metadata.resourceVersion
  delete ann.metadata.selfLink
  delete ann.metadata.uid

  return JSON.stringify(ann)
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
      doRequest(dispatch, getState, 'fetchResourceContents', async () => {
        await fetchResourceContents(dispatch, getState, namespace, kind, name)
      })
  }
}

async function fetchResourceContents(dispatch, getState, namespace, kind, name) {

  let api = KubeKinds.cluster[kind]
  await fetchResource(dispatch, getState, namespace, kind, name)
  let resource = getState().cluster.resource
  let url = `/proxy/${api.base}/`
  if (namespace && namespace !== '~') {
    url += `namespaces/${namespace}/`
  }
  url += `${api.plural}/${name}`
  await fetch(url, 
      defaultFetchParams
    ).then(resp => {
      if (!resp.ok) {
        if (resp.status === 401) {
          dispatch(invalidateSession())
        }
        dispatch(receiveResource(resource, null, resp.statusText))
      } else {
        return resp.json()
      }
    }).then(contents => {
      dispatch(receiveResource(resource, contents))
    })
}
