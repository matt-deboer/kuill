export var types = {}
for (let type of [
  'SELECT_NAMESPACES',
]) {
  types[type] = `usersettings.${type}`
}

export function selectNamespaces(namespaces, save) {
  return async function (dispatch, getState) {
    dispatch({
      type: types.SELECT_NAMESPACES,
      namespaces: namespaces,
      save: save,
    })
  }
}