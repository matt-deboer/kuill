import { defaultFetchParams } from '../../utils/request-utils'
import { invalidateSession } from './session'
import { doRequest } from './requests'

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
    doRequest(dispatch, getState, 'metrics', async () => {
      await fetchMetrics(dispatch, getState, clusterResources)
    })
  }
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