import React from 'react'
import { blueA400, blueA100 } from 'material-ui/styles/colors'
import sizeMe from 'react-sizeme'
import { Tabs, Tab } from 'material-ui/Tabs'
import { withRouter } from 'react-router-dom'
import { connect } from 'react-redux'
import { routerActions } from 'react-router-redux'
import queryString from 'query-string'
import ResourcesTab from './ResourcesTab'
import SubjectsTab from './SubjectsTab'
import './AccessControlsPage.css'

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
    resourceRevision: store.resources.resourceRevision,
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
        label: 'Resources',
        name: 'resources',
        component: <ResourcesTab />,
      },
      {
        label: 'Users & Groups',
        name: 'subjects',
        component: <SubjectsTab contentTop={140}/>,
      },
    ]
  }

  render() {

    let query = queryString.parse(this.props.location.search)
    let activeTab = query.view || 'resources'

    return (
    <div style={{border: '1px solid rgba(33,33,33,0.8)', position: 'absolute'}}>
        <Tabs
          style={{background: 'white', height: 'calc(100vh - 112px)', width: 'calc(100vw - 50px)'}}
          tabItemContainerStyle={styles.tabs}
          contentContainerStyle={{overflow: 'hidden'}}
          inkBarStyle={styles.tabsInkBar}
          value={activeTab}
          className={'tabs access'}
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
