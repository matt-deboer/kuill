import { types } from '../actions/terminal'

const initialState = {
  pod: null,
  container: null,
}

export default (state = initialState, action) => {
  switch (action.type) {
    
    case types.SELECT_TERMINAL_FOR:
      return {...state, podContainer: action.podContainer}

    default:
      return state;
  }
}
