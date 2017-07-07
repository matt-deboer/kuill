import { types } from '../actions/logs'

const initialState = {
  pods: [],
  containers: [],
}

export default (state = initialState, action) => {
  switch (action.type) {
    
    case types.SELECT_LOGS_FOR:
      return {...state, podContainers: action.podContainers}

    default:
      return state;
  }
}
