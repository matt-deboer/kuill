import { defaultFetchParams, sleep } from '../../utils/request-utils'
import { invalidateSession } from './session'

export var types = {}
for (let type of [
  'RECEIVE_METRICS',
  'START_FETCHING',
  'DONE_FETCHING',
]) {
  types[type] = `metrics.${type}`
}

/**
 * Request metrics
 */
export function requestMetrics(clusterResources) {
  return async function (dispatch, getState) {
    doFetch(dispatch, getState, async () => {
      await fetchMetrics(dispatch, getState, clusterResources)
    })
  }
}

/**
 * Wraps any fetch request with proper setting of the `isFetching`
 * guards, and applies any fetchBackoff value.
 * 
 * @param {*} dispatch 
 * @param {*} getState 
 * @param {*} request 
 */
async function doFetch(dispatch, getState, request) {
  if (getState().cluster.isFetching) {
    console.warn(`doFetch called while already fetching...`)
  }
  dispatch({ type: types.START_FETCHING })
  let { fetchBackoff } = getState().cluster
  await sleep(fetchBackoff).then(request)
  dispatch({ type: types.DONE_FETCHING })
}

async function fetchMetrics(dispatch, getState, clusterResources) {
  await fetch('/metrics', defaultFetchParams)
    .then(resp => {
    if (!resp.ok) {
      if (resp.status === 401) {
        dispatch(invalidateSession())
      }
    } else {
      return resp.json()
    }
  }).then(metrics => {
    dispatch({ type: types.RECEIVE_METRICS, metrics: metrics, clusterResources: clusterResources})
  })
}