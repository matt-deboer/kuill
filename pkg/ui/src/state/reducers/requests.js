import { types } from '../actions/requests'

const initialState = {
  fetching: {},
  fetchBackoff: 0,
  fetchError: null,
}

export default (state = initialState, action) => {
  switch (action.type) {
    
    case types.START_FETCHING:
      return doSetFetching(state, action.name, true)

    case types.DONE_FETCHING:
      return {...state, 
        fetching: false,
        fetchBackoff: !!state.fetchError ? incrementBackoff(state.fetchBackoff) : decrementBackoff(state.fetchBackoff),
      }

    default:
      return state;
  }
}

function doSetFetching(state, name, fetching) {
  let newState = {...state, fetching: {...state.fetching}}
  if (fetching) {
    newState.fetching[name] = fetching
  } else {
    delete newState.fetching[name]
  }

  if (!fetching) {
    newState.fetchBackoff = !!newState.fetchError ? incrementBackoff(newState.fetchBackoff) : decrementBackoff(newState.fetchBackoff)
  }

  return newState
}

function decrementBackoff(backoff) {
  return Math.max(Math.floor(backoff / 4), 0)
}

function incrementBackoff(backoff) {
  return Math.max(backoff * 2, 1000)
}