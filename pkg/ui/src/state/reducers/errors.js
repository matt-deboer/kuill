import { types } from '../actions/errors'
import { types as session } from '../actions/session'

const initialState = {
  errors: [],
  latestError: null,
}

export default (state = initialState, action) => {
  switch (action.type) {
    case session.INVALIDATE:
      return initialState
    case types.ADD_ERROR:
      return doAddError(state, action.error, action.id, action.severity, 
          action.message, action.retryText, action.retryAction)    
    case types.CLEAR_ERRORS:
      return doClearErrors(state, action.errors)

    default:
      return state;
  }
}

function doAddError(state, error, id, severity, message, retryText, retryAction) {
  let err = {
    id: id,
    object: error,
    severity: severity,
    message: message,
    retry : {
      text: retryText,
      action: retryAction && retryAction.bind(null,{id: id})
    }
  }
  let errors = state.errors.slice(0)
  errors.splice(0, 0, err)
  return {...state, 
    errors: errors,
    latestError: err,
  }
}

function doClearErrors(state, errors) {
  let errs = []
  let ids = {}
  for (let err of errors) {
    ids[err.id] = true
  }
  for (let err of state.errors) {
    if (!(err.id in ids)) {
      errs.push(err)
    }
  }
  return {...state, errors: errs}

}