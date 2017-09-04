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
  if (getState().requests.isFetching[name]) {
    console.warn(`doRequest called while already fetching '${name}'...`)
  }
  dispatch({ type: types.START_FETCHING, request: name })
  let fetchBackoff = getState().requests.fetchBackoff[name] || 0
  await sleep(fetchBackoff).then(request)
  dispatch({ type: types.DONE_FETCHING, request: name })
}

export async function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}