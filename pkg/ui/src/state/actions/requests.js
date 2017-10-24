export var types = {}
for (let type of [
  'START_FETCHING',
  'DONE_FETCHING',
]) {
  types[type] = `requests.${type}`
}

/**
 * Wraps any fetch request with proper setting of the `isFetching`
 * guards, and applies any fetchBackoff value.
 * 
 * @param {*} dispatch 
 * @param {*} getState 
 * @param {*} request 
 */
export async function doRequest(dispatch, getState, name, request) {
  
  let requestHandle = getState().requests.fetching[name]
  let newRequest = !requestHandle
  if (!requestHandle) {
    let fetchBackoff = getState().requests.fetchBackoff[name] || 0
    requestHandle = sleep(fetchBackoff).then(request)
    dispatch({ type: types.START_FETCHING, name: name, request: requestHandle})
  }

  let result = await requestHandle
  if (newRequest) {
    dispatch({ type: types.DONE_FETCHING, name: name })
  }
  return result
}

export async function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}