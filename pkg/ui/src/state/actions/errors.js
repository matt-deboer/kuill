export var types = {}
for (let type of [
  'ADD_ERROR',
  'CLEAR_ERRORS',
]) {
  types[type] = `errors.${type}`
}

export function addError(error, severity, message, retryText, retryAction) {
  return {
    type: types.ADD_ERROR,
    error: error,
    severity: severity,
    message: message,
    retryText: retryText,
    retryAction: retryAction,
  }
}

export function clearErrors(...errors) {
  return {
    type: types.CLEAR_ERRORS,
    errors: errors,
  }
}
