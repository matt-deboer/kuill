import { types } from '../actions/usersettings'

const initialState = {
  // a map[string]=> bool of namespaces currently selected
  // an empty map should be treated as ALL instead of NONE
  selectedNamespaces: {},
}

export default (state = initialState, action) => {
  switch (action.type) {
    
    case types.SELECT_NAMESPACES:
      return {...state, selectedNamespaces: action.namespaces}

    default:
      return state
  }
}
