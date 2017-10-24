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

export function requestSwagger(force) {
  return async function (dispatch, getState) {
    let swagger = getState().apimodels.swagger
    if (force || !swagger) {
      await doRequest(dispatch, getState, 'swagger', async () => {
        return await fetchSwagger(dispatch, getState)
      })
      swagger = getState().apimodels.swagger
    } 
    return swagger
  }
}

/**
 */
export function requestKinds(force) {
  return async function (dispatch, getState) {
    let kinds = getState().apimodels.kinds
    if (force || !kinds) {
      await doRequest(dispatch, getState, 'kinds', async () => {
        return await fetchKinds(dispatch, getState)
      })
      kinds = getState().apimodels.kinds
    }

    if (!getState().apimodels.swagger) {
      dispatch(requestSwagger())
    }
    return kinds
  }
}


async function fetchKinds(dispatch, getState) {
  
  let url = '/kinds'
  let kinds = await fetch(url, defaultFetchParams)
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
        return json.items
      } else {
        dispatch(addError(json,'error',`Failed to fetch kinds at ${url}: ${json.message}`,
          'Try Again', () => { dispatch(requestKinds()) } ))
      }
    })

  if (kinds) {
    await dispatch({
      type: types.RECEIVE_KINDS,
      kinds: kinds,
    })
    kinds = getState().apimodels.kinds
  }
  return kinds
}

async function fetchSwagger(dispatch, getState) {
  
  let url = `/proxy/swagger.json`
  let swagger = await fetch(url, defaultFetchParams)
    .then(resp => {
        if (!resp.ok) {
          if (resp.status === 401) {
            dispatch(invalidateSession())
          } else {
            dispatch(addError(resp,'error',`Failed to fetch ${url}: ${resp.statusText}`,
              'Try Again', () => { dispatch(requestSwagger()) } ))
          }
          return resp
        } else {
          return resp.json()
        }
      })

  if ('definitions' in swagger) {
    return dispatch({
      type: types.RECEIVE_SWAGGER,
      swagger: swagger,
    })
  } else {
    let msg = `result for ${url} returned error code ${swagger.code}: "${swagger.message}"`
    console.error(msg)
  }
  return swagger
}