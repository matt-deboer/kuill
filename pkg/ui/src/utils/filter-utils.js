export const zoneLabel = 'failure-domain.beta.kubernetes.io/zone'
export const regionLabel = 'failure-domain.beta.kubernetes.io/region'
export const instanceTypeLabel = 'beta.kubernetes.io/instance-type'
export const roleLabel = 'kubernetes.io/role'
export const hostnameLabel = 'kubernetes.io/hostname'

/**
 * Applies the provided filters to the resource, modifying
 * the 'isFiltered' attribute of the resource accordingly.
 *
 * Returns 'true' if the resource was filtered.
 * 
 * @param {*} filters the filters to apply
 * @param {*} resource the resource to update
 */
export function applyFiltersToResource(filters, resource) {
  
  resource.isFiltered = Object.keys(filters).length > 0
  for (var field in filters) {
    var values = filters[field]
    let match = false
    if (field === '*') {
      let matched = false
      for (let m in resource.metadata) {
        let metaValue = "" + resource.metadata[m]
        if (metaValue in values) {
          match = true
          break
        }
        for (let v in values) {
          if (metaValue.includes(v)) {
            match = true
          break
          }
        }
        if (match) {
          break
        }
      }
      if (!matched && 'labels' in resource.metadata) {
        for (var label in resource.metadata.labels) {
          let labelValue = resource.metadata.labels[label]
          if (labelValue in values) {
            match = true
            break
          }
        }
      }
    } else if (field === 'status') {
      if (resource.statusSummary in values) {
        match = true
      }
    } else if (field === 'zone') {
      if (resource.metadata.labels && resource.metadata.labels[zoneLabel] in values) {
        match = true
      } else if (resource.parameters && resource.parameters.zone in values) {
        match = true
      }
    } else if (field === 'region') {
      if (resource.metadata.labels && resource.metadata.labels[regionLabel] in values) {
        match = true
      }
    } else if (field === 'instanceType') {
      if (resource.metadata.labels && resource.metadata.labels[instanceTypeLabel] in values) {
        match = true
      }
    } else if (field === 'role') {
      if (resource.metadata.labels && resource.metadata.labels[roleLabel] in values) {
        match = true
      }
    } else if (field === 'hostname') {
      if (resource.metadata.labels && resource.metadata.labels[hostnameLabel] in values) {
        match = true
      }
    } else if (field === 'node') {
      if (resource.kind === 'Pod' && resource.spec.nodeName in values) {
        match = true
      }
    } else if (field === 'freeMemory') {
      // for (let v of values) {
      //   // parse the values
      //   let op, val
      //   if (v.startsWith('>')) {
      //     op = '>'
      //     val = v.substr(1)
      //   } else if (v.startsWith('>=')) {
      //     op = '>='
      //     val = v.substr(2)
      //   } else if (v.startsWith('<')) {
      //     op = '<'
      //     val = v.substr(1)
      //   } else if (v.startsWith('<=')) {
      //     op = '<='
      //     val = v.substr(2)
      //   }
      // }
    } else if (field === 'freeCPU') {
      // for (let v of values) {
        
      // }
    } else if ( (resource.metadata[field] in values)
    || (resource[field] in values)
    || ('labels' in resource.metadata && resource.metadata.labels[field] in values)) {
      match = true
    } else if ( `!${resource.metadata[field]}` ) {
      return resource.isFiltered = true
    }

    if (match) {
      resource.isFiltered = false
    } else {
      // at least one filter field did not match; exit
      return resource.isFiltered = true
    }
  }
}

export function splitFilter(filter) {
  var parts=filter.split(":")
  if (parts.length === 1) {
    parts = ["*", parts[0]]
  }
  return parts
}

