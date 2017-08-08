import { types } from '../actions/metrics'

const initialState = {
  cluster: null,
  namespace: null,
  node: null,
  revision: 0,
}

export default (state = initialState, action) => {
  switch (action.type) {
    
    case types.RECEIVE_METRICS:
      return doComputeMetrics(state, action.metrics, action.clusterResources)

    case types.START_FETCHING:
      return {...state, isFetching: true}

    case types.DONE_FETCHING:
      return {...state, isFetching: false}

    default:
      return state;
  }
}

function doComputeMetrics(state, metrics) {
  if (!!metrics) {
    return  {...state, 
      namespace: metrics.namespace,
      node: metrics.node, 
      cluster: metrics.cluster,
      revision: state.revision + 1,
    }
  }
  return state
}