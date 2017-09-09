import React from 'react'
import PropTypes from 'prop-types'
import {blueA400, grey600, grey700, blueA100} from 'material-ui/styles/colors'
import { connect } from 'react-redux'
import sizeMe from 'react-sizeme'

import {Card, CardHeader} from 'material-ui/Card'
import ConfigurationPane from './configuration-pane/ConfigurationPane'
import PermissionsPane from './configuration-pane/PermissionsPane'
import PodTemplatePane from './configuration-pane/PodTemplatePane'
import EventViewer from './EventViewer'

import IconConfiguration from 'material-ui/svg-icons/action/list'
import IconPermissions from 'material-ui/svg-icons/communication/vpn-key'
import IconPodTemplate from 'material-ui/svg-icons/action/flip-to-back'
import IconLogs from 'material-ui/svg-icons/action/receipt'
import IconTerminal from 'material-ui/svg-icons/hardware/computer'
import IconEvents from 'material-ui/svg-icons/action/event'
import IconExpand from 'material-ui/svg-icons/navigation/more-vert'
import IconEdit from 'material-ui/svg-icons/editor/mode-edit'
import IconDelete from 'material-ui/svg-icons/action/delete'
import IconScale from 'material-ui/svg-icons/communication/import-export'
import IconSuspend from 'material-ui/svg-icons/content/block'

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

import { resourceStatus as resourceStatusIcons } from './icons'

import ConfirmationDialog from './ConfirmationDialog'
import ScaleDialog from './ScaleDialog'
import './ResourceInfoPage.css'

import Loadable from 'react-loadable'
import LoadingComponentStub from '../components/LoadingComponentStub'

const AsyncTerminalViewer = Loadable({
  loader: () => import('./TerminalViewer'),
  loading: LoadingComponentStub
})

const AsyncLogViewer = Loadable({
  loader: () => import('./LogViewer'),
  loading: LoadingComponentStub
})

const mapStateToProps = function(store) {
  return {
    // filterNames: store.workloads.filterNames,
    pods: store.workloads.pods,
  }
}

