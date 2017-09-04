import { invalidateSession } from './session'
import { routerActions } from 'react-router-redux'
import KubeKinds from '../../kube-kinds'
import queryString from 'query-string'
import { arraysEqual, objectEmpty } from '../../comparators'
import { keyForResource, isResourceOwnedBy, sameResource } from '../../utils/resource-utils'
import ResourceKindWatcher from '../../utils/ResourceKindWatcher'
import { watchEvents, selectEventsFor } from './events'
import { linkForResource } from '../../routes'
import { addError } from './errors'
import { defaultFetchParams, sleep, createPost, createPatch, removeReadOnlyFields } from '../../utils/request-utils'
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
  'CLEAR_EDITOR',
  'SELECT_RESOURCE',
  'SET_WATCHES',
]) {
  types[type] = `access.${type}`
}

export function replaceAll(resources, maxResourceVersion, error) {
  return {
    type: types.REPLACE_ALL,
    resources: resources,
    maxResourceVersion: maxResourceVersion,
    error: error,
  }
}

export function filterAll() {
  return {
    type: types.FILTER_ALL
  }
}

export function putResource(newResource) {
  return function(dispatch, getState) {
    
    dispatch({
      type: types.PUT_RESOURCE,
      resource: newResource,
    })

    let { resource, resources } = getState().access
    if (sameResource(newResource, resource)
    || isResourceOwnedBy(resources, newResource, resource)
    || isResourceOwnedBy(resources, resource, newResource)) {
      dispatch(selectEventsFor(resources, resource))
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
 * Creates a new resource with the provided contents
 */
export function createResource(contents) {
  return async function (dispatch, getState) {
      let resource = null
      await doRequest(dispatch, getState, async () => {
        resource = await createResourceFromContents(dispatch, getState, contents)
      })
      if (!!resource) {
        dispatch(routerActions.push({
          pathname: linkForResource(resource).split('?')[0],
          search: '?view=events',
        }))
      }
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
  let newFilterNames = state.access.filterNames.slice(0)
  let currentFilterNames = queryString.parse(state.routing.location.search).filters
  if (currentFilterNames && currentFilterNames.constructor !== Array) {
    currentFilterNames = [currentFilterNames]
  } else {
    currentFilterNames && currentFilterNames.sort()
  }
  newFilterNames && newFilterNames.sort()
  
  if (!arraysEqual(newFilterNames, currentFilterNames)) {
    let filterQuery = newFilterNames && newFilterNames.length > 0 ? 
      `?${queryString.stringify({filters: state.access.filterNames})}` :
      ''
    console.log(`updateFilterUrl: pushed new location...`)
    dispatch(routerActions.push(`/access${filterQuery}`))
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
    let currentFilterNames = state.access.filterNames.slice(0)
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
      doRequest(dispatch, getState, async () => {
        await updateResourceContents(dispatch, getState, namespace, kind, name, contents)
      })
  }
}

/**
 * Wraps any fetch request with proper setting of the `isFetching`
 * guards, and applies any fetchBackoff value.
 * 
 * @param {*} dispatch 
 * @param {*} getState 
 * @param {*} request 
 */
async function doRequest(dispatch, getState, request) {
  if (getState().access.isFetching) {
    console.warn(`doRequest called while already fetching...`)
  }
  dispatch({ type: types.START_FETCHING })
  let { fetchBackoff } = getState().access
  await sleep(fetchBackoff).then(request)
  dispatch({ type: types.DONE_FETCHING })
}

/**
 * 
 */
export function requestResources() {
  return async function (dispatch, getState) {
      doRequest(dispatch, getState, async () => {
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
      doRequest(dispatch, getState, async () => {
        await fetchResource(dispatch, getState, namespace, kind, name)
      })
  }
}

async function createResourceFromContents(dispatch, getState, contents) {
  let resource = createPost(contents)
  let { namespace } = resource.metadata
  let api = KubeKinds.access[resource.kind]
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
        return getState().access.resources[resource.key]
      }
    }
  })
}

function shouldFetchResources(getState) {
  let state = getState()
  let { isFetching, resources } = state.access
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

    let urls = Object.entries(KubeKinds.access).map(entry => `/proxy/${entry[1].base}/${entry[1].plural}`)
    let requests = urls.map(url => fetch(url, defaultFetchParams
      ).then(resp => {
          if (!resp.ok) {
            if (resp.status === 401) {
              dispatch(invalidateSession())
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
        let url = urls[i]
        let msg = `result for ${url} returned error code ${result.code}: "${result.message}"`
        console.error(msg)
      }
    }

    dispatch(replaceAll(resources))
    dispatch(watchEvents(resources))
    watchResources(dispatch, getState)
  }
}

function watchResources(dispatch, getState, resourceVersion) {
  
    let watches = getState().access.watches || {}
    if (!objectEmpty(watches)) {
      // Update/reset any existing watches
      for (let kind in KubeKinds.access) {
        let watch = watches[kind]
        if (!!watch && watch.closed()) {
          watch.destroy()
          watches[kind] = new ResourceKindWatcher({
            kind: kind,
            dispatch: dispatch,
            resourceVersion: resourceVersion,
            resourceGroup: 'access',
          })
        }
      }
    } else {
      for (let kind in KubeKinds.access) {
        watches[kind] = new ResourceKindWatcher({
            kind: kind,
            dispatch: dispatch,
            resourceVersion: resourceVersion,
            resourceGroup: 'access',
          })
      }
    }
    dispatch({
      type: types.SET_WATCHES,
      watches: watches,
    })
}


async function fetchResource(dispatch, getState, namespace, kind, name) {
  await fetchResources(dispatch, getState)
  
  let currentResource = getState().access.resource
  if (!currentResource 
      || (currentResource.metadata.namespace || '~') !== namespace
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
    let { resource, resources } = getState().access
    if (!!resource) {
      dispatch(selectEventsFor(resources, resource))
    }
  } else {
    console.log(`skipping ${types.SELECT_RESOURCE}`)
  }
}

async function updateResourceContents(dispatch, getState, namespace, kind, name, contents) {
  
  let resource = getState().access.resource
  let body = JSON.stringify(createPatch(resource, contents))

  // mimic kubectl annotations so that changes applied in
  // the UI are compatible with those applied in the cli
  // @see https://github.com/kubernetes/community/blob/master/contributors/devel/strategic-merge-patch.md

  let api = KubeKinds.access[kind]
  let url = `/proxy/${api.base}/`
  if (!!namespace && namespace !== '~') {
    url += `namespaces/${namespace}/`
  }
  url += `${api.plural}/${name}`

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
      doRequest(dispatch, getState, async () => {
        await fetchResourceContents(dispatch, getState, namespace, kind, name)
      })
  }
}

async function fetchResourceContents(dispatch, getState, namespace, kind, name) {

  let api = KubeKinds.access[kind]
  await fetchResource(dispatch, getState, namespace, kind, name)
  let resource = getState().access.resource
  let url = `/proxy/${api.base}/`
  if (!!namespace && namespace !== '~') {
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
