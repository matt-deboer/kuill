import React from 'react'
import { blueA400, blueA100 } from 'material-ui/styles/colors'
import sizeMe from 'react-sizeme'
import { Tabs, Tab } from 'material-ui/Tabs'
import NodesTab from './NodesTab'
import { withRouter } from 'react-router-dom' 
import { connect } from 'react-redux'
import { routerActions } from 'react-router-redux'
import ClusterResourceTab from './ClusterResourceTab'
import StorageClassesTab from './StorageClassesTab'
import ResourceQuotasTab from './ResourceQuotasTab'
import NamespacesTab from './NamespacesTab'
import queryString from 'query-string'
import './ClusterPage.css'

const styles = {
  tabs: {
    backgroundColor: 'rgb(117, 117, 117)',
  },
  tabsInkBar: {
    backgroundColor: blueA400,
    height: 3,
    marginTop: -4,
    borderTop: `1px ${blueA100} solid`,
  },
}

const mapStateToProps = function(store) {
  return {
    pods: store.workloads.pods,
  }
}

const mapDispatchToProps = function(dispatch, ownProps) {
  return {
    selectView: function(tab) {
      let { location } = ownProps
      let newSearch = `?view=${tab}`
      console.log(`selectView: pushed new location...`)
      dispatch(routerActions.push({
        pathname: location.pathname,
        search: newSearch,
        hash: location.hash,
      }))
    },
  }
}

// use functional component style for representational components
export default sizeMe({ monitorWidth: true }) (
withRouter(connect(mapStateToProps, mapDispatchToProps) (
class ClusterPage extends React.Component {

  constructor(props) {
    super(props)
    this.tabs = [
      {
        label: 'Nodes',
        name: 'nodes',
        component: <NodesTab />,
      }
    ]

    this.tabs.push({
      label: 'Namespaces',
      name: 'namespaces',
      component: <NamespacesTab kind="Namespace" />,
    })

    this.tabs.push({
      label: 'Persistent Volumes',
      name: 'persistentvolumes',
      component: <ClusterResourceTab kind="PersistentVolume" />,
    })

    this.tabs.push({
        label: 'Storage Classes',
        name: 'storageclasses',
        component: <StorageClassesTab />,
    })

    this.tabs.push({
      label: 'Resource Quotas',
      name: 'resourcequotas',
      component: <ResourceQuotasTab />,
  })
  }

  render() {

    let query = queryString.parse(this.props.location.search)
    let activeTab = query.view || 'nodes'

    return (
    <div>
        <Tabs
          style={{background: 'white'}}
          tabItemContainerStyle={styles.tabs}
          contentContainerStyle={{overflow: 'hidden'}}
          inkBarStyle={styles.tabsInkBar}
          value={activeTab}
          >
          {this.tabs.map(tab => 
            <Tab label={tab.label} key={tab.name} value={tab.name} onActive={this.props.selectView.bind(this, tab.name)}>
              {tab.component}
            </Tab>
          )}
        </Tabs>
    </div>
    )
  }

})))