const mapDispatchToProps = function(dispatch, ownProps) {
  return {
    // viewKind: function(kind, namespace) {
    //   let ns = {}
    //   if (!!namespace) {
    //     ns[namespace] = true
    //   }
    //   dispatch(routerActions.push(linkForResourceKind(kind, ns)))
    // },
    // viewFilters: function(filters) {
    //   let search = `?${queryString.stringify({filters: filters})}`
    //   dispatch(routerActions.push({
    //     pathname: `/${ownProps.resourceGroup}`,
    //     search: search,
    //   }))
    // },
    // selectView: function(tab) {
    //   if (tab === 'edit') {
    //     let { params } = ownProps.match
    //     dispatch(ownProps.editResource(params.namespace, params.kind, params.name))
    //   }
      
    //   let { location } = ownProps
    //   let newSearch = `?view=${tab}`
    //   console.log(`selectView: pushed new location...`)
    //   dispatch(routerActions.push({
    //     pathname: location.pathname,
    //     search: newSearch,
    //     hash: location.hash,
    //   }))
    // },
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
  card: {
    margin: 5,
    border: '1px solid rgba(33,33,33,0.8)',
  },
  cardHeader: {
    background: 'rgb(66,66,66)',
    minHeight: '125px',
  },
  cardHeaderTitle: {
    fontWeight: 600,
    fontSize: '18px',
  },
  cardHeaderTitleStyle: {
    fontSize: '24px',
    fontWeight: 600,
    paddingLeft: 10,
    color: 'rgba(240,240,240,1)',
  }
}


export default withRouter(connect(mapStateToProps, mapDispatchToProps) (
sizeMe({ monitorHeight: true, monitorWidth: true }) (
class ResourceInfoPage extends React.Component {

  static propTypes = {
    editResource: PropTypes.function,
    removeResource: PropTypes.function,
    scaleResource: PropTypes.function,
  }

  static defaultProps = {
    editResource: function(){},
    removeResource: function(){},
    scaleResource: function(){},
  }

  constructor(props) {
    super(props);
    this.state = {
      actionsOpen: false,
      deleteOpen: false,
      scaleOpen: false,
      suspendOpen: false,
      editing: false,
    }

    this.kubeKind = !!props.resource && KubeKinds[props.resourceGroup][props.resource.kind]
    for (let fn of ['handleScale','handleSuspend','handleDelete']) {
      this[fn] = this[fn].bind(this)
    }
  }

  handleActionsTouchTap = (event) => {
    // This prevents ghost click.
    event.preventDefault();
    this.setState({
      actionsOpen: true,
      deleteOpen: false,
      scaleOpen: false,
      suspendOpen: false,
      actionsAnchor: event.currentTarget,
    })
  }

  handleActionsRequestClose = () => {
    this.setState({
      actionsOpen: false,
    })
  }

  handleFilterLabelTouchTap = (filters) => {
    this.props.viewFilters(filters)
  }

  handleKindTouchTap = (kind, namespace) => {
    this.props.viewKind(kind, namespace)
  }

  handleRequestCloseDelete = () => {
    this.setState({
      deleteOpen: false,
    })
  }

  handleDelete = () => {
    this.setState({
      deleteOpen: true,
      actionsOpen: false,
    })
  }

  handleConfirmDelete = () => {
    this.setState({
      deleteOpen: false,
    })
    this.props.removeResource(this.props.resource)
  }

  handleScale = () => {
    this.setState({
      scaleOpen: true,
      actionsOpen: false,
    })
  }

  handleRequestCloseScale = () => {
    this.setState({
      scaleOpen: false,
    })
  }

  handleConfirmScale = (replicas) => {
    this.setState({
      scaleOpen: false,
    })
    if (replicas !== undefined) {
      this.props.scaleResource(this.props.resource, replicas)
    }
  }

  handleSuspend = () => {
    this.setState({
      suspendOpen: true,
      actionsOpen: false,
    })
  }

  handleRequestCloseSuspend = () => {
    this.setState({
      suspendOpen: false,
    })
  }

  handleConfirmSuspend = () => {
    this.setState({
      suspendOpen: false,
    })
    this.props.scaleResource(this.props.resource, 0)
  }

  componentWillReceiveProps = (nextProps) => {
    let { props } = this
    if ((props.activeTab === 'logs' && !props.enableLogsTab)
      || (props.activeTab === 'term' && !props.enableTerminalTab)) {

      props.selectView('config')
    }

  }

  componentDidUpdate = () => {
    this.kubeKind = !!this.props.resource && KubeKinds[this.props.resourceGroup][this.props.resource.kind]
  }

  render() {

    let { resourceGroup, resource, logs, activeTab, enableLogsTab, enableTerminalTab } = this.props

    let tabs = [
      {
        name: 'config',
        component: ConfigurationPane,
        icon: <IconConfiguration/>,
        props: {resource: resource, resourceGroup: resourceGroup},
      }
    ]
    
    if (resource.kind === 'ServiceAccount') {
      tabs.push({
        name: 'permissions',
        component: PermissionsPane,
        icon: <IconPermissions/>,
        props: {serviceAccount: resource, resources: this.props.resources},
      })
    }

    if (resource.spec && resource.spec.template) {
      tabs.push({
        name: 'pod template',
        component: PodTemplatePane,
        icon: <IconPodTemplate/>,
        props: {resource: resource},
      })
    }
    
    tabs.push({
      name: 'events',
      component: EventViewer,
      icon: <IconEvents/>,
    })

    if (enableLogsTab) {
      tabs.push({
        name: 'logs',
        component: AsyncLogViewer,
        icon: <IconLogs/>,
        props: {logs: logs},
      })
    }
    if (enableTerminalTab) {
      tabs.push({
        name: 'terminal',
        component: AsyncTerminalViewer,
        icon: <IconTerminal/>,
        props: {logs: logs},
      })
    }

    if (!activeTab || activeTab === 'edit') {
      activeTab = tabs[0].name
    }

    return (
      <div>
        <LoadingSpinner hidden={!this.props.resource}/>

        <Card className="resource-info" style={styles.card} >
          <CardHeader
            title={resource.metadata.name}
            titleStyle={styles.cardHeaderTitleStyle}
            subtitle={
              <div style={{padding: 20}}>
                <div>
                {resource.metadata.labels && Object.entries(resource.metadata.labels).map(([key, value]) =>
                  <FilterChip 
                    onTouchTap={this.handleFilterLabelTouchTap.bind(this,[`namespace:${resource.metadata.namespace}`, `${key}:${value}`])} 
                    key={key} 
                    prefix={key} 
                    suffix={value} />)
                }
                </div>
                <div>
                  {'namespace' in resource.metadata &&
                    <FilterChip 
                      onTouchTap={this.handleFilterLabelTouchTap.bind(this,[`namespace:${resource.metadata.namespace}`])} 
                      prefixStyle={{color: grey700}} 
                      prefix={'namespace'} suffix={resource.metadata.namespace} />
                  }
                  <FilterChip 
                    onTouchTap={this.handleKindTouchTap.bind(this,resource.kind, resource.metadata.namespace)} 
                    prefixStyle={{color: grey700}} 
                    prefix={'kind'} suffix={resource.kind} />
                </div>
              </div>
            }
            avatar={<KindAbbreviation text={this.kubeKind.abbrev} color={this.kubeKind.color}/>}
            style={styles.cardHeader}
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
                {(this.props.resource.spec && this.props.resource.spec.replicas > -1) &&
                  <MenuItem primaryText="Scale"
                    leftIcon={<IconScale/>}
                    onTouchTap={this.handleScale}
                    />
                }
                
                {(!('editable' in this.kubeKind) || !!this.kubeKind.editable) &&
                  <MenuItem primaryText="Edit" 
                    onTouchTap={() => {
                      this.props.selectView('edit')
                      this.setState({actionsOpen: false})
                    }}
                    leftIcon={<IconEdit/>}
                    />
                }
                
                {(this.props.resource.spec && this.props.resource.spec.replicas > 0) &&
                  <MenuItem primaryText="Suspend"
                    leftIcon={<IconSuspend/>}
                    onTouchTap={this.handleSuspend}
                    />
                }

                <MenuItem primaryText="Delete" 
                  leftIcon={<IconDelete/>}
                  onTouchTap={this.handleDelete}
                  />

              </Menu>
            </Popover>
            <div style={{top: 85, left: 32, position: 'absolute'}}>{resourceStatusIcons[resource.statusSummary]}</div>

          </CardHeader>
        
          <Tabs
            style={{background: 'white'}}
            tabItemContainerStyle={styles.tabs}
            contentContainerStyle={{overflow: 'hidden'}}
            inkBarStyle={styles.tabsInkBar}
            className={`resource-tabs ${activeTab.replace(" ","-")}`}
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

        <ConfirmationDialog 
          open={this.state.deleteOpen}
          title={'Delete Resource(s):'}
          message={`Are you sure you want to delete the following resource?`}
          resources={[this.props.resource]}
          onRequestClose={this.handleRequestCloseDelete}
          onConfirm={this.handleConfirmDelete}
          />
       
        <ConfirmationDialog 
          open={this.state.suspendOpen}
          title={'Suspend Resource(s):'}
          message={`Are you sure you want to suspend the following resource (by scaling to 0 replicas)?`}
          resources={[this.props.resource]}
          onRequestClose={this.handleRequestCloseSuspend}
          onConfirm={this.handleConfirmSuspend}
          />

        <ScaleDialog 
          open={this.state.scaleOpen}
          resource={this.props.resource}
          onRequestClose={this.handleRequestCloseScale}
          onConfirm={this.handleConfirmScale}
          />

      </div>
    )
  }
})))
