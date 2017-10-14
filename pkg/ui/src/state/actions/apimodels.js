import { defaultFetchParams } from '../../utils/request-utils'
import { doRequest } from './requests'
import { invalidateSession } from './session'
import { addError } from './errors'

export var types = {}
for (let type of [
  'RECEIVE_MODELS',
  'RECEIVE_SWAGGER',
  'RECEIVE_KINDS',
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
export function requestKinds() {
  return async function (dispatch, getState) {
    doRequest(dispatch, getState, 'fetchResources', async () => {
      await fetchKinds(dispatch, getState)
    })

    if (!getState().apimodels.swagger) {
      await requestSwagger()(dispatch, getState)
    }
  }
}


async function fetchKinds(dispatch, getState) {
  
  let url = '/kinds'
  await fetch(url, defaultFetchParams)
    .then(resp => {
      if (!resp.ok) {
        if (resp.status === 401) {
          dispatch(invalidateSession())
        } else if (resp.status !== 403) {
          dispatch(addError(resp,'error',`Failed to fetch kinds at ${url}: ${resp.statusText}`,
            'Try Again', () => { dispatch(requestKinds()) } ))
        }
        return resp
      } else {
        return resp.json()
      }
    })
    .then(json => {
      if ('items' in json) {
        dispatch({
          type: types.RECEIVE_KINDS,
          kinds: json.items,
        })
      } else {
        dispatch(addError(json,'error',`Failed to fetch kinds at ${url}: ${json.message}`,
          'Try Again', () => { dispatch(requestKinds()) } ))
      }
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