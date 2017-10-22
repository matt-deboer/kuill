import queryString from 'query-string'

export default class LinkGenerator {
  
  constructor(props) {
    this.dispatch = props.dispatch
    this.getState = props.getState
  }

  initialize = () => {    
    this.kubeKinds = this.kubeKinds || this.getState().apimodels.kinds
  }

  /**
   * Returns a link to the specified resource, which can either be a resource object, or a [kind/namespace/name] key
   * to a resource 
   * 
   * @param {*} resource 
   * @param {*} view 
   */
  linkForResource(resource, view='config') {
    this.initialize()
    var ns, name, kind
    if (typeof resource === 'string') {
      [ kind, ns, name ] = resource.split('/')
    } else {
      ns = resource.namespace || (!!resource.metadata && resource.metadata.namespace) || "~"
      name = resource.name || resource.metadata.name
      kind = resource.kind
    }
    let kubeKind = this.kubeKinds[kind]
    if (!kubeKind) {
      return `/DNE`
    }
    let path = kubeKind.resourceGroup
    let query = view === '' ? '' : `?view=${view}`
    return `/${path}/${ns}/${kind}/${name}${query}`
  }

  /**
   * Returns a link to the specified resource kind
   * 
   * @param {*} resource 
   * @param {*} view 
   */
  linkForKind(kind, selectedNamespaces) {
    this.initialize()
    let kubeKind = this.kubeKinds[kind]
    if (!kubeKind) {
      return `/DNE`
    }
    let name = kind
    if (!(name.endsWith('s'))) {
      name += 's'
    } else if (name.endsWith('ss')) {
      name += 'es'
    } else if (name.endsWith('eus')) {
      name = name.replace(/us$/, "i")
    }
    let group = kubeKind.resourceGroup
    let linkParams = {}
    if (group === 'cluster') {
      linkParams.view = name.toLowerCase()
    } else {
      linkParams.filters =[`kind:${kind}`]
      if (selectedNamespaces && Object.keys(selectedNamespaces).length > 0) {
        for (let ns in selectedNamespaces) {
          linkParams.filters.push(`namespace:${ns}`)
        }
      }
    }
    let query = queryString.stringify(linkParams)
    return `/${group}?${query}`
  }
}