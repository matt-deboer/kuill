import { types } from '../actions/terminal'
import { types as session } from '../actions/session'

const initialState = {
  pod: null,
  container: null,
}

export default (state = initialState, action) => {
  switch (action.type) {
    
    case session.INVALIDATE:
      return initialState

    case types.SELECT_TERMINAL_FOR:
      return {...state, podContainer: action.podContainer}

    default:
      return state;
  }
}
