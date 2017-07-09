import { types } from '../actions/workloads'
import yaml from 'js-yaml'
import queryString from 'query-string'
import { LOCATION_CHANGE } from 'react-router-redux'
import { arraysEqual } from '../../comparators'
import { keyForResource, statusForResource } from '../../resource-utils'

const initialState = {
  // the filter names in string form
  filterNames:[],
  // filters are store as a nested set of maps:
  //  map[key] => map[value] => true
  // TODO: consider leveraging the filter mechanism from kubernetes-ui/filters
  filters: {},
  // the list of possible filters (strings), used for auto-complete
  possibleFilters: [],
  // the currently selected resource
  resource: null,
  // the currently requested resource cannot be found
  resourceNotFound: false,
  // pods that are transitively owned by the currently selected resource
  pods: {},
  // resources are stored as a nested set of maps:
  //  map[kind] => map[namespace] => map[name] => resource
  resources: {},
  editor: {
    format: 'yaml'
  },
  isFetching: false,
  fetchBackoff: 0,
  fetchError: null,
  watches: null,
  // the maximum resourceVersion value seen across all resource fetches
  // by kind--this allows us to set watches more efficiently; 
  // TODO: we may need to store this on a per-resource basis, 
  // as the fetches for different resource kinds occur independently
  maxResourceVersionByKind: {},
}

export default (state = initialState, action) => {
  
  switch (action.type) {
    
    case LOCATION_CHANGE:
      return doSetFiltersByLocation(state, action.payload)
    
    case types.START_FETCHING:
      return {...state, isFetching: true}

    case types.DONE_FETCHING:
      return {...state, 
        isFetching: false,
        fetchBackoff: !!state.fetchError ? incrementBackoff(state.fetchBackoff) : decrementBackoff(state.fetchBackoff),
      }

    case types.REPLACE_ALL:
      return doReceiveResources(state, action.resources, action.maxResourceVersion, action.error)

    case types.FILTER_ALL:
      return doFilterAll(state, state.resources)

    case types.SET_FILTER_NAMES:
      return doSetFilterNames(state, action.filterNames)

    case types.PUT_RESOURCE:
      return doUpdateResource(state, action.resource, action.isNew)

    case types.REMOVE_RESOURCE:
      return doRemoveResource(state, action.resource)

    case types.SELECT_RESOURCE:
      return doSelectResource(state, action.namespace, action.kind, action.name)

    case types.RECEIVE_RESOURCE_CONTENTS:
      return doReceiveResourceContents(state, action.resource, action.contents, action.error)

    case types.SET_WATCHES:
      return {...state, watches: action.watches}

    case types.ADD_FILTER:
      return doAddFilter(state, action.filter)
    
    case types.REMOVE_FILTER:
      return doRemoveFilter(state, action.filter, action.index)

    case types.RECEIVE_TEMPLATES:
      return {...state, templates: action.templates}

    default:
      return state
  }
}

function doSetFiltersByLocation(state, location) {
  
  if (location.pathname === '/workloads') {
    let filterNames = queryString.parse(location.search).filters
    if (!filterNames) {
      filterNames = []
    } else if (filterNames.constructor !== Array) {
      filterNames = [filterNames]
    }
    if (!arraysEqual(filterNames, state.filterNames)) {
      console.log(`updating filter names on location change to ${location}; filterNames: ${filterNames.join(',')}`)
      return doSetFilterNames(state, filterNames)
    } 
  }
  return state
}

function doFilterAll(state, resources) {
  let newState = { ...state, resources: { ...resources }}
  let possible = null
  
  if (!newState.possibleFilters || newState.possibleFilters.length === 0) {
    possible = {}
  }

  visitResources(newState.resources, function(resource) {
    updatePossibleFilters(possible, resource)
    applyFiltersToResource(newState.filters, resource)
  })

  if (possible !== null) {
    newState.possibleFilters = Object.keys(possible)
  }

  return newState
}

function registerOwned(resources, resource) {
  if ('ownerReferences' in resource.metadata) {
    for (let ref of resource.metadata.ownerReferences) {
      let resolved = false
      let ownerKey = keyForResource(ref, resource.metadata.namespace)
      let owner = resources[ownerKey]
      if (!!owner) {
        let owned = owner.owned = owner.owned || {}
        owned[resource.key] = resource
        resolved = true
      }
      if (!resolved) {
        console.warn(`owner ref ${keyForResource(ref)} for resource ${resource.key} could not be resolved`)
      }
    }
  }
}

