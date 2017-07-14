import { invalidateSession } from './session'
import { selectLogsFor } from './logs'
import { selectTerminalFor } from './terminal'
import { routerActions } from 'react-router-redux'
import KubeKinds from '../../kube-kinds'
import queryString from 'query-string'
import { arraysEqual, objectEmpty } from '../../comparators'
import { keyForResource, isResourceOwnedBy, sameResource } from '../../resource-utils'
import ResourceKindWatcher from '../../utils/ResourceKindWatcher'
import { watchEvents, selectEventsFor } from './events'
import { linkForResource } from '../../routes'
import { addError } from './errors'
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
  'RECEIVE_TEMPLATES',
]) {
  types[type] = `workloads.${type}`
}

export const defaultFilterNames = 'namespace:default'

export const maxReloadInterval = 5000

const defaultFetchParams = {
  credentials: 'same-origin',
  timeout: 5000,
}

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
      dispatch(routerActions.push({
        pathname: linkForResource({name: name, namespace: namespace, kind: kind}).split('?')[0],
        search: '?view=events',
        hash: '',
      }))
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
  if (getState().workloads.isFetching) {
    console.warn(`doRequest called while already fetching...`)
  }
  dispatch({ type: types.START_FETCHING })
  let { fetchBackoff } = getState().workloads
  await sleep(fetchBackoff).then(request)
  dispatch({ type: types.DONE_FETCHING })
}

/**
 * @param {Boolean} force
 */
export function requestResources(force) {
  return async function (dispatch, getState) {
      doRequest(dispatch, getState, async () => {
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
      doRequest(dispatch, getState, async () => {
        await fetchResource(dispatch, getState, namespace, kind, name)
      })
  }
}

/**
 * Requests the set of all available resource templates
 */
export function requestTemplates() {
  return async function (dispatch, getState) {
      doRequest(dispatch, getState, async () => {
        await fetchResourceTemplates(dispatch, getState)
      })
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
export function removeResource(...resources) {
  return async function (dispatch, getState) {
      await doRequest(dispatch, getState, async () => {
        await removeResources(dispatch, getState, resources)
      })
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

    let urls = Object.entries(KubeKinds.workloads).map(entry => `/proxy/${entry[1].base}/${entry[1].plural}`)
    let requests = urls.map((url,index) => fetch(url, defaultFetchParams
      ).then(resp => {
          if (!resp.ok) {
            if (resp.status === 401) {
              dispatch(invalidateSession())
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

function watchResources(dispatch, getState) {
  
    let watches = getState().workloads.watches || {}
    let maxResourceVersionByKind = getState().workloads.maxResourceVersionByKind
    if (!objectEmpty(watches)) {
      // Update/reset any existing watches
      for (let kind in KubeKinds.workloads) {
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
    } else {
      for (let kind in KubeKinds.workloads) {
        watches[kind] = new ResourceKindWatcher({
          kind: kind, 
          dispatch: dispatch,
          resourceVersion: maxResourceVersionByKind[kind] || 0,
          resourceGroup: 'workloads',
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

async function fetchResourceTemplates(dispatch, getState) {
  
  let templateNames = await fetch(`/templates`, defaultFetchParams
      ).then(resp => {
          if (!resp.ok) {
            if (resp.status === 401) {
              dispatch(invalidateSession())
            } else {
              dispatch(addError(null,'error',`Failed to fetch templates: ${resp.statusText}`))
            }
            return resp
          } else {
            return resp.json()
          }
        }
      )

  let urls = templateNames.map(template => `/templates/${template}`)
  let requests = urls.map(url => fetch(url, defaultFetchParams
    ).then(resp => {
        if (!resp.ok) {
          if (resp.status === 401) {
            dispatch(invalidateSession())
          }
          return resp
        } else {
          return resp.text()
        }
      }
  ))

  let results = await Promise.all(requests)
  let templates = {}

  for (var i=0, len=results.length; i < len; ++i) {
    let result = results[i]
    let name = templateNames[i]
    if (typeof result === 'string') {
      templates[name] = result    
    } else {
      let url = urls[i]
      let msg = `result for ${url} returned error code ${result.code}: "${result.message}"`
      console.error(msg)
    }
  }
  dispatch({
    type: types.RECEIVE_TEMPLATES,
    templates: templates,
  })
}

const lastConfigAnnotation = 'kubectl.kubernetes.io/last-applied-configuration'

function removeReadOnlyFields(resource) {
  delete resource.status
  delete resource.metadata.generation
  delete resource.metadata.creationTimestamp
  delete resource.metadata.resourceVersion
  delete resource.metadata.selfLink
  delete resource.metadata.uid
}

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
  removeReadOnlyFields(patch)
  
  if (!!resource) {
    patch.metadata.annotations[lastConfigAnnotation] = createLastConfigAnnotation(resource)
  }
  return patch
}

function createPost(contents) {
  let post = yaml.safeLoad(contents)
  removeReadOnlyFields(post)
  return post
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
    ann.apiVersion = KubeKinds.workloads[resource.kind].base
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
      doRequest(dispatch, getState, async () => {
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

async function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}