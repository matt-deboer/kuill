export var types = {}
for (let type of [
  'ADD_ERROR',
  'CLEAR_ERRORS',
  'CLEAR_LATEST',
]) {
  types[type] = `errors.${type}`
}

var nextErrorId = 0

export function addError(error, severity, message, retryText, retryAction) {
  
  return function(dispatch, getState) {
    
    let errorId = ++nextErrorId
    let action = null
    if (!!retryAction) {
      // wrap the retry action in a function which first clears the associated error
      action = function(error) {
        dispatch(clearErrors(error))
        retryAction()
      }
    }

    dispatch({
      type: types.ADD_ERROR,
      error: error,
      id: errorId,
      severity: severity,
      message: message,
      retryText: retryText,
      retryAction: action,
    })
  }
}

export function clearLatestError() {
  return {
    type: types.CLEAR_LATEST,
  }
}

export function clearErrors(...errors) {
  return {
    type: types.CLEAR_ERRORS,
    errors: errors,
  }
}
