/**
 * Returns true if the 2 resources references are the same
 * resource based only on name, namespace and kind
 * 
 * @param {*} res1 
 * @param {*} res2 
 */
export function sameResource(res1, res2) {
  if (!!res1 && !!res2 && !!res1.key && !!res2.key) {
    return res1.key === res2.key
  } 
  
  return (!!res1 === !!res2) 
      && (!res1
          || (res1.kind === res2.kind
              && res1.metadata.namespace === res2.metadata.namespace
              && res1.metadata.name === res2.metadata.name))
}

/**
 * Returns true if the provided resource is owned (either directly
 * or transitively) by the specified owner resource.
 * 
 * @param {Object} resources the set of all resources
 * @param {Object} resource the resource to test against owner
 * @param {Object} owner the owner or transitive owner of the specified resource
 */
export function isResourceOwnedBy(resources, resource, owner) {
  
  if (!!resource && !!owner) {
    
    let owners = [owner]
    while (owners.length) {
        let target = owners.shift()
        if (!!target.owned) {
            if (resource.key in target.owned) {
                return true
            } else {
                for (let key in target.owned) {
                    owners.push(target.owned[key])
                }
            }
        }
    }
  }
  return false
}

/**
 * Returns a key suitable for uniquely identifying a given resource
 * 
 * @param {*} resource 
 * @param {String} namespace (optional) fallback value for missing namespace
 */
export function keyForResource(resource, namespace) {
    if (!!resource) {
        let ns = resource.namespace || (resource.metadata && resource.metadata.namespace) || namespace || "~"
        let name = resource.name || resource.metadata.name
        return `${resource.kind}/${ns}/${name}`
    }
}

/**
 * Finds potential owners for a given resource, returning their
 * keys on order of proximity within the resource hierarchy
 * 
 * @param {Object} resources the set of all known resources
 * @param {Object} resource a resource (or ref) object
 * @param {String} namespace (optional) namespace in case the provided resource lacks one
 * @return {Array} of potential owners' keys for the resource, starting with
 * direct potential parent
 */
export function ownersForResource(resources, key, ownerKeys=[]) {

    let [kind, ns, name] = key.split('/')
    let nameSuffix = `${ns}/${stripLastSegment(name)}`
    switch(kind) {
        case 'Pod':
            let ownerKey = `ReplicationController/${nameSuffix}`
            if (ownerKey in resources) {
                return ownersForResource(resources, ownerKey, ownerKeys.concat(ownerKey))
            } else {
                ownerKey = `ReplicaSet/${nameSuffix}`
                return ownersForResource(resources, ownerKey, ownerKeys.concat(ownerKey))
            }
        case 'ReplicaSet':
            return ownersForResource(resources, `Deployment/${nameSuffix}`, ownerKeys.concat(`Deployment/${nameSuffix}`))
        default:
            return ownerKeys
    }
}

function stripLastSegment(name) {
    let parts = name.split('-')
    if (parts.length > 1) {
        parts.splice(-1,1)
        return parts.join('-')
    }
    return ''
}

var statuses = {
    'ok': 1,
    'none': 2,
    'scaling up': 3,
    'scaling down': 4,
    'disabled': 5,
    'warning': 6,
    'error': 7,
    'timed out': 8,
}

/**
 * A comparator for status values
 * @param {*} s1 
 * @param {*} s2 
 */
export function compareStatuses(s1,s2) {
    return statuses[s1] - statuses[s2]
}

/**
 * Selects events from the provided set of events that
 * either directly or transitively relate to the provided
 * resource
 * @param {*} events 
 * @param {*} resource 
 */
export function eventsForResource(events, resource) {
    let selected = []
    let owners = [resource]
    while (owners.length) {
      let owner = owners.shift()
      if (owner.key in events) {
        let eventsForOwner = events[owner.key]
        for (let name in eventsForOwner) {
          selected.push(eventsForOwner[name])
        }
      }
      if (!!owner.owned) {
        for (let key in owner.owned) {
          let owned = owner.owned[key]
          owners.push(owned)
        }
      }
    }
    // sort by timestamps
    selected.sort(function(a, b) { return -1 * a.object.lastTimestamp.localeCompare(b.object.lastTimestamp) })
    return selected
}

