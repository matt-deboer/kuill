import { applyGlobalFilters } from './resources'

export var types = {}
for (let type of [
  'SELECT_NAMESPACES',
  'PUT_SETTINGS',
]) {
  types[type] = `usersettings.${type}`
}

export function selectNamespaces(namespaces) {
  return function(dispatch, getState) {
    
    dispatch({
      type: types.SELECT_NAMESPACES,
      namespaces: namespaces,
    })

    dispatch(applyGlobalFilters(namespaces))
  }
}

export function updateSettings(namespaces, kinds, save) {
  return function(dispatch, getState) {
    
    dispatch({
      type: types.PUT_SETTINGS,
      namespaces: namespaces,
      kinds: kinds,
      save: save,
    })

    dispatch(applyGlobalFilters(namespaces, kinds))
  }
}