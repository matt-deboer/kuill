import { types } from '../actions/logs'
import { types as session } from '../actions/session'

const initialState = {
  pods: [],
  containers: [],
}

export default (state = initialState, action) => {
  switch (action.type) {
    
    case session.INVALIDATE:
      return initialState

    case types.SELECT_LOGS_FOR:
      return {...state, podContainers: action.podContainers}

    default:
      return state;
  }
}
