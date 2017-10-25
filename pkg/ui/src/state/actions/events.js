import { invalidateSession } from './session'
import EventsWatcher from '../../utils/EventsWatcher'

export var types = {}
for (let type of [
  'RECEIVE_EVENTS',
  'SET_WATCH',
  'SELECT_EVENTS_FOR',
]) {
  types[type] = `events.${type}`
}

const defaultFetchParams = {
  credentials: 'same-origin',
  timeout: 5000,
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

export function watchEvents() {
  return function(dispatch, getState) {
    setEventWatches(dispatch, getState)
  }
}

async function setEventWatches(dispatch, getState) {
  
  let { watch } = getState().events
  if (!watch) {
    let eventsUrl = `/proxy/api/v1/events`
    let resourceVersion = 0
    // Need to fetch current events in order to find latest resourceVersion
    let result = await fetch(eventsUrl, defaultFetchParams
        ).then(resp => {
          if (!resp.ok) {
            if (resp.status === 401) {
              dispatch(invalidateSession())
            }
          } else {
            return resp.json()
          }
        })

    if (!!result && result.kind === 'EventList') {
      resourceVersion = result.metadata.resourceVersion
      dispatch(receiveEvents(getState().resources.resources, ...result.items))   
    }

    watch = new EventsWatcher({
      dispatch: dispatch,
      getState: getState,
      resourceVersion: resourceVersion,
    })
    dispatch(setWatch(watch))
  }
}
