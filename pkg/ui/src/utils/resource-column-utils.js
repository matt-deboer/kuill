import React from 'react'
import IconMore from 'material-ui/svg-icons/navigation/more-horiz'
import { toHumanizedAge, convertUnits } from '../converters'
import { resourceStatus as resourceStatusIcons } from '../components/icons'

const styles = {
  statusIcon: {
    marginLeft: 10,
  },
}

export function renderResourceCell(column, resource, podMetrics) {
  switch(column) {
    case 'name':
      return resource.metadata.name
    case 'namespace':
      return resource.metadata.namespace
    case 'kind':
      return resource.kind
    case 'actions':
      return <IconMore color={'rgba(0,0,0,0.4)'} hoverColor={'rgba(0,0,0,0.87)'} data-rh="Actions..."/>
    case 'age':
      let age = Date.now() - Date.parse(resource.metadata.creationTimestamp)
      return toHumanizedAge(age)
    case 'status':
      return <div style={styles.statusIcon}>{resourceStatusIcons[resource.statusSummary]}</div>
    case 'pods':
      if (resource.kind === 'Deployment' || resource.kind === 'ReplicaSet' || resource.kind === 'ReplicationController') {
        return `${(resource.status.readyReplicas || 0)} / ${resource.spec.replicas}`
      } else if (resource.kind === 'StatefulSet') {
        return `${(resource.status.replicas || 0)} / ${resource.spec.replicas}`
      } else {
        return ''
      }
    case 'cpu_utilized':
      if (podMetrics) {
        if (resource.kind === 'Pod') {
          let podKey = `${resource.metadata.namespace}/${resource.metadata.name}`
          let podStats = podMetrics[podKey]
          if (!!podStats) {
            return convertUnits(podStats.cpu.usage, 'millicores', 'cores', 2)
          }
        } else if (resource.owned) {
          let total = 0
          let count = 0
          let owned = Object.values(resource.owned)
          while (owned.length) {
            let r = owned.shift()
            if (r.owned) {
              owned.push(...Object.values(r.owned))
            } else {
              let podKey = `${r.metadata.namespace}/${r.metadata.name}`
              let podStats = podMetrics[podKey]
              if (!!podStats) {
                total += convertUnits(podStats.cpu.usage, 'millicores', 'cores')
                count++
              }
            }
          }
          return (total / count).toFixed(2)
        }
      }
      return ''
    case 'mem_utilized':
      if (podMetrics) {
        if (resource.kind === 'Pod') {
          let podKey = `${resource.metadata.namespace}/${resource.metadata.name}`
          let podStats = podMetrics[podKey]
          if (!!podStats) {
            return convertUnits(podStats.memory.usage, 'bytes', 'gibibytes', 1)
          }
        } else if (resource.owned) {
          let total = 0
          let count = 0
          let owned = Object.values(resource.owned)
          while (owned.length) {
            let r = owned.shift()
            if (r.owned) {
              owned.push(...Object.values(r.owned))
            } else {
              let podKey = `${r.metadata.namespace}/${r.metadata.name}`
              let podStats = podMetrics[podKey]
              if (!!podStats) {
                total += convertUnits(podStats.memory.usage, 'bytes', 'gibibytes')
                count++
              }
            }
          }
          return (total / count).toFixed(1)
        }
      }
      return ''
    case 'disk_utilized':
      if (podMetrics) {
        if (resource.kind === 'Pod') {
          let podKey = `${resource.metadata.namespace}/${resource.metadata.name}`
          let podStats = podMetrics[podKey]
          if (!!podStats) {
            return convertUnits(podStats.disk.usage, 'bytes', 'gibibytes', 1)
          }
        } else if (resource.owned) {
          let total = 0
          let count = 0
          let owned = Object.values(resource.owned)
          while (owned.length) {
            let r = owned.shift()
            if (r.owned) {
              owned.push(...Object.values(r.owned))
            } else {
              let podKey = `${r.metadata.namespace}/${r.metadata.name}`
              let podStats = podMetrics[podKey]
              if (!!podStats) {
                total += convertUnits(podStats.disk.usage, 'bytes', 'gibibytes')
                count++
              }
            }
          }
          return (total / count).toFixed(1)
        }
      }
      return ''
    default:
      return ''
  }
}

