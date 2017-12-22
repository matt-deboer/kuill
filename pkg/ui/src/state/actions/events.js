export var types = {}
for (let type of [
  'RECEIVE_EVENTS',
  'SET_WATCH',
  'SELECT_EVENTS_FOR',
]) {
  types[type] = `events.${type}`
}

export function receiveEvents(resources, ...events) {
  
  return function(dispatch, getState) {
    dispatch({
      type: types.RECEIVE_EVENTS,
      resources: resources,
      events: events,
    })
  }
}

export function reconcileEvents(resources) {
  
  return function(dispatch, getState) {
    dispatch({
      type: types.RECEIVE_EVENTS,
      resources: resources,
      events: [],
    })
  }
}

/**
 * Selects all events for the provided resource,
 * including any events for resources transitively
 * owned by the target resource.
 * 
 * @param {*} resource 
 */
export function selectEventsFor(resources, resource) {
  return {
    type: types.SELECT_EVENTS_FOR,
    resources: resources, 
    resource: resource,
  }
}

export function setWatch(watch) {
  return {
    type: types.SET_WATCH,
    watch: watch,
  }
}
