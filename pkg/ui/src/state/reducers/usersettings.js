import { types } from '../actions/usersettings'

const userSettings = 'user_settings'

const savedState = JSON.parse(localStorage.getItem(userSettings))
const initialState = (savedState || {
  // a map[string]=> bool of namespaces currently selected
  // an empty map should be treated as ALL instead of NONE
  selectedNamespaces: {},
  // a map[string]=> bool of namespaces currently selected
  // an empty map should be treated as ALL instead of NONE
  selectedKinds: {},
  revision: 0,
})

export default (state = initialState, action) => {
  switch (action.type) {
    
    case types.SELECT_NAMESPACES:
      return doSelect(state, action.namespaces)

    case types.PUT_SETTINGS:
      return doSelect(state, action.namespaces, action.kinds, action.save)

    default:
      return state
  }
}

function doSelect(state, namespaces, kinds, save) {
  let newState = {
    selectedNamespaces: namespaces || state.selectedNamespaces,
    selectedKinds: kinds || state.selectedKinds,
    revision: state.revision+1,
  }

  if (save) {
    localStorage.setItem(userSettings, JSON.stringify(newState))
  }

  return newState
}