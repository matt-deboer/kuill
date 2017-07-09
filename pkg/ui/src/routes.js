import React from 'react'
import Dashboard from './containers/DashboardPage'
import Workloads from './containers/Workloads'
import NewWorkload from './containers/NewWorkload'
import Cluster from './containers/Cluster'
import AccessControls from './containers/AccessControls'
import WorkloadInfo from './containers/WorkloadInfo'
import ClusterInfo from './containers/ClusterInfo'
import Home from 'material-ui/svg-icons/action/home'
import Tune from 'material-ui/svg-icons/image/tune'
import IconAccessControls from 'material-ui/svg-icons/hardware/security'
import IconCluster from 'material-ui/svg-icons/image/grain'
import Apps from 'material-ui/svg-icons/navigation/apps'
import KubeKinds from './kube-kinds'

const routes = [
  { 
    path: '/',
    name: 'Overview',
    component: Dashboard,
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

export function forResource(resource, view='configuration') {
  let ns = resource.namespace || (!!resource.metadata && resource.metadata.namespace) || "~"
  let name = resource.name || resource.metadata.name
  let path = "workloads"
  for (let group in KubeKinds) {
    if (resource.kind in KubeKinds[group]) {
      path = group
      break
    }
  }
  let query = view === '' ? '' : `?view=${view}`
  return `/${path}/${ns}/${resource.kind}/${name}${query}`
}