export var types = {}
for (let type of [
  'START_FETCHING',
  'DONE_FETCHING',
]) {
  types[type] = `requests.${type}`
}

/**
 * Wraps any request, storing the fetching state based on the
 * name (if provided), and returning the same request handle
 * if multiple requests are made under the same name before
 * the request completes.
 * 
 * @param {*} dispatch 
 * @param {*} getState 
 * @param {*} name | request
 * @param {*} request 
 */
export async function doRequest(dispatch, getState, name, request) {
  
  let storeHandle = (typeof name === 'string')
  let requestHandle = storeHandle && getState().requests.fetching[name]
  let newRequest = !!request && !requestHandle
  if (!storeHandle) {
    requestHandle = name()
  }
  if (newRequest) {
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