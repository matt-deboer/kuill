import React from 'react'
import Overview from './containers/Overview'
import Workloads from './containers/Workloads'
import AccessControls from './containers/AccessControls'
import WorkloadInfo from './containers/WorkloadInfo'
import ClusterInfo from './containers/ClusterInfo'
import AccessControlsInfo from './containers/AccessControlsInfo'
import Home from 'material-ui/svg-icons/action/home'
import IconAccessControls from 'material-ui/svg-icons/hardware/security'
import IconCluster from 'material-ui/svg-icons/maps/layers'
import Apps from 'material-ui/svg-icons/navigation/apps'
import queryString from 'query-string'
import Loadable from 'react-loadable'
import LoadingComponentStub from './components/LoadingComponentStub'
import { createResource as createWorkload } from './state/actions/workloads'
import { createResource as createAccessControl } from './state/actions/access'

const AsyncNewWorkload = Loadable({
  loader: () => import('./containers/NewResource'),
  loading: LoadingComponentStub,
})

const AsyncNewAccessControl = Loadable({
  loader: () => import('./containers/NewResource'),
  loading: LoadingComponentStub,
})

const AsyncCluster = Loadable({
  loader: () => import('./containers/Cluster'),
  loading: LoadingComponentStub
})

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
    menuPath: '/workloads',
    name: 'Workloads',
    component: Workloads,
    icon: <Apps/>,
    inMenu: true,
    exact: true,
  },
  { 
    path: '/workloads/new',
    component: AsyncNewWorkload,
    props: {
      resourceGroup: 'workloads',
      resourceCreator: createWorkload,
    },
  },
  { 
    path: '/workloads/:namespace/:kind/:name',
    component: WorkloadInfo,
  },
  { 
    path: '/cluster',
    menuPath: '/cluster?view=nodes',
    name: 'Cluster',
    component: AsyncCluster,
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
    exact: true,
  },
  { 
    path: '/access/new',
    component: AsyncNewAccessControl,
    props: {
      resourceGroup: 'access',
      resourceCreator: createAccessControl,
    },
  },
  { 
    path: '/access/:namespace/:kind/:name',
    component: AccessControlsInfo,
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
export function linkForResource(resource, kubeKind, view='config') {
  var ns, name, kind
  if (typeof resource === 'string') {
    [ kind, ns, name ] = resource.split('/')
  } else {
    ns = resource.namespace || (!!resource.metadata && resource.metadata.namespace) || "~"
    name = resource.name || resource.metadata.name
    kind = resource.kind
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
export function linkForResourceKind(kubeKind, selectedNamespaces) {
  let name = kubeKind.name
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
    linkParams.filters =[`kind:${kubeKind.name}`]
    if (selectedNamespaces && Object.keys(selectedNamespaces).length > 0) {
      for (let ns in selectedNamespaces) {
        linkParams.filters.push(`namespace:${ns}`)
      }
    }
  }
  let query = queryString.stringify(linkParams)
  return `/${group}?${query}`
}