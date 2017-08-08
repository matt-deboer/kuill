import math from 'mathjs'

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

math.createUnit('cores', {prefixes: 'long'})

export function calculateMetrics(clusterMetrics, namespaceMetrics, selectedNamespaces) {
  
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
  // if (namespacesFiltered && Object.keys(namespaceMetrics).length > 0) {
     
  // } else if (!!clusterMetrics && Object.keys(clusterMetrics).length > 0) {
  //   for (let s in stats) {
  //     let m = clusterMetrics
  //     accumulateStats(stats, s, m)
  //   }
  // } else {
  //   return stats
  // }

  for (let s in stats) {
    let stat = stats[s]
    stat.ratio = (stat.usage / stat.total)

    let statUnit = statUnits[s]
    if ('targetUnit' in statUnit) {
      if (statUnit.targetUnit.includes('/')) {
        stat.ratio = math.unit(`${stat.ratio} ${statUnit.baseUnit}`).toNumber(statUnit.targetUnit)
      } else {
        stat.usage = math.unit(`${stat.usage} ${statUnit.baseUnit}`).toNumber(statUnit.targetUnit)
        stat.total = math.unit(`${stat.total} ${statUnit.baseUnit}`).toNumber(statUnit.targetUnit)
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