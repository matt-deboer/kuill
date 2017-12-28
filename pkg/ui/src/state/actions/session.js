import { requestNamespaces } from './resources'
import { requestSwagger } from './apimodels'
import { routerActions } from 'react-router-redux'
import AccessEvaluator from '../../utils/AccessEvaluator'
import LinkGenerator from '../../utils/LinkGenerator'

export var types = {}
for (let type of [
  'INITIALIZE',
  'LOGOUT',
  'INVALIDATE',
  'REPLACE_LOGIN_METHODS',
  'FETCHING',
  'PUT_PERMISSIONS',
]) {
  types[type] = `session.${type}`
}

export function fetching(isFetching) {
  return {
    type: types.FETCHING,
    isFetching: isFetching,
  }
}

// authenticate 
export function initializeSession(user, authMethod) {
  return async function (dispatch, getState) {
    
    await Promise.all([
      dispatch(requestSwagger()),
      dispatch(requestNamespaces()),
    ])

    dispatch({
      type: types.INITIALIZE,
      user: user,
      authMethod: authMethod,
      accessEvaluator: new AccessEvaluator({
        dispatch: dispatch,
        getState: getState,
      }),
      linkGenerator: new LinkGenerator({
        dispatch: dispatch,
        getState: getState,
      })
    })
  }
}

// user explicitly desires to logout
export function logout() {
  return {
    type: types.LOGOUT,
  }
}

// reflect that the server-side session is expired
export function invalidateSession() {
  return async function (dispatch, getState) {
    dispatch({
      type: types.INVALIDATE,
    })
    dispatch(routerActions.push('/'))
  }
}

export function replaceLoginMethods(loginMethods) {
  return {
    type: types.REPLACE_LOGIN_METHODS,
    loginMethods: loginMethods,
  }
}
