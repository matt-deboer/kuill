export var types = {}
for (let type of [
  'START_FETCHING',
  'DONE_FETCHING',
]) {
  types[type] = `logs.${type}`
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
  if (getState().requests.fetching[name]) {
    console.warn(`doRequest called while already fetching '${name}'...`)
  }
  dispatch({ type: types.START_FETCHING, name: name })
  let fetchBackoff = getState().requests.fetchBackoff[name] || 0
  let result = await sleep(fetchBackoff).then(request)
  dispatch({ type: types.DONE_FETCHING, name: name })
  return result
}

export async function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}