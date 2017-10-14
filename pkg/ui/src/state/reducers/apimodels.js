import { types } from '../actions/apimodels'

const initialState = {
  modelsByAPIGroup: null,
  swagger: null,
  kinds: null,
}

export default (state = initialState, action) => {
  switch (action.type) {
    
    case types.RECEIVE_MODELS:
      return {...state, modelsByAPIGroup: action.models}
    case types.RECEIVE_SWAGGER:
      return {...state, swagger: action.swagger}
    case types.RECEIVE_KINDS:
      return {...state, kinds: action.kinds}

    default:
      return state;
  }
}
