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
import Loadable from 'react-loadable'
import LoadingComponentStub from './components/LoadingComponentStub'
import { createResource } from './state/actions/resources'


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
      resourceCreator: createResource,
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
      resourceCreator: createResource,
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
