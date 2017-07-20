export const zoneAnnotation = 'failure-domain.beta.kubernetes.io/zone'

/**
 * Applies the provided filters to the resource, modifying
 * the 'isFiltered' attribute of the resource accordingly
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
      if (resource.metadata.annotations && resource.metadata.annotations[zoneAnnotation] in values) {
        match = true
      }
    } else if (field === 'memory') {
      for (let v of values) {
        // parse the values
        let op, val
        if (v.startsWith('>')) {
          op = '>'
          val = v.substr(1)
        } else if (v.startsWith('>=')) {
          op = '>='
          val = v.substr(2)
        } else if (v.startsWith('<')) {
          op = '<'
          val = v.substr(1)
        } else if (v.startsWith('<=')) {
          op = '<='
          val = v.substr(2)
        }
      }
    } else if (field === 'cpu') {
      for (let v of values) {
        
      }
    } else if ( (resource.metadata[field] in values)
    || (resource[field] in values)
    || ('labels' in resource.metadata && resource.metadata.labels[field] in values)) {
      match = true
    } else if ( `!${resource.metadata[field]}` ) {
      resource.isFiltered = true
      return
    }

    if (match) {
      resource.isFiltered = false
    } else {
      // at least one filter field did not match; exit
      resource.isFiltered = true
      return
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