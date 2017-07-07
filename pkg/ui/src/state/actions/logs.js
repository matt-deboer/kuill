export var types = {}
for (let type of [
  'SELECT_LOGS_FOR',
]) {
  types[type] = `logs.${type}`
}

export function selectLogsFor(podContainers) {
  return {
    type: types.SELECT_LOGS_FOR,
    podContainers: podContainers,
  }
}
