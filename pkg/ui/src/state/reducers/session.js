import { types } from '../actions/session'

const initialState = {
  initialized: false,
  user: null,
  loginMethod: null,
  loginMethods: [],
  isFetching: false,
  // cache of permissions by kind;
  // doing this will require logout/login for any permissions
  // changes to take effect, but this is not unreasonable
  permissionsByKind: {},
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

    case types.PUT_PERMISSIONS:
      return doUpdatePermissions(state, action.kind, action.permissions)

    default:
      return state;
  }
}

function doUpdatePermissions(state, kind, permissions) {
  let perms = {...state.permissionsByKind[kind]}
  if ('namespaces' in permissions) {
    perms.namespaces = {...perms.namespaces, ...permissions.namespaces}
  }
  perms.namespaced = perms.namespaced || permissions.namespaced || !!permissions.namespaces
  let newState = {...state}
  newState.permissionsByKind[kind] = perms
  return newState
}