function updatePossibleFilters(possible, resource) {
  if (!!possible) {
    if (resource.metadata && resource.metadata.namespace) {
      possible[`namespace:${resource.metadata.namespace}`]=true
    }
    possible[`kind:${resource.kind}`]=true
    if (resource.metadata.labels && 'app' in resource.metadata.labels) {
      possible[`app:${resource.metadata.labels.app}`]=true
    }
  }
}

function doUpdateResource(state, resource, isNew) {
  if (!(resource.key in state.resources) && !isNew) {
    return state
  }
  
  resource.key = keyForResource(resource)
  resource.statusSummary = statusForResource(resource)
  let newState = {...state}
  if (resource.metadata.resourceVersion > state.maxResourceVersionByKind[resource.kind]) {
    newState.maxResourceVersionByKind = {...state.maxResourceVersionByKind}
    newState.maxResourceVersionByKind[resource.kind] = resource.metadata.resourceVersion
    if (typeof newState.maxResourceVersionByKind[resource.kind] !== 'number') {
      newState.maxResourceVersionByKind[resource.kind] = parseInt(newState.maxResourceVersionByKind[resource.kind])
    }
  }
  return doFilterResource(newState, resource)
}

function doFilterResource(newState, resource) {
  newState.resources = {...newState.resources}
  newState.resources[resource.key] = resource
  applyFiltersToResource(newState.filters, resource)
  return newState
}

function doRemoveResource(state, resource) {
  
  if (resource.key in state.resources) {
    let resources = { ...state.resources }
    delete resources[resource.key]
    return { ...state, resources: resources}    
  }
  return state
}

function doSelectResource(state, namespace, kind, name) {

  let pods = {}
  let key = keyForResource({kind: kind, namespace: namespace, name: name})
  let resource = state.resources[key]

  // When a resource is selected, we find all pods that are
  // owned by that resource
  let resourceNotFound = false
  if (!!resource) {
    if (kind === 'Pod') {
      pods[name] = resource
    } else {
      if ('owned' in resource) {
        let owners = [resource]
        while (owners.length > 0) {
          let owner = owners.shift()
          if ('owned' in owner) {
            for (let key in owner.owned) {
              let owned = owner.owned[key]
              if (owned.kind === 'Pod') {
                pods[owned.metadata.name] = owned
              } else if ('owned' in owned) {
                owners.push(owned)
              }
            }
          }
        }
      }
    }
  } else {
    resourceNotFound = true
  }

  return { ...state, 
    resource: resource,
    resourceNotFound: resourceNotFound,
    pods: pods, 
  }
}

function decrementBackoff(backoff) {
  return Math.max(Math.floor(backoff / 4), 0)
}

function incrementBackoff(backoff) {
  return Math.max(backoff * 2, 1000)
}


function doReceiveResources(state, resources) {
  let newState = {...state, possibleFilters: [], resources: resources}
  

  let possible = null
  if (!newState.possibleFilters || newState.possibleFilters.length === 0) {
    possible = {}
  }

  visitResources(newState.resources, function(resource) {
    updatePossibleFilters(possible, resource)
    applyFiltersToResource(newState.filters, resource)
    registerOwned(newState.resources, resource)
    newState.maxResourceVersionByKind[resource.kind] = Math.max(newState.maxResourceVersionByKind[resource.kind] || 0, resource.metadata.resourceVersion)
    if (typeof newState.maxResourceVersionByKind[resource.kind] !== 'number') {
      newState.maxResourceVersionByKind[resource.kind] = parseInt(newState.maxResourceVersionByKind[resource.kind])
    }
    resource.statusSummary = statusForResource(resource)
  })

  if (possible !== null) {
    newState.possibleFilters = Object.keys(possible)
  }

  return newState
}

/**
 * Iterates the provided set of resources, applying
 * the included set of functions to each
 * 
 * @param {*} resources 
 * @param {*} visitors one or more functions of the form (resources)
 */
function visitResources(resources, ...visitors) {
  for (let key in resources) {
    let resource = resources[key]
    for (let visitor of visitors) {
      visitor(resource)
    }
  }
}


function doReceiveResourceContents(state, resource, contents, error) {
  if (contents && state.editor.format) {
    filterContents(contents)
    if (state.editor.format === 'yaml') {
      contents = formatYaml(contents)
    } else {
      contents = JSON.stringify(contents)
    }
  }
  
  return { ...state, editor: {
        resource: resource, 
        contents: contents, 
        error: error, 
        format: 'yaml',
      }
    }
}

/**
 * Format the editor contents for consistency with `kubectl edit...`
 * 
 * @param {*} contents 
 */
function filterContents(contents) {
  // These are all read-only field values; we just hide them for now,
  // although it would be nice to display them in some sort of readonly
  // fashion for reference
  delete contents.status
  delete contents.metadata.generation
  delete contents.metadata.creationTimestamp
  delete contents.metadata.resourceVersion
  delete contents.metadata.selfLink
  delete contents.metadata.uid 
}

