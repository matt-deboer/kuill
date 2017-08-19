
export function calculateTotals(resources, selectedNamespaces) {
  let countsByKind = {}
  let namespacesFiltered = (Object.keys(selectedNamespaces).length > 0)
  for (let key in resources) {
    let resource = resources[key]
    if (!namespacesFiltered || resource.metadata.namespace in selectedNamespaces) {
      countsByKind[resource.kind] = (countsByKind[resource.kind] || 0) + 1
    }
  }
  return countsByKind
}

const statUnits = {
  cpu: {
    baseUnit: 'millicores',
    targetUnit: 'cores',
  },
  memory: {
    baseUnit: 'bytes',
    targetUnit: 'gibibytes',
  },
  disk: {
    baseUnit: 'bytes',
    targetUnit: 'gibibytes',
  },
  volumes: {
    baseUnit: 'bytes',
    targetUnit: 'gibibytes',
  },
  netRx: {
    baseUnit: 'bytes/sec',
    targetUnit: 'kibibytes/sec',
  },
  netTx: {
    baseUnit: 'bytes/sec',
    targetUnit: 'kibibytes/sec',
  },
}

export function calculateMetrics(clusterMetrics, namespaceMetrics, selectedNamespaces, allNamespaces) {
  
  let namespacesFiltered = (Object.keys(selectedNamespaces).length > 0)
  
  const stats = {
    cpu: {
      usage: 0,
      total: 0,
      units: '',
      ratio: 0,
      shareTotal: true,
    },
    memory: {
      usage: 0,
      total: 0,
      units: '',
      ratio: 0,
      shareTotal: true,
    },
    disk: {
      usage: 0,
      total: 0,
      units: '',
      ratio: 0,
      shareTotal: true,
    },
    volumes: {
      usage: 0,
      total: 0,
      units: '',
      ratio: 0,
    },
    netRx: {
      usage: 0,
      total: 0,
      units: '',
      ratio: 0,
      shareTotal: true,
    },
    netTx: {
      usage: 0,
      total: 0,
      units: '',
      ratio: 0,
      shareTotal: true,
    },
  }

  if (!!namespaceMetrics) {
    for (let ns in namespaceMetrics) {
      if (!namespacesFiltered || ns in selectedNamespaces) {
        let m = namespaceMetrics[ns]
        for (let s in stats) {
          accumulateStats(stats, s, m)
        }
      }
    }
  } else {
    return stats
  }

  for (let s in stats) {
    let stat = stats[s]
    stat.ratio = stat.total === 0 ? 0 : (stat.usage / stat.total)

    let statUnit = statUnits[s]
    if ('targetUnit' in statUnit) {
      if (statUnit.targetUnit.includes('/')) {
        stat.ratio = convert(stat.ratio, statUnit.baseUnit, statUnit.targetUnit)
      } else {
        stat.usage = convert(stat.usage, statUnit.baseUnit, statUnit.targetUnit)
        stat.total = convert(stat.total, statUnit.baseUnit, statUnit.targetUnit)
      }
      stat.units = statUnit.targetUnit
    }
  }
  return stats
}

function accumulateStats(stats, stat, m) {
  if (stat in m) {
    stats[stat].usage += (m[stat].usage || 0)
    if (stats[stat].shareTotal) {
      stats[stat].total = (m[stat].total || 0)
    } else {
      stats[stat].total += (m[stat].total || 0)
    }
  }
}

function convert(value, baseUnit, targetUnit) {
  let base = baseUnit.split('/')
  let target = targetUnit.split('/')
  
  if (base.length !== target.length) {
    return value
  } else {
    let v = value
    for (let i=0; i < base.length; ++i) {
      let bu = base[i]
      let tu = target[i]
      if (bu !== tu) {
        switch (bu) {
          case "bytes":
            switch (tu) {
              case "kibibytes":
                v = v / 1024
                break
              case "mebibytes":
                v = v / ( 1024 * 1024 )
                break
              case "gibibytes":
                v = v / ( 1024 * 1024 * 1024 )
                break
              default:
            }
            break
          case "cores":
            switch (tu) {
              case "millicores":
                v = v * 1000
                break
              default:
            }
            break
          case "millicores":
            switch (tu) {
              case "cores":
              v = v / 1000
              break
              default:
            }
            break
          default:
        }
      }
    }
    return v
  }
}