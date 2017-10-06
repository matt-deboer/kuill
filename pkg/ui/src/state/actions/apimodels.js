import { defaultFetchParams } from '../../utils/request-utils'
import { doRequest } from './requests'
import KubeKinds from '../../kube-kinds'
import { invalidateSession } from './session'
import { addError } from './errors'

export var types = {}
for (let type of [
  'RECEIVE_MODELS',
  'RECEIVE_SWAGGER',
]) {
  types[type] = `apimodels.${type}`
}

export function requestSwagger() {
  return async function (dispatch, getState) {
    return doRequest(dispatch, getState, 'fetchSwagger', async () => {
      return await fetchSwagger(dispatch, getState)
    })
  }
}

/**
 */
export function requestModels() {
  return async function (dispatch, getState) {
    doRequest(dispatch, getState, 'fetchResources', async () => {
      await fetchModels(dispatch, getState)
    })
  }
}

async function fetchModels(dispatch, getState) {
  
  let modelURLs = {}
  for (let g in KubeKinds) {
    let group = KubeKinds[g]
    for (let name in group) {
      let kind = group[name]
      modelURLs[`/proxy/swaggerapi/${kind.base}`]=true
    }
  }
  
  let urls = Object.keys(modelURLs)

  let requests = urls.map(url => fetch(url, defaultFetchParams
    ).then(resp => {
        if (!resp.ok) {
          if (resp.status === 401) {
            dispatch(invalidateSession())
          // } else if (resp.status === 404) {
            // dispatch(disableResourceKind(kind))
          } else {
            dispatch(addError(resp,'error',`Failed to fetch ${url}: ${resp.statusText}`,
              'Try Again', () => { dispatch(requestModels()) } ))
          }
          return resp
        } else {
          return resp.json()
        }
      }
  ))

  let results = await Promise.all(requests)
  let modelsByAPIGroup = {}

  for (var i=0, len=results.length; i < len; ++i) {
    var result = results[i]

    if ('models' in result) {
      modelsByAPIGroup[result.resourcePath] = result.models
    } else {
      let url = urls[i][1]
      let msg = `result for ${url} returned error code ${result.code}: "${result.message}"`
      console.error(msg)
    }
  }

  dispatch({
    type: types.RECEIVE_MODELS,
    models: modelsByAPIGroup,
  })
}

async function fetchSwagger(dispatch, getState) {
  
  let url = `/proxy/swagger.json`
  let swagger = await fetch(url, defaultFetchParams)
    .then(resp => {
        if (!resp.ok) {
          if (resp.status === 401) {
            dispatch(invalidateSession())
          // } else if (resp.status === 404) {
            // dispatch(disableResourceKind(kind))
          } else {
            dispatch(addError(resp,'error',`Failed to fetch ${url}: ${resp.statusText}`,
              'Try Again', () => { dispatch(requestModels()) } ))
          }
          return resp
        } else {
          return resp.json()
        }
      })

  if ('definitions' in swagger) {
    dispatch({
      type: types.RECEIVE_SWAGGER,
      swagger: swagger,
    })
  } else {
    let msg = `result for ${url} returned error code ${swagger.code}: "${swagger.message}"`
    console.error(msg)
  }
  return swagger
}