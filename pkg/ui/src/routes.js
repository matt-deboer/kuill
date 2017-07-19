import React from 'react'
import Overview from './containers/Overview'
import Workloads from './containers/Workloads'
import NewWorkload from './containers/NewWorkload'
import Cluster from './containers/Cluster'
import AccessControls from './containers/AccessControls'
import WorkloadInfo from './containers/WorkloadInfo'
import ClusterInfo from './containers/ClusterInfo'
import Home from 'material-ui/svg-icons/action/home'
import IconAccessControls from 'material-ui/svg-icons/hardware/security'
import IconCluster from 'material-ui/svg-icons/maps/layers'
import Apps from 'material-ui/svg-icons/navigation/apps'
import KubeKinds from './kube-kinds'

const routes = [
  { 
    path: '/',
    name: 'Overview',
    component: Overview,
    icon: <Home/>,
    inMenu: false,
    exact: true,
  },
  { 
    path: '/workloads',
    menuPath: '/workloads?filters=namespace%3Adefault',
    name: 'Workloads',
    component: Workloads,
    icon: <Apps/>,
    inMenu: true,
    exact: true,
  },
  { 
    path: '/workloads/new',
    component: NewWorkload,
  },
  { 
    path: '/workloads/:namespace/:kind/:name',
    component: WorkloadInfo,
  },
  { 
    path: '/cluster',
    name: 'Cluster',
    component: Cluster,
    icon: <IconCluster/>,
    inMenu: true,
    exact: true,
  },
  { 
    path: '/cluster/:namespace/:kind/:name',
    component: ClusterInfo,
  },
  { 
    path: '/access',
    name: 'Access Controls',
    component: AccessControls,
    icon: <IconAccessControls/>,
    inMenu: true,
  },
]

const _menu = []
var stack = [].concat(routes)
for (; stack.length > 0;) {
  var route = stack.shift()
  if (route.inMenu) {
    _menu.push({
      link: (route.menuPath || route.path), 
      path: route.path,
      name: route.name, 
      icon: route.icon
    })
  }
  if (route.routes) {
    stack = stack.concat(route.routes)
  }
}

export const menu = _menu
export default routes

/**
 * Returns a link to the specified resource, which can either be a resource object, or a [kind/namespace/name] key
 * to a resource 
 * 
 * @param {*} resource 
 * @param {*} view 
 */
export function linkForResource(resource, view='config') {
  var ns, name, kind
  if (typeof resource === 'string') {
    [ kind, ns, name ] = resource.split('/')
  } else {
    ns = resource.namespace || (!!resource.metadata && resource.metadata.namespace) || "~"
    name = resource.name || resource.metadata.name
    kind = resource.kind
  }
  
  let path = "workloads"
  for (let group in KubeKinds) {
    if (kind in KubeKinds[group]) {
      path = group
      break
    }
  }
  let query = view === '' ? '' : `?view=${view}`
  return `/${path}/${ns}/${kind}/${name}${query}`
}