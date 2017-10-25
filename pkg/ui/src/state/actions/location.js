import { routerActions } from 'react-router-redux'
import queryString from 'query-string'

export var types = {}
for (let type of [
]) {
  types[type] = `location.${type}`
}

export function tryGoBack() {
  return async function (dispatch, getState) {
    let state = getState()
    if (state.location.previous && state.location.current.pathname !== state.location.previous.pathname) {
      dispatch(routerActions.goBack())
    } else {
      let query = queryString.parse(state.location.current.search)
      if (query.view && query.view === 'edit') {
        query.view = 'config'
        dispatch(routerActions.replace(`${state.location.current.pathname}?${queryString.stringify(query)}`))
      } else if (state.location.current.pathname.endsWith('/new')) {
        let backPath = `/${state.location.current.pathname.split('/')[1]}`
        dispatch(routerActions.replace(backPath))
      }
    }
  }
}