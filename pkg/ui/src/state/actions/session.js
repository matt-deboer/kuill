import { addError } from './errors'
import { doRequest } from './requests'
import { defaultFetchParams } from '../../utils/request-utils'
import { requestNamespaces } from './cluster'

export var types = {}
for (let type of [
  'INITIALIZE',
  'LOGOUT',
  'INVALIDATE',
  'REPLACE_LOGIN_METHODS',
  'FETCHING',
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
    
    dispatch(requestNamespaces())

    dispatch({
      type: types.INITIALIZE,
      user: user,
      authMethod: authMethod,
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
  return {
    type: types.INVALIDATE,
  }
}

export function replaceLoginMethods(loginMethods) {
  return {
    type: types.REPLACE_LOGIN_METHODS,
    loginMethods: loginMethods,
  }
}

async function isActionPermitted(dispatch, getState, path, verb, namespace='') {
  
  let body = {
    kind: 'SelfSubjectAccessReview',
    apiVersion: 'v1',
    spec: {
      nonResourceAttributes: [
        {
          path: '',
          verb: '',
        }
      ],
      resourceAttributes: [
        {
          group: '*',
          namespace: namespace,
          resource: '',
          subresource: '',
          verb: '',
          version: '*',
        }
      ]
    }
  }

  let url = '/proxy/apis/authorization.k8s.io/v1beta1/selfsubjectaccessreviews'
  let result = await fetch( url, {...defaultFetchParams, 
    method: 'POST',
    body: JSON.stringify(body),
  }).then(resp => {
    if (!resp.ok) {
      if (resp.status === 401) {
        dispatch(invalidateSession())
      }
      return resp
    } else {
      return resp.json()
    }
  })
  return result

}