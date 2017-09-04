import { types } from '../actions/templates'

const initialState = {
  templatesByGroup: {},
}

export default (state = initialState, action) => {
  switch (action.type) {
    
    case types.RECEIVE_TEMPLATES:
      return {...state, templatesByGroup: action.templates}

    default:
      return state;
  }
}