function formatYaml(contents) {
  let value = yaml.safeDump(contents, {
      '!!null': 'lowercase',
      'noRefs': true,
      'sortKeys': true,
    })
  return value
}

/**
 * Adds the specified filter (if it is not already present),
 * and returns a new state as appropriate
 * 
 * @param {Object} state the current state
 * @param {String} filterName the filterName to add
 */
function doAddFilter(state, filterName) {
  let filters = { ...state.filters }
  let filterNames = state.filterNames.slice(0)
  
  if (addFilter(filters, filterNames, filterName)) {
    return doFilterAll({ ...state,
      filterNames: filterNames,
      filters: filters
    }, state.resources)
  } else {
    return state
  }
}

/**
 * Return a new state where filters are defined (and applied)
 * based on the provided array of filterNames
 * 
 * @param {*} state the current state
 * @param {*} filterNames the filter names to apply
 */
function doSetFilterNames(state, filterNames) {
  let newFilters = {}
  let newFilterNames = []
  addFilter(newFilters, newFilterNames, ...filterNames)
  
  return doFilterAll({ ...state,
    filterNames: newFilterNames,
    filters: newFilters,
  }, state.resources)
}

/**
 * Adds one or more filters, applying changes to the provided 'filters'
 * object and 'filterNames' array as appropriate.
 * Returns `true` if the filter(s) were added (were not already present)
 * 
 * @param {Object} filters the existing hash of filter objects to modify
 * @param {Array} filterNames the existing array of filterNames to modify
 * @param {Array} newFilterNames one or more new filter names to add
 */
function addFilter(filters, filterNames, ...newFilterNames) {
  let modified = false
  for (let filterName of newFilterNames) {
    let [filterKey, filterValue] = splitFilter(filterName)
    if (!(filterKey in filters) || !(filterValue in filters[filterKey])) {
      let filter = filters[filterKey] = (filters[filterKey] || {})
      filter[filterValue]=true
      filterNames.push(filterName)
      modified = true
    }
  }
  return modified
}

/**
 * Removes a filter, applying the change to the provided filters
 * object and the filterNames array as appropriate
 * 
 * @param {Object} filters the filters hash
 * @param {Array} filterNames the array of serialized filter names
 * @param {String} filterName the filter name to be added
 * @param {Number} index the index of the filterName being removed
 */
function removeFilter(filters, filterNames, filterName, index) {
  let [filterKey, filterValue] = splitFilter(filterName)
  var filter = filters[filterKey]
  if (filter) {
    delete filter[filterValue]
    if (Object.keys(filter).length === 0) {
      delete filters[filterKey]
    }
  }
  if (index !== undefined) {
    filterNames.splice(index, 1)
  } else {
    // have to find the correct index
    for (let i=0; i < filterNames.length; ++i) {
      if (filterNames[i] === filterName) {
        filterNames.splice(i, 1)
        break
      }
    }
  }
}

/**
 * Removes the specified filter, and re-applies all filters to
 * the current set of resources, returning a new state
 * 
 * @param {*} state the existing state
 * @param {*} filterName the filter to remove
 * @param {*} index the index of the filter to remove
 */
function doRemoveFilter(state, filterName, index) {

  var filters = { ...state.filters }
  var filterNames = state.filterNames.slice(0)

  removeFilter(filters, filterNames, filterName, index)

  // need to re-apply filters after removing one
  return doFilterAll({ ...state,
    filterNames: filterNames,
    filters: filters
  }, state.resources)
}

/**
 * Applies the provided filters to the resource, modifying
 * the 'isFiltered' attribute of the resource accordingly
 * 
 * @param {*} filters the filters to apply
 * @param {*} resource the resource to update
 */
function applyFiltersToResource(filters, resource) {
  resource.isFiltered = false
  for (var field in filters) {
    var values = filters[field]
    
    if (field === '*') {
      let matched = false
      for (var m in resource.metadata) {
        if (resource.metadata[m] in values) {
          matched = true
          break
        }
      }
      if (!matched && 'labels' in resource.metadata) {
        for (var label in resource.metadata.labels) {
          if (resource.metadata.labels[label] in values) {
            matched = true
            break
          }
        }
      }
      resource.isFiltered = !matched
    } else if ( !(resource.metadata[field] in values)
    && !(resource[field] in values)
    && !('labels' in resource.metadata && resource.metadata.labels[field] in values)) {
      resource.isFiltered = true
      break
    }
  }
}

function splitFilter(filter) {
  var parts=filter.split(":")
  if (parts.length === 1) {
    parts = ["*", parts[0]]
  }
  return parts
}