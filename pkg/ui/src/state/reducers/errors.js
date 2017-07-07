import { types } from '../actions/errors'

const initialState = {
  errors: [],
}

var errorId = 0

export default (state = initialState, action) => {
  switch (action.type) {
    
    case types.ADD_ERROR:
      return doAddError(state, action.error, action.severity, 
          action.message, action.retryText, action.retryAction)
    case types.CLEAR_ERRORS:
      return doClearErrors(state, action.errors)

    default:
      return state;
  }
}


function doAddError(state, error, severity, message, retryText, retryAction) {
  let err = {
    id: ++errorId,
    object: error,
    severity: severity,
    message: message,
    retry : {
      text: retryText,
      action: retryAction,
    }
  }
  let errors = state.errors.slice(0)
  errors.splice(0, 0, err)
  return {...state, errors: errors}
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