// import { types } from '../actions/location'
import { types as session } from '../actions/session'
import { LOCATION_CHANGE } from 'react-router-redux'

const initialState = {
  current: null,
  previous: null,
}

export default (state = initialState, action) => {
  switch (action.type) {
    
    case session.INVALIDATE:
      return initialState

    case LOCATION_CHANGE:
      return {...state, current: action.payload, previous: state.current}

    default:
      return state;
  }
}
