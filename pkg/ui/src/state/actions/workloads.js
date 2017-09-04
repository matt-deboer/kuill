import { invalidateSession } from './session'
import { selectLogsFor } from './logs'
import { selectTerminalFor } from './terminal'
import { routerActions } from 'react-router-redux'
import KubeKinds from '../../kube-kinds'
import queryString from 'query-string'
import { arraysEqual, objectEmpty } from '../../comparators'
import { keyForResource, isResourceOwnedBy, sameResource } from '../../utils/resource-utils'
import ResourceKindWatcher from '../../utils/ResourceKindWatcher'
import { watchEvents, selectEventsFor, reconcileEvents } from './events'
import { linkForResource } from '../../routes'
import { addError } from './errors'
import yaml from 'js-yaml'
import { defaultFetchParams, createPost, createPatch, removeReadOnlyFields } from '../../utils/request-utils'
import { doRequest } from './requests'


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
  // 'START_FETCHING',
  // 'DONE_FETCHING',
  'RECEIVE_RESOURCE_CONTENTS',
  'CLEAR_EDITOR',
  'SELECT_RESOURCE',
  'SET_WATCHES',
  'DISABLE_KIND',
]) {
  types[type] = `workloads.${type}`
}

export const defaultFilterNames = 'namespace:default'

export const maxReloadInterval = 5000

export function replaceAll(resources, error) {
  return {
    type: types.REPLACE_ALL,
    resources: resources,
    error: error,
  }
}

export function filterAll() {
  return {
    type: types.FILTER_ALL
  }
}

export function disableResourceKind(kind) {
  return {
    type: types.DISABLE_KIND,
    kind: kind,
  }
}

export function putResource(newResource, isNew) {
  return function(dispatch, getState) {
    
    let { maxResourceVersionByKind } = getState().workloads
    if (newResource.metadata.resourceVersion > maxResourceVersionByKind[newResource.kind] || 0) {
      // only allow events we've not yet seen to change resource state
      dispatch({
        type: types.PUT_RESOURCE,
        resource: newResource,
        isNew: isNew,
      })

      let { resource, resources } = getState().workloads
      
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
        let { pods } = getState().workloads
        if (resource.statusSummary === 'disabled') {
          pods = {}
        }
        selectAllForResource(dispatch, resources, resource, pods)
      }
    }
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
  let newFilterNames = state.workloads.filterNames.slice(0)
  let currentFilterNames = queryString.parse(state.routing.location.search).filters
  if (currentFilterNames && currentFilterNames.constructor !== Array) {
    currentFilterNames = [currentFilterNames]
  } else {
    currentFilterNames && currentFilterNames.sort()
  }
  newFilterNames && newFilterNames.sort()
  
  if (!arraysEqual(newFilterNames, currentFilterNames)) {
    let filterQuery = newFilterNames && newFilterNames.length > 0 ? 
      `?${queryString.stringify({filters: state.workloads.filterNames})}` :
      ''
    console.log(`updateFilterUrl: pushed new location...`)
    dispatch(routerActions.push(`/workloads${filterQuery}`))
  }
}

/**
 * Reconcile the internal filters based on the provided array
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
    let currentFilterNames = state.workloads.filterNames.slice(0)
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
      
      await doRequest(dispatch, getState, 'fetchResourceContents', async () => {
        await fetchResourceContents(dispatch, getState, namespace, kind, name)
      })

      let { contents } = getState().workloads.editor 
      if (contents) {
        let resource = createPost(contents)
        if (resource.spec && 'replicas' in resource.spec) {
          let prevReplicas = resource.spec.replicas
          resource.spec.replicas = (typeof replicas === 'string' ? parseInt(replicas, 10) : replicas)
          
          // Provide immediate feedback that the resource is scaling
          resource.statusSummary = 'scaling ' + (prevReplicas > resource.spec.replicas ? 'down' : 'up')
          dispatch(putResource(resource, false))

          doRequest(dispatch, getState, 'updateResourceContents', async () => {
            await updateResourceContents(dispatch, getState, namespace, kind, name, resource)
          })
        }
      }

      
      // dispatch(routerActions.push({
      //   pathname: linkForResource({name: name, namespace: namespace, kind: kind}).split('?')[0],
      //   search: '?view=events',
      //   hash: '',
      // }))
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
      // TODO: should we really be controlling routing here?
      dispatch(routerActions.push({
        pathname: linkForResource({name: name, namespace: namespace, kind: kind}).split('?')[0],
        search: '?view=events',
        hash: '',
      }))
  }
}



/**
 * @param {Boolean} force
 */