export function getResourceCellValue(column, resource, podMetrics) {
  switch(column) {
    case 'id':
      return resource.key
    case 'name':
      return resource.metadata.name
    case 'namespace':
      return resource.metadata.namespace
    case 'kind':
      return resource.kind
    case 'age':
      return resource.metadata.creationTimestamp
    case 'status':
      return resource.statusSummary
    case 'pods':
      if (resource.kind === 'Deployment' || resource.kind === 'ReplicaSet' || resource.kind === 'ReplicationController') {
        return (resource.status.readyReplicas || 0)
      } else if (resource.kind === 'StatefulSet') {
        return (resource.status.replicas || 0)
      } else {
        return -1
      }
    case 'cpu_utilized':
      if (podMetrics) {
        if (resource.kind === 'Pod') {
          let podKey = `${resource.metadata.namespace}/${resource.metadata.name}`
          let podStats = podMetrics[podKey]
          if (!!podStats) {
            return convertUnits(podStats.cpu.usage, 'millicores', 'cores', 2)
          }
        } else if (resource.owned) {
          let total = 0
          let count = 0
          let owned = Object.values(resource.owned)
          while (owned.length) {
            let r = owned.shift()
            if (r.owned) {
              owned.push(...Object.values(r.owned))
            } else {
              let podKey = `${r.metadata.namespace}/${r.metadata.name}`
              let podStats = podMetrics[podKey]
              if (!!podStats) {
                total += convertUnits(podStats.cpu.usage, 'millicores', 'cores')
                count++
              }
            }
          }
          return (total / count).toFixed(2)
        }
      }
      return -1
    case 'mem_utilized':
      if (podMetrics) {
        if (resource.kind === 'Pod') {
          let podKey = `${resource.metadata.namespace}/${resource.metadata.name}`
          let podStats = podMetrics[podKey]
          if (!!podStats) {
            return convertUnits(podStats.memory.usage, 'bytes', 'gibibytes', 1)
          }
        } else if (resource.owned) {
          let total = 0
          let count = 0
          let owned = Object.values(resource.owned)
          while (owned.length) {
            let r = owned.shift()
            if (r.owned) {
              owned.push(...Object.values(r.owned))
            } else {
              let podKey = `${r.metadata.namespace}/${r.metadata.name}`
              let podStats = podMetrics[podKey]
              if (!!podStats) {
                total += convertUnits(podStats.memory.usage, 'bytes', 'gibibytes')
                count++
              }
            }
          }
          return (total / count).toFixed(1)
        }
      }
      return -1
    case 'disk_utilized':
      if (podMetrics) {
        if (resource.kind === 'Pod') {
          let podKey = `${resource.metadata.namespace}/${resource.metadata.name}`
          let podStats = podMetrics[podKey]
          if (!!podStats) {
            return convertUnits(podStats.disk.usage, 'bytes', 'gibibytes', 1)
          }
        } else if (resource.owned) {
          let total = 0
          let count = 0
          let owned = Object.values(resource.owned)
          while (owned.length) {
            let r = owned.shift()
            if (r.owned) {
              owned.push(...Object.values(r.owned))
            } else {
              let podKey = `${r.metadata.namespace}/${r.metadata.name}`
              let podStats = podMetrics[podKey]
              if (!!podStats) {
                total += convertUnits(podStats.disk.usage, 'bytes', 'gibibytes')
                count++
              }
            }
          }
          return (total / count).toFixed(1)
        }
      }
      return -1
    default:
      return ''
  }
}