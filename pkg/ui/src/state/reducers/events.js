import { types } from '../actions/events'
import { objectEmpty } from '../../comparators'
import { keyForResource, ownersForResource, eventsForResource } from '../../utils/resource-utils'

const maxRecentEvents = 20

const initialState = {
  watch: null,
  // events are stored as a map of arrays
  //  map[`kind/namespace/name`] => [events]
  events: {},
  // the N most recent events, sorted by most recent
  recentEvents: [],
  // events that cannot be directly or transitively associated
  // to any specific resource
  detachedEvents: [],
  // an array of time-sorted events
  selectedEvents: [],
  // the resource for which events should be selected
  selectedResource: null,
  // markes the last updated version of events state; used for simple
  // comparison of whether events have changed
  revision: 0,
}

export default (state = initialState, action) => {
  switch (action.type) {
    
    case types.RECEIVE_EVENTS:
      return doReceiveEvents(state, action.resources, action.events)
    case types.SET_WATCH:
      return {...state, watch: action.watch}
    case types.SELECT_EVENTS_FOR:
      return doSelectEventsFor(state, action.resource)
    default:
      return state;
  }
}

function doReceiveEvents(state, resources, events) {
  let stateEvents = {...state.events}
  let detachedEvents = state.detachedEvents.slice(0)
  let recentEvents = state.recentEvents.slice(0)

  if (!resources) {
    console.error(`resources required in doReceiveEvents`)
  }

  for (let event of events) {
    if ('metadata' in event) {
      event = {
        object: event,
      }
    }
    if (!('type' in event)) {
      event.type = guessEventType(event)
    }
    let object = event.object.involvedObject
    event.key = keyForResource(object)
    
    if (event.key in resources) {
      let eventsForObject = stateEvents[event.key] = (stateEvents[event.key] || {})
      eventsForObject[event.object.metadata.name] = event
      recentEvents.push(event)
    } else {
      let attached = false
      for (let ownerKey of ownersForResource(resources, event.key)) {
        if (ownerKey in resources) {
          let eventsForObject = stateEvents[ownerKey] = (stateEvents[ownerKey] || {})
          eventsForObject[event.object.metadata.name] = event
          attached = true
          break
        }
      }
      if (!attached) {
        detachedEvents.push(event)
        recentEvents.push(event)
      }
    }
    // Update recent events
    recentEvents.sort((a,b) => {
      let aVal = a.object.lastTimestamp + a.object.metadata.uid
      let bVal = b.object.lastTimestamp + b.object.metadata.uid
      return -1 * aVal.localeCompare(bVal) 
    })
    // Deduplicate repeat events
    let seen = {}
    recentEvents = recentEvents.filter(function(elem) {
      let alreadySeen = (elem.object.metadata.uid in seen)
      seen[elem.object.metadata.uid] = true
      return !alreadySeen
    })
    // Trim to the max allowed
    recentEvents.length = Math.min(recentEvents.length, maxRecentEvents)
  }
  
  // Attempt to reconcile detached events
  let remainingDetachedEvents = []
  while (detachedEvents.length > 0) {
    let event = detachedEvents.pop()
    if (event.key in resources) {
      let eventsForObject = stateEvents[event.key] = (stateEvents[event.key] || {})
      eventsForObject[event.object.metadata.name] = event
    } else {
      remainingDetachedEvents.push(event)
    }
  }
  detachedEvents = remainingDetachedEvents

  let newState = {...state, 
    events: stateEvents,
    detachedEvents: detachedEvents,
    recentEvents: recentEvents,
  }
  if (!!state.selectedResource) {
    newState = doSelectEventsFor(newState, state.selectedResource)
  } else {
    newState.selectedEvents = []
    newState.revision++
  }
  return newState
}

function guessEventType(event) {
  let msg = event.object.message.toLowerCase()
  if (msg.includes('created') || msg.includes('added')) {
    return 'ADDED'
  } else if (msg.includes('deleted') || msg.includes('removed') || msg.includes('kill')) {
    return 'DELETED'
  } else if (event.object.type !== 'Normal') {
    return 'ERROR'
  } else {
    return 'MODIFIED'
  }
}

function doSelectEventsFor(state, resource) {
  let events = state.events
  if (objectEmpty(events)) {
    return {...state, selectedResource: resource, selectedEvents: [], revision: state.revision + 1}
  } else {
    let selected = eventsForResource(events, resource)
    return {...state, selectedEvents: selected, selectedResource: resource, revision: state.revision + 1}
  }
}