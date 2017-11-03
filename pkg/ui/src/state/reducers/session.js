import { types } from '../actions/session'

const initialState = {
  initialized: false,
  user: null,
  loginMethod: null,
  loginMethods: [],
  isFetching: false,
  accessEvaluator: null,
  linkGenerator: null,
}

export default (state = initialState, action) => {
  switch (action.type) {

    case types.INITIALIZE:
      return { ...state, 
        user: action.user,
        initialized: true,
        loginMethod: action.loginMethod,
        accessEvaluator: action.accessEvaluator,
        linkGenerator: action.linkGenerator,
      }

    case types.LOGOUT:
      return { ...state, user: null, loginMethod: null }

    case types.INVALIDATE:
      return { ...state, user: null, initialized: true }

    default:
      return state;
  }
}
