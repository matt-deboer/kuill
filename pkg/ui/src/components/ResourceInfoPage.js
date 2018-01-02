import React from 'react'
import PropTypes from 'prop-types'
import {blueA400, grey600, grey700, blueA100} from 'material-ui/styles/colors'
import { connect } from 'react-redux'
import sizeMe from 'react-sizeme'

import {Card, CardHeader} from 'material-ui/Card'
import ConfigurationPane from './configuration-pane/ConfigurationPane'
import PermissionsPane from './configuration-pane/PermissionsPane'
import PodTemplatePane from './configuration-pane/PodTemplatePane'
import PodsForNodePane from './configuration-pane/PodsForNodePane'
import RelatedResourcesPane from './configuration-pane/RelatedResourcesPane'
import EventViewer from './EventViewer'

import IconConfiguration from 'material-ui/svg-icons/action/list'
import IconPermissions from 'material-ui/svg-icons/communication/vpn-key'
import IconPodTemplate from 'material-ui/svg-icons/action/flip-to-back'
import IconPods from 'material-ui/svg-icons/action/group-work'
import IconRelated from 'material-ui/svg-icons/social/share'
import IconLogs from 'material-ui/svg-icons/action/receipt'
import IconTerminal from 'material-ui/svg-icons/hardware/computer'
import IconEvents from 'material-ui/svg-icons/action/event'
import FilterChip from './FilterChip'

import { withRouter } from 'react-router-dom'

import {Tabs, Tab} from 'material-ui/Tabs'

import KindAbbreviation from './KindAbbreviation'

import { resourceStatus as resourceStatusIcons } from './icons'
import ConfirmationDialog from './ConfirmationDialog'
import ScaleDialog from './ScaleDialog'
import ResourceInfoActionsMenu from './ResourceInfoActionsMenu'
import { sameResource } from '../utils/resource-utils'

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
    pods: store.resources.pods,
    accessEvaluator: store.session.accessEvaluator,
    kinds: store.apimodels.kinds,
    linkGenerator: store.session.linkGenerator,
  }
}

const mapDispatchToProps = function(dispatch, ownProps) {
  return {
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
    lineHeight: '30px',
    fontWeight: 600,
    paddingLeft: 10,
    color: 'rgba(240,240,240,1)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 'calc(100vw - 320px)',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
  },
}


export default withRouter(connect(mapStateToProps, mapDispatchToProps) (
sizeMe({ monitorHeight: true, monitorWidth: true }) (
class ResourceInfoPage extends React.Component {

  static propTypes = {
    editResource: PropTypes.func,
    removeResource: PropTypes.func,
    scaleResource: PropTypes.func,
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

    if (props.resource) {
      this.kubeKind = this.props.kinds[props.resource.kind]
      let that = this
      this.props.accessEvaluator.getObjectAccess(props.resource).then((access) => {
        that.setState({
          resourceAccess: access,
        })
      })
    }
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

  componentWillReceiveProps = (nextProps, nextState) => {
    if (!sameResource(nextProps.resource, this.props.resource) || !this.state.resourceAccess) {
      this.setState({resourceAccess: null})
      this.kubeKind = nextProps.kinds[nextProps.resource.kind]
      let that = this
      this.props.accessEvaluator.getObjectAccess(nextProps.resource).then((access) => {
        that.setState({
          resourceAccess: access,
        })
      })
    }
  }

  componentDidUpdate = () => {
    this.kubeKind = !!this.props.resource && this.props.kinds[this.props.resource.kind]
  }

  render() {

    let { resourceGroup, resource, logs, linkGenerator } = this.props
    let { resourceAccess } = this.state

    let tabs = []
    let targetTab = this.props.activeTab
    if (!!resource) {
    
      tabs.push({
        name: 'config',
        component: ConfigurationPane,
        icon: <IconConfiguration/>,
        props: {resource: resource, resourceGroup: resourceGroup, linkGenerator: linkGenerator},
      })
    
      if (resource.kind === 'ServiceAccount') {
        tabs.push({
          name: 'permissions',
          component: PermissionsPane,
          icon: <IconPermissions/>,
          props: {serviceAccount: resource, resources: this.props.resources, linkGenerator: linkGenerator},
        })
      }

      if (resource.spec && resource.spec.template) {
        tabs.push({
          name: 'pod template',
          component: PodTemplatePane,
          icon: <IconPodTemplate/>,
          props: {resource: resource, linkGenerator: linkGenerator},
        })
      }

      if (resource.kind === 'Node') {
        tabs.push({
          name: 'pods',
          component: PodsForNodePane,
          icon: <IconPods/>,
          props: {node: resource},
        })
      } else if (!!resource.owned) {
        tabs.push({
          name: 'related',
          component: RelatedResourcesPane,
          icon: <IconRelated/>,
          props: {resource: resource},
        })
      }
    }

    // TODO: this may also require a separate permissions check
    tabs.push({
      name: 'events',
      component: EventViewer,
      icon: <IconEvents/>,
    })

    if (resourceAccess && resourceAccess.logs) {
      tabs.push({
        name: 'logs',
        component: AsyncLogViewer,
        icon: <IconLogs/>,
        props: {logs: logs},
      })
    }

    if (resourceAccess && resourceAccess.terminal) {
      tabs.push({
        name: 'terminal',
        component: AsyncTerminalViewer,
        icon: <IconTerminal/>,
      })
    }

    // TODO: check for tab change, 
    // if the tab is 'related', set the default
    // filters...
    let activeTab = tabs[0].name
    if (targetTab !== 'edit') {
      if (tabs.find((t) => t.name === targetTab)) {
        activeTab = targetTab
      }
    
      if (resourceAccess && activeTab !== targetTab) {
        return null
      }
    }
   
    return (
      <div>

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
            
          <ResourceInfoActionsMenu
            access={this.state.resourceAccess}
            handlers={{
              scale: this.handleScale,
              edit: () => {
                this.props.selectView('edit')
                this.setState({actionsOpen: false})
              },
              suspend: this.handleSuspend,
              delete: this.handleDelete,
            }}
            />

            <div style={{top: 85, left: 32, position: 'absolute'}} className={'resource-status'}>
              {resourceStatusIcons[resource.statusSummary]}
            </div>

          </CardHeader>
        
          <Tabs
            style={{background: 'white'}}
            tabItemContainerStyle={styles.tabs}
            contentContainerStyle={{overflow: 'hidden'}}
            inkBarStyle={styles.tabsInkBar}
            contentContainerClassName={`resource-tabs-content`}
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
          linkGenerator={this.props.linkGenerator}
          />
       
        <ConfirmationDialog 
          open={this.state.suspendOpen}
          title={'Suspend Resource(s):'}
          message={`Are you sure you want to suspend the following resource?`}
          resources={[this.props.resource]}
          onRequestClose={this.handleRequestCloseSuspend}
          onConfirm={this.handleConfirmSuspend}
          linkGenerator={this.props.linkGenerator}
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
