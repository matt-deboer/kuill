import { types } from '../actions/session'

const initialState = {
  initialized: false,
  user: null,
  loginMethod: null,
  loginMethods: [],
  isFetching: false,
}

export default (state = initialState, action) => {
  switch (action.type) {
    
    case types.FETCHING:
      return {...state, isFetching: action.isFetching}

    case types.INITIALIZE:
      return { ...state, user: action.user, initialized: true, loginMethod: action.loginMethod }

    case types.LOGOUT:
      return { ...state, user: null, loginMethod: null }

    case types.INVALIDATE:
      return { ...state, user: null }

    default:
      return state;
  }
}
