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
  return {
    type: types.INITIALIZE,
    user: user,
    authMethod: authMethod,
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