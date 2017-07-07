import React from 'react'
import {blueA400, grey600, grey700, blueA100} from 'material-ui/styles/colors'
import { connect } from 'react-redux'
// import sizeMe from 'react-sizeme'
import { routerActions } from 'react-router-redux'
import { editResource, removeResource } from '../state/actions/workloads'

import {Card, CardHeader} from 'material-ui/Card'
import ConfigurationPane from './ConfigurationPane'
import LogViewer from './LogViewer'
import EventViewer from './EventViewer'
import TerminalViewer from './TerminalViewer'

import IconConfiguration from 'material-ui/svg-icons/action/list'
import IconLogs from 'material-ui/svg-icons/action/receipt'
import IconTerminal from 'material-ui/svg-icons/hardware/computer'
import IconEvents from 'material-ui/svg-icons/action/event'
import IconExpand from 'material-ui/svg-icons/navigation/more-vert'
import IconEdit from 'material-ui/svg-icons/editor/mode-edit'
import IconDelete from 'material-ui/svg-icons/action/delete'

import FilterChip from './FilterChip'

import { withRouter } from 'react-router-dom'

import {Tabs, Tab} from 'material-ui/Tabs'

import LoadingSpinner from './LoadingSpinner'

import RaisedButton from 'material-ui/RaisedButton'
import Popover from 'material-ui/Popover'
import Menu from 'material-ui/Menu'
import MenuItem from 'material-ui/MenuItem'
import KubeKinds from '../kube-kinds'
import KindAbbreviation from './KindAbbreviation'
import queryString from 'query-string'

const mapStateToProps = function(store) {
  return {
    filterNames: store.workloads.filterNames,
  }
}

const mapDispatchToProps = function(dispatch, ownProps) {
  return {
    editResource: function(namespace, kind, name) {
      dispatch(editResource(namespace, kind, name))
      ownProps.selectView('edit')
    },
    removeResource: function(resource, filterNames) {
      dispatch(removeResource(resource))
      
      let search = queryString.stringify({filters: filterNames})
      if (!!search) {
        search = '?'+search
      }
      dispatch(routerActions.push({
        pathname: `/${ownProps.resourceGroup}`,
        search: search,
      }))
    },
    selectView: function(tab) {
      if (tab === 'edit') {
        let { params } = ownProps.match
        dispatch(editResource(params.namespace, params.kind, params.name))
      }
      
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

const styles = {
  tabs: {
    backgroundColor: grey600,
  },
  tabsInkBar: {
    backgroundColor: blueA400,
    height: 3,
    marginTop: -4,
    borderTop: `1px ${blueA100} solid`,
  },
  cards: {
    margin: 10,
    boxShadow: 'none',
  },
  cardHeader: {
    borderBottom: '1px solid rgba(0,0,0,0.1)',
  },
  cardHeaderTitle: {
    color: 'rgba(0,0,0,0.4)',
    fontWeight: 600,
    fontStyle: 'italic',
    fontSize: '18px',
  }
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps) (
class ResourceInfoPage extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      actionsOpen: false,
      editing: false,
    }
    this.kubeKind = !!props.resource && KubeKinds[props.resourceGroup][props.resource.kind]
  }

  handleActionsTouchTap = (event) => {
    // This prevents ghost click.
    event.preventDefault();
    this.setState({
      actionsOpen: true,
      actionsAnchor: event.currentTarget,
    })
  }

  handleActionsRequestClose = () => {
    this.setState({
      actionsOpen: false,
    })
  }

  componentDidUpdate = () => {
    this.kubeKind = !!this.props.resource && KubeKinds[this.props.resourceGroup][this.props.resource.kind]
  }

  render() {

    let { resourceGroup, resource, logs, activeTab } = this.props

    const tabs = [
      {
        name: 'configuration',
        component: ConfigurationPane,
        icon: <IconConfiguration/>,
        props: {resource: resource, resourceGroup: resourceGroup},
      },
      {
        name: 'events',
        component: EventViewer,
        icon: <IconEvents/>,
      },
      {
        name: 'logs',
        component: LogViewer,
        icon: <IconLogs/>,
        props: {logs: logs},
      },
      {
        name: 'terminal',
        component: TerminalViewer,
        icon: <IconTerminal/>,
        props: {logs: logs},
      }
    ]

    /*avatar={<Avatar src={require(`../images/${this.kubeKind.image || 'resource.png'}`)} style={{backgroundColor: 'transparent'}} />}*/

    return (
      <div>
        <LoadingSpinner hidden={!this.props.resource}/>

        <Card className="resource-info" style={{margin: 5}} >
          <CardHeader
            title={resource.metadata.name}
            subtitle={
              <div style={{padding: 20}}>
                <div>
                {resource.metadata.labels && Object.entries(resource.metadata.labels).map(([key, value]) =>
                  <FilterChip key={key} prefix={key} suffix={value} />)
                }
                </div>
                <div>
                  <FilterChip prefixStyle={{fontStyle: 'italic', color: grey700}} prefix={'namespace'} suffix={resource.metadata.namespace} />
                  <FilterChip prefixStyle={{fontStyle: 'italic', color: grey700}} prefix={'kind'} suffix={resource.kind} />
                </div>
              </div>
            }
            avatar={<KindAbbreviation text={this.kubeKind.abbrev} color={this.kubeKind.color}/>}
            titleStyle={{fontSize: '24px', fontWeight: 600, paddingLeft: 10}}
          >
            
            <RaisedButton
              label="Actions"
              labelPosition="before"
              onTouchTap={this.handleActionsTouchTap}
              icon={<IconExpand/>}
              style={{position: 'absolute', right: 20, top: 20}}
              primary={true}
            />
            <Popover
              open={this.state.actionsOpen}
              anchorEl={this.state.actionsAnchor}
              onRequestClose={this.handleActionsRequestClose}
              anchorOrigin={{horizontal: 'right', vertical: 'bottom'}}
              targetOrigin={{horizontal: 'right', vertical: 'top'}}
            >
              <Menu desktop={true}>
                <MenuItem primaryText="Edit" 
                  onTouchTap={() => {
                    this.props.selectView('edit')
                    this.setState({actionsOpen: false})
                  }}
                  leftIcon={<IconEdit/>}
                  />
                <MenuItem primaryText="Delete" 
                  leftIcon={<IconDelete/>}
                  onTouchTap={() => {
                    this.props.removeResource(this.props.resource, this.props.filterNames)
                  }}
                  />
              </Menu>
            </Popover>
          </CardHeader>
        
          <Tabs 
            tabItemContainerStyle={styles.tabs}
            contentContainerStyle={{overflowX: 'hidden'}}
            inkBarStyle={styles.tabsInkBar}
            className={'resource-tabs'}
            value={activeTab}
            ref={ (ref) => {
                if (!!ref) {
                  // get absolute bottom of the tab button bar so our tab contents can fill available space
                  let tabButtons = document.getElementsByClassName('resource-tabs')[0].children[0]
                  this.contentTop = tabButtons.getBoundingClientRect().bottom
                }
              }
            }
            >
            {tabs.map(tab => {              
                let Component = tab.component
                return <Tab key={tab.name} icon={tab.icon} label={tab.name} value={tab.name} onActive={this.props.selectView.bind(this, tab.name)}>
                  <Component {...tab.props} contentTop={this.contentTop}/>
                </Tab>
              }
            )}
          </Tabs>
        </Card>
      </div>
    )
  }
}))
