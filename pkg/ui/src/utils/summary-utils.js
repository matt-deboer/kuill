import { convertUnits } from '../converters'


/**
 * Computes the totals for all resource kinds in the selected namespaces;
 * if selectedNamespaces is empty, the counts for all (visible) kinds
 * is computed.
 * 
 * @param {*} resources 
 * @param {*} selectedNamespaces 
 */
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

export function calculateMetrics(clusterMetrics, namespaceMetrics, selectedNamespaces, resourceQuotas) {
  
  let namespacesFiltered = (Object.keys(selectedNamespaces).length > 0)
  
  const stats = {
    cpu: {
      usage: 0,
      requestsUsage: 0,
      limitsUsage: 0,
      requestsTotal: 0,
      limitsTotal: 0,
      total: 0,
      units: '',
      ratio: 0,
      shareTotal: true,
    },
    memory: {
      usage: 0,
      requestsUsage: 0,
      limitsUsage: 0,
      requestsTotal: 0,
      limitsTotal: 0,
      total: 0,
      units: '',
      ratio: 0,
      shareTotal: true,
    },
    disk: {
      usage: 0,
      requestsUsage: 0,
      limitsUsage: 0,
      requestsTotal: 0,
      limitsTotal: 0,
      total: 0,
      units: '',
      ratio: 0,
      shareTotal: true,
    },
    volumes: {
      usage: 0,
      requestsUsage: 0,
      limitsUsage: 0,
      requestsTotal: 0,
      limitsTotal: 0,
      total: 0,
      units: '',
      ratio: 0,
    },
    netRx: {
      usage: 0,
      requestsUsage: 0,
      limitsUsage: 0,
      requestsTotal: 0,
      limitsTotal: 0,
      total: 0,
      units: '',
      ratio: 0,
      shareTotal: true,
    },
    netTx: {
      usage: 0,
      requestsUsage: 0,
      limitsUsage: 0,
      requestsTotal: 0,
      limitsTotal: 0,
      total: 0,
      units: '',
      ratio: 0,
      shareTotal: true,
    },
  }

  if (!!resourceQuotas) {
    for (let ns in resourceQuotas) {
      if (ns in selectedNamespaces) {
        let q = resourceQuotas[ns]
        for (let s in stats) {
          applyQuota(stats, s, q)
        }
      }
    }
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
        stat.ratio = convertUnits(stat.ratio, statUnit.baseUnit, statUnit.targetUnit)
      } else {
        stat.usage = convertUnits(stat.usage, statUnit.baseUnit, statUnit.targetUnit)
        stat.total = convertUnits(stat.total, statUnit.baseUnit, statUnit.targetUnit)
        stat.requestsUsage = convertUnits(stat.requestsUsage, statUnit.baseUnit, statUnit.targetUnit)
        stat.requestsTotal = convertUnits(stat.requestsTotal, statUnit.baseUnit, statUnit.targetUnit)
        stat.limitsUsage = convertUnits(stat.limitsUsage, statUnit.baseUnit, statUnit.targetUnit)
        stat.limitsTotal = convertUnits(stat.limitsTotal, statUnit.baseUnit, statUnit.targetUnit)
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

function applyQuota(stats, stat, q) {
  if (stat in q) {
    stats[stat].requestsUsage += (q[stat].requests.used || 0)
    stats[stat].limitsUsage += (q[stat].limits.used || 0)
    stats[stat].requestsTotal += (q[stat].requests.total || 0)
    stats[stat].limitsTotal += (q[stat].limits.total || 0)
    // if (stats[stat].shareTotal) {
    //   stats[stat].total = (m[stat].total || 0)
    // } else {
    //   stats[stat].total += (m[stat].total || 0)
    // }
  }
}
