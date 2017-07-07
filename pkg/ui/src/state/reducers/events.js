import { types } from '../actions/events'
import { keyForResource, objectEmpty, ownersForResource } from '../../comparators'

const initialState = {
  watches: [],
  // events are stored as a map of arrays
  //  map[`kind/namespace/name`] => [events]
  events: {},
  // events that cannot be directly or transitively associated
  // to any specific resource
  detachedEvents: [],
  // an array of time-sorted events
  selectedEvents: [],
  // the resource for which events should be selected
  selectedResource: null,
}

export default (state = initialState, action) => {
  switch (action.type) {
    
    case types.RECEIVE_EVENTS:
      return doReceiveEvents(state, action.resources, action.events)
    case types.SET_WATCH:
      return {...state, watch: action.watch}
    case types.SELECT_EVENTS_FOR:
      return doSelectEventsFor(state, action.resources, action.resource)
    default:
      return state;
  }
}

function doReceiveEvents(state, resources, events) {
  let stateEvents = {...state.events}
  let detachedEvents = state.detachedEvents.slice(0)
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
    let key = keyForResource(object)
    if (key in resources) {
      let eventsForObject = stateEvents[key] = (stateEvents[key] || {})
      eventsForObject[event.object.metadata.name] = event
    } else {
      let attached = false
      for (let ownerKey of ownersForResource(resources, key)) {
        if (ownerKey in resources) {
          let eventsForObject = stateEvents[ownerKey] = (stateEvents[ownerKey] || {})
          eventsForObject[event.object.metadata.name] = event
          attached = true
          break
        }
      }
      if (!attached) {
        detachedEvents.push(event)
      }
    }
  }
  let newState = {...state, events: stateEvents, detachedEvents: detachedEvents}
  if (!!state.selectedResource) {
    newState = doSelectEventsFor(newState, resources, state.selectedResource)
  } else {
    newState.slectedEvents = []
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

function doSelectEventsFor(state, resources, resource) {
  let events = state.events
  if (objectEmpty(events)) {
    return {...state, selectedResource: resource}
  } else {
    let selected = []
    let owners = [resource]
    while (owners.length) {
      let owner = owners.shift()
      if (owner.key in events) {
        let eventsForOwner = events[owner.key]
        for (let name in eventsForOwner) {
          selected.push(eventsForOwner[name])
        }
      }
      if (!!owner.owned) {
        for (let key in owner.owned) {
          let owned = owner.owned[key]
          owners.push(owned)
        }
      }
    }
    // sort by timestamps
    selected.sort(function(a, b) { return -1*a.object.lastTimestamp.localeCompare(b.object.lastTimestamp) })
    return {...state, selectedEvents: selected, selectedResource: resource}
  }
}