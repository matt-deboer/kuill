import React from 'react'
import {blueA400, grey500, grey600, blueA100, white } from 'material-ui/styles/colors'
import sizeMe from 'react-sizeme'
import {Tabs, Tab} from 'material-ui/Tabs'
import NodesTab from './NodesTab'
import ClusterResourceTab from './ClusterResourceTab'
import './ClusterPage.css'

const styles = {
  tabs: {
    // backgroundColor: grey600,
    backgroundColor: 'rgb(117, 117, 117)',
  },
  tabsInkBar: {
    backgroundColor: blueA400,
    height: 3,
    marginTop: -4,
    borderTop: `1px ${blueA100} solid`,
  },
}

// use functional component style for representational components
export default sizeMe({ monitorWidth: true }) (
class ClusterPage extends React.Component {

  constructor(props) {
    super(props)
    // this.rows = Object.entries(props.resources).map(([k,v])=> v).filter(v => v.kind === 'Node' && !v.isFiltered)
    // this.nodes = Object.entries(props.resources).map(([k,v])=> v).filter(v => v.kind === 'Node')
  }

  render() {
    return (
    <div>
        <Tabs
          style={{background: 'white'}}
          tabItemContainerStyle={styles.tabs}
          contentContainerStyle={{overflow: 'hidden'}}
          inkBarStyle={styles.tabsInkBar}
          >
          <Tab label="Nodes" value="nodes">
            <NodesTab />
          </Tab>

          <Tab label="Persistent-Volumes" value="persistentvolumes">
            <ClusterResourceTab kind="PersistentVolume" />
          </Tab>

          <Tab label="Storage-Classes" value="storageclasses">
            <ClusterResourceTab kind="StorageClass" />
          </Tab>

        </Tabs>

        
    </div>
    )
  }
})