export function requestResources(force) {
  return async function (dispatch, getState) {
      doRequest(dispatch, getState, 'fetchResources', async () => {
        await fetchResources(dispatch, getState, force)
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

/**
 * Creates a new resource with the provided contents
 */
export function createResource(contents) {
  return async function (dispatch, getState) {
      let resource = null
      await doRequest(dispatch, getState, 'createResourceFromContents', async () => {
        resource = await createResourceFromContents(dispatch, getState, contents)
      })
      // let workloads = getState().workloads
      if (!!resource) {
        dispatch(routerActions.push({
          pathname: linkForResource(resource).split('?')[0],
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
      
      let { resources, resource } = getState().workloads
      let updateSelected = false
      for (let toBeRemoved of resourcesToRemove) {
        if (isResourceOwnedBy(resources, toBeRemoved, resource)
        || isResourceOwnedBy(resources, resource, toBeRemoved)) {
          updateSelected = true
          break
        }
      }

      await doRequest(dispatch, getState, 'removeResources', async () => {
        await removeResources(dispatch, getState, resourcesToRemove)
      })

      if (updateSelected) {
        dispatch({
          type: types.SELECT_RESOURCE,
          namespace: resource.metadata.namespace,
          kind: resource.kind,
          name: resource.metadata.name,
        })
        let { pods } = getState().workloads
        selectAllForResource(dispatch, resources, resource, pods)
      }
  }
}


function shouldFetchResources(getState, force) {
  let state = getState()
  let { resources, lastLoaded } = state.workloads
  let { user } = state.session

  // TODO: should also check on resources last loaded time
  let shouldRefresh = (!!force && (Date.now() - lastLoaded) > maxReloadInterval)
  let noResources = (!resources || Object.keys(resources).length === 0)

  let shouldFetch = (!!user) && (noResources || shouldRefresh)    

  return shouldFetch
}


async function fetchResources(dispatch, getState, force) {
  
  if (shouldFetchResources(getState, force)) {

    let urls = Object.entries(KubeKinds.workloads).map(entry => [entry[0], `/proxy/${entry[1].base}/${entry[1].plural}`])
    let requests = urls.map(([kind,url],index) => fetch(url, defaultFetchParams
      ).then(resp => {
          if (!resp.ok) {
            if (resp.status === 401) {
              dispatch(invalidateSession())
            } else if (resp.status === 404) {
              dispatch(disableResourceKind(kind))
            } else {
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
      } else {
        let url = urls[i][1]
        let msg = `result for ${url} returned error code ${result.code}: "${result.message}"`
        console.error(msg)
      }
    }

    dispatch(replaceAll(resources))
    dispatch(reconcileEvents(resources))
    dispatch(watchEvents(resources))
    watchResources(dispatch, getState)
  }
}

function watchResources(dispatch, getState) {
  
    let watches = getState().workloads.watches || {}
    let disabledKinds = getState().workloads.disabledKinds
    let maxResourceVersionByKind = getState().workloads.maxResourceVersionByKind
    if (!objectEmpty(watches)) {
      // Update/reset any existing watches
      for (let kind in KubeKinds.workloads) {
        let kubeKind = KubeKinds.workloads[kind]
        if (!(kind in disabledKinds) && (!('watchable' in kubeKind) || kubeKind.watchable)) {
          let watch = watches[kind]
          if (!!watch && watch.closed()) {
            watch.destroy()
            watches[kind] = new ResourceKindWatcher({
              kind: kind,
              dispatch: dispatch,
              resourceVersion: maxResourceVersionByKind[kind] || 0,
              resourceGroup: 'workloads',
            })
          }
        }
      }
    } else {
      for (let kind in KubeKinds.workloads) {
        let kubeKind = KubeKinds.workloads[kind]
        if (!(kind in disabledKinds) && (!('watchable' in kubeKind) || kubeKind.watchable)) {
          watches[kind] = new ResourceKindWatcher({
            kind: kind, 
            dispatch: dispatch,
            resourceVersion: maxResourceVersionByKind[kind] || 0,
            resourceGroup: 'workloads',
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
  
  let currentResource = getState().workloads.resource
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
    let { pods, resource, resources } = getState().workloads
    
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
  
  let resource = getState().workloads.resource
  let body = JSON.stringify(createPatch(resource, contents))

  // mimic kubectl annotations so that changes applied in
  // the UI are compatible with those applied in the cli
  // @see https://github.com/kubernetes/community/blob/master/contributors/devel/strategic-merge-patch.md

  let api = KubeKinds.workloads[kind]
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
      } else {
        dispatch(addError(resp,'error',`Failed to update contents for ${kind}/${namespace}/${name}: ${resp.statusText}`))
      }
    } else {
      return resp.json()
    }
  }).then(resource => {
    dispatch({ type: types.SELECT_RESOURCE, namespace: namespace, kind: kind, name: name, })
    dispatch(receiveResource(resource, resource))
  })
}

async function createResourceFromContents(dispatch, getState, contents) {
  let resource = createPost(contents)
  let { namespace } = resource.metadata
  let api = KubeKinds.workloads[resource.kind]
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
        return getState().workloads.resources[resource.key]
      }
    }
  })
}

async function removeResources(dispatch, getState, resources) {
  
  let knownResources = getState().workloads.resources
  let resourcesToRemove = []
  for (let r of resources) {
    if (r.key in knownResources) {
      resourcesToRemove.push(r)
    }
  }

  let urls = resourcesToRemove.map(resource => {
    let { namespace, name } = resource.metadata
    let api = KubeKinds.workloads[resource.kind]
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
      doRequest(dispatch, getState, 'fetchResourceContents', async () => {
        await fetchResourceContents(dispatch, getState, namespace, kind, name)
      })
  }
}

async function fetchResourceContents(dispatch, getState, namespace, kind, name) {

  let api = KubeKinds.workloads[kind]
  await fetchResource(dispatch, getState, namespace, kind, name)
  let resource = getState().workloads.resource
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
