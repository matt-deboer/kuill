import { types } from '../actions/apimodels'

const initialState = {
  modelsByAPIGroup: null,
  swagger: null,
}

export default (state = initialState, action) => {
  switch (action.type) {
    
    case types.RECEIVE_MODELS:
      return {...state, modelsByAPIGroup: action.models}
    case types.RECEIVE_SWAGGER:
      return {...state, swagger: action.swagger}

    default:
      return state;
  }
}
