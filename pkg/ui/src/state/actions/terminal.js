export var types = {}
for (let type of [
  'SELECT_TERMINAL_FOR',
]) {
  types[type] = `terminal.${type}`
}

export function selectTerminalFor(podContainer) {
  return {
    type: types.SELECT_TERMINAL_FOR,
    podContainer: podContainer,
  }
}