/**
 * Returns a single status summary enum for the provided resource
 * 
 * @param {*} resource 
 */
export function statusForResource(resource) {
    // TODO: can this be replaced with direct querys to kube status API?
    switch(resource.kind) {
        case 'ReplicaSet':
            if (resource.status.readyReplicas === resource.spec.replicas) {
                return 'ok'
            } else if (!resource.status.readyReplicas && resource.spec.replicas === 0) {
                return 'disabled'
            } else if (resource.status.readyReplicas < resource.spec.replicas) {
                return 'scaling up'
            } else if (resource.status.readyReplicas > resource.spec.replicas) {
                return 'scaling down'
            }
            break
        case 'Deployment': 
            if (resource.status.readyReplicas === resource.spec.replicas) {
                return 'ok'
            } else if (!resource.status.readyReplicas && resource.spec.replicas === 0) {
                return 'disabled'
            } else if ((resource.status.readyReplicas || 0) < resource.spec.replicas) {
                if (!!resource.status.conditions) {
                    for (let cond of resource.status.conditions) {
                        if (cond.type === 'Progressing' && cond.status === 'False') {
                            return 'timed out'
                        }
                    }
                }
                if (!!resource.status.unavailableReplicas) {
                     if (resource.status.unavailableReplicas === resource.status.replicas) {
                        return 'error'
                     } else {
                        return 'warning'
                     }
                }
                return 'scaling up'
            } else if (resource.status.readyReplicas > resource.spec.replicas) {
                return 'scaling down'
            }
            break
        case 'Pod':
            if (!resource.status.conditions) {
                return 'scaling up'
            } else {
                let cond = resource.status.conditions[0]
                if (cond.type === 'Initialized' && cond.status === 'True') {
                    return 'ok'
                } else if ((cond.type === 'Ready' || cond.type === 'PodScheduled')) {
                    if (cond.status === 'True') {
                        return 'scaling up'
                    } else {
                        return 'error'
                    }
                }
            }
            break
        case 'DaemonSet':
            if (resource.status.currentNumberScheduled === resource.status.desiredNumberScheduled) {
                return 'ok'
            } else if (resource.status.currentNumberScheduled > resource.status.desiredNumberScheduled) {
                return 'scaling up'
            } else if (resource.status.currentNumberScheduled < resource.status.desiredNumberScheduled) {
                return 'scaling down'
            }
            break
        case 'Service': case 'Endpoints': case 'Secret':
            return 'none'
        case 'ReplicationController':
            if (resource.status.readyReplicas === resource.spec.replicas) {
                return 'ok'
            } else if (!resource.status.readyReplicas && resource.spec.replicas === 0) {
                return 'disabled'
            } else if (resource.status.readyReplicas < resource.spec.replicas) {
                return 'scaling up'
            } else if (resource.status.readyReplicas > resource.spec.replicas) {
                return 'scaling down'
            }
            break
        case 'StatefulSet':
            if (resource.status.replicas === resource.spec.replicas) {
                return 'ok'
            } else if (!resource.status.replicas && resource.spec.replicas === 0) {
                return 'disabled'
            } else if (resource.status.replicas < resource.spec.replicas) {
                if (resource.owned) {
                    let podsInError = 0
                    for (let podKey in resource.owned) {
                        let pod = resource.owned[podKey]
                        if (pod.statusSummary === 'error' || pod.statusSummary === 'warning') {
                            ++podsInError
                        }
                    }
                    if (podsInError > 0) {
                        if (podsInError === resource.status.replicas) {
                            return 'error'
                        } else {
                            return 'warning'
                        }
                    }
                }
                return 'scaling up'
            } else if (resource.status.replicas > resource.spec.replicas) {
               return 'scaling down'
            }
            break
        default:
            //return 'unknown'
            return ''
            // let status = statuses[(++lastStatus % statuses.length)]
            // return status
    }
}
