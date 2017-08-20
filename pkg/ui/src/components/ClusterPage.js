import React from 'react'
import FloatingActionButton from 'material-ui/FloatingActionButton'
import {blueA400, grey500, grey600, blueA100, white } from 'material-ui/styles/colors'
import { routerActions } from 'react-router-redux'
import { connect } from 'react-redux'
import { addFilter, removeFilter, removeResource } from '../state/actions/cluster'
import sizeMe from 'react-sizeme'
import {Tabs, Tab} from 'material-ui/Tabs'
import FilterTable from './filter-table/FilterTable'
import * as moment from 'moment'

import ChipInput from 'material-ui-chip-input'
import Chip from 'material-ui/Chip'
import { withRouter } from 'react-router-dom'
import { linkForResource } from '../routes'
import IconLogs from 'material-ui/svg-icons/action/receipt'
import IconShell from 'material-ui/svg-icons/hardware/computer'
import IconEdit from 'material-ui/svg-icons/editor/mode-edit'

import Popover from 'material-ui/Popover'
import Paper from 'material-ui/Paper'

import { arraysEqual } from '../comparators'
import { resourceStatus as resourceStatusIcons } from './icons'
import { compareStatuses } from '../utils/resource-utils'
import NodeHeatmap from './dashboard/NodeHeatmap'
import { hostnameLabel } from '../utils/filter-utils'
// import BrowserUsage from './dashboard/BrowserUsage'
// import Data from '../data'
import KubeKinds from '../kube-kinds'
import './ClusterPage.css'

import Perf from 'react-addons-perf'

const mapStateToProps = function(store) {
  return {
    filters: store.cluster.filters,
    filterNames: store.cluster.filterNames,
    possibleFilters: store.cluster.possibleFilters,
    resourceRevision: store.cluster.resourceRevision,
    nodeMetrics: store.metrics.node,
    metricsRevision: store.metrics.revision,
  }
}

const mapDispatchToProps = function(dispatch, ownProps) {
  return {
    addFilter: function(filterName) {
      dispatch(addFilter(filterName))
    },
    removeFilter: function(filterName, index) {
      dispatch(removeFilter(filterName, index))
    },
    viewResource: function(resource, view='config') {
      dispatch(routerActions.push(linkForResource(resource,view)))
    },
    removeResource: function(...resources) {
      dispatch(removeResource(...resources))
    }
  } 
}

const styles = {
  newResourceButton: {
    margin: 0,
    top: 100,
    right: 60,
    bottom: 'auto',
    left: 'auto',
    position: 'fixed',
  },
  deleteResourceButton: {
    margin: 0,
    top: 110,
    right: 130,
    bottom: 'auto',
    left: 'auto',
    position: 'fixed',
  },
  editButton: {
    fill: grey500
  },
  cell: {
    paddingLeft: 2,
    paddingRight: 2,
  },
  header: {
    fontWeight: 600,
    fontSize: '13px',
    color: white,
    fill: white,
  },
  iconButton: {
    float: 'left',
    paddingTop: 17
  },
  editLink: {
    color: blueA400,
    fontWeight: 600,
    textDecoration: 'none',
  },
  miniButton: {
    margin: 10,
  },
  popover: {
    marginTop: -55,
    marginLeft: 0,
    paddingLeft: 15,
    paddingRight: 15,
    backgroundColor: '#BBB',
    border: '1px solid #000',
    borderRadius: '3px',
    boxShadow: 'rgba(0, 0, 0, 0.16) 0px 3px 10px, rgba(0, 0, 0, 0.23) 0px 3px 10px',
  },
  paper: {
    padding: 15,
    margin: 0,
  },
  tabs: {
    backgroundColor: grey600,
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
withRouter(connect(mapStateToProps, mapDispatchToProps) (
class ClusterPage extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      actionsOpen: false,
      hoveredRow: -1,
      hoveredResources: null,
    }
    this.selectedIds = {}
    // this.rows = this.resourcesToRows(props.resources)
    this.rows = Object.entries(props.resources).map(([k,v])=> v).filter(v => v.kind === 'Node' && !v.isFiltered)
    this.nodes = Object.entries(props.resources).map(([k,v])=> v).filter(v => v.kind === 'Node')
    this.columns = [
      // {
      //   id: 'kind',
      //   label: 'kind',
      //   sortable: true,
      //   headerStyle: styles.header,
      //   style: { ...styles.cell,
      //     width: '100px',
      //   }
      // },
      {
        id: 'status',
        label: 'status',
        headerStyle: styles.header,
        style: { ...styles.cell,
          width: 48,
          verticalAlign: 'middle',
          paddingLeft: 15,
        },
        sortable: true,
        comparator: compareStatuses,
      },
      {
        id: 'hostname',
        label: 'hostname',
        sortable: true,
        headerStyle: styles.header,
        style: { ...styles.cell,
          width: '35%',
          paddingLeft: 20,
        },
      },
      {
        id: 'age',
        label: 'age',
        sortable: true,
        headerStyle: styles.header,
        style: { ...styles.cell,
          width: 90,
        }
      },
      {
        id: 'pods',
        label: 'pods',
        sortable: true,
        isNumeric: true,
        headerStyle: styles.header,
        style: { ...styles.cell,
          width: 50,
          textAlign: 'center',
        }
      },
      {
        id: 'containers',
        label: 'containers',
        sortable: true,
        isNumeric: true,
        headerStyle: {...styles.header,
          textAlign: 'center',
          whiteSpace: 'normal',
          lineHeight: '13px',
        },
        style: { ...styles.cell,
          width: 60,
          textAlign: 'center',
        }
      },
      {
        id: 'cpu_utilized',
        label: 'cpu used',
        sortable: true,
        isNumeric: true,
        headerStyle: {...styles.header,
          textAlign: 'center',
          whiteSpace: 'normal',
          lineHeight: '13px',
        },
        style: { ...styles.cell,
          width: 52,
          textAlign: 'right',
        },
      },
      {
        id: 'mem_utilized',
        label: 'mem used',
        sortable: true,
        isNumeric: true,
        headerStyle: {...styles.header,
          textAlign: 'center',
          whiteSpace: 'normal',
          lineHeight: '13px',
        },
        style: { ...styles.cell,
          width: 58,
          textAlign: 'right',
        },
      },
      {
        id: 'disk_utilized',
        label: 'disk used',
        sortable: true,
        isNumeric: true,
        headerStyle: {...styles.header,
          textAlign: 'center',
          whiteSpace: 'normal',
          lineHeight: '13px',
        },
        style: { ...styles.cell,
          width: 52,
          textAlign: 'right',
        },
      },
      {
        id: 'pad_right',
        label: '',
        headerStyle: {...styles.header,
          color: 'transparent',
          pointerEvents: 'none',
        },
        style: { ...styles.cell,
          width: 16,
        },
      },
      // {
      //   id: 'namespace',
      //   label: 'ns',
      //   sortable: true,
      //   headerStyle: styles.header,
      //   style: { ...styles.cell,
      //     width: 100,
      //   }
      // },
      
      // {
      //   id: 'actions',
      //   label: 'actions ',
      //   headerStyle: styles.header,
      //   style: { ...styles.cell,
      //     width: 55,
      //   },
      //   className: 'resource-actions',
      // },
    ]
  }

  resourcesToRows = (resources) => {
    return Object.values(resources).filter(el => !el.isFiltered)
  }

  shouldComponentUpdate = (nextProps, nextState) => {
    return !arraysEqual(this.props.filterNames, nextProps.filterNames)
      || !arraysEqual(this.props.possibleFilters, nextProps.possibleFilters)
      || this.state.actionsOpen !== nextState.actionsOpen
      || this.state.hoveredRow !== nextState.hoveredRow
      || this.props.resources !== nextProps.resources
      || this.props.nodeMetrics !== nextProps.nodeMetrics
      || this.props.resourceRevision !== nextProps.resourceRevision
      || this.props.metricsRevision !== nextProps.metricsRevision
  }

  handleActionsRequestClose = () => {
    this.setState({
      actionsOpen: false,
      hoveredRow: -1,
      hoveredResource: null,
    })
  }

  handleRowSelection = (selectedIds) => {
    if (!this.actionsClicked) {
      this.selectedIds = selectedIds
      this.deleteButton.setDisabled(Object.keys(selectedIds).length === 0)
    }
  }

  handleCellClick = (rowId, colId, resource, col) => {
    this.actionsClicked = false
    if (col.id === 'actions') {
      let trs = document.getElementsByClassName('cluster filter-table')[1].children[0].children
      this.setState({
        actionsOpen: true,
        actionsAnchor: trs[rowId].children[colId+1],
        hoveredRow: rowId,
        hoveredResource: resource,
      })
      this.actionsClicked = true
      return false
    } else {
      this.props.viewResource(resource)
      return false
    }
  }

  handleDelete = () => {
    if (this.selectedIds && Object.keys(this.selectedIds).length > 0) {
      let resources = []
      for (let id in this.selectedIds) {
        resources.push(this.props.resources[id])
      }
      this.props.removeResource(...resources)
      this.handleRowSelection({})
    }
  }

  componentWillUpdate = () => {
    setTimeout(() => {
      Perf.start()
    }, 0)
  }

  componentDidUpdate = () => {
    Perf.stop()
    let m = Perf.getLastMeasurements()
    Perf.printWasted(m)
  }

  componentWillReceiveProps = (nextProps) => {
    // this.rows = this.resourcesToRows(nextProps.resources)
    this.rows = Object.entries(nextProps.resources).map(([k,v])=> v).filter(v => v.kind === 'Node' && !v.isFiltered)
    this.nodes = Object.entries(nextProps.resources).map(([k,v])=> v).filter(v => v.kind === 'Node')
  }

  renderCell = (column, row) => {
    let { nodeMetrics } = this.props
    let value = ''
    let metrics = null
    switch(column) {
      case 'hostname':
        return row.metadata.labels[hostnameLabel]
      case 'namespace':
        return row.metadata.namespace
      case 'kind':
        return row.kind
      case 'mem_utilized':
        if (nodeMetrics && row.metadata.name in nodeMetrics) {
          metrics = nodeMetrics[row.metadata.name]
          value = Math.round(100 * metrics.memory.usage / metrics.memory.total) + '%'
        }
        return <span className="centered-percentage">{value}</span>
      case 'cpu_utilized':
        if (nodeMetrics && row.metadata.name in nodeMetrics) {
          metrics = nodeMetrics[row.metadata.name]
          value = Math.round(100 * metrics.cpu.usage / metrics.cpu.total) + '%'
        }
        return <span className="centered-percentage">{value}</span>
      case 'disk_utilized':
        if (nodeMetrics && row.metadata.name in nodeMetrics) {
          metrics = nodeMetrics[row.metadata.name]
          value = Math.round(100 * metrics.disk.usage / metrics.disk.total) + '%'
        }
        return <span className="centered-percentage">{value}</span>
      case 'pods':
        if (nodeMetrics && row.metadata.name in nodeMetrics) { 
          value = nodeMetrics[row.metadata.name].pods.usage
        }
        return value
      case 'containers':
        if (nodeMetrics && row.metadata.name in nodeMetrics) { 
          value = nodeMetrics[row.metadata.name].containers.usage
        }
        return value
      // case 'actions':
      //   return <IconMore color={'rgba(0,0,0,0.4)'} hoverColor={'rgba(0,0,0,0.87)'} data-rh="Actions..."/>
      case 'age':
        let age = Date.now() - Date.parse(row.metadata.creationTimestamp)
        return moment.duration(age).humanize()
      case 'status':
        return resourceStatusIcons[row.statusSummary]
      default:
        return ''
    }
  }

  getCellValue = (column, row) => {
    let { nodeMetrics } = this.props
    let value = -1
    switch(column) {
      case 'id':
        return row.key
      case 'hostname':
        return row.metadata.labels[hostnameLabel]
      case 'mem_utilized':
        if (nodeMetrics && row.metadata.name in nodeMetrics) {
          value = nodeMetrics[row.metadata.name].memory.ratio
        }
        return value
      case 'cpu_utilized':
        if (nodeMetrics && row.metadata.name in nodeMetrics) {
          value = nodeMetrics[row.metadata.name].cpu.ratio
        }
        return value
      case 'disk_utilized':
        if (nodeMetrics && row.metadata.name in nodeMetrics) {
          value = nodeMetrics[row.metadata.name].disk.ratio
        }
        return value
      case 'pods':
        if (nodeMetrics && row.metadata.name in nodeMetrics) {
          value = nodeMetrics[row.metadata.name].pods.usage
        }
        return value
      case 'containers':
        if (nodeMetrics && row.metadata.name in nodeMetrics) {
          value = nodeMetrics[row.metadata.name].containers.usage
        }
        return value
      case 'kind':
        return row.kind
      case 'age':
        return row.metadata.creationTimestamp
      case 'status':
        return row.statusSummary
      default:
        return ''
    }
  }

// selectedIds={this.selectedIds}
// onRowSelection={this.handleRowSelection.bind(this)}
// multiSelectable={true}

  render() {
    let { props } = this

    return (
    <div>
        <Tabs
          style={{background: 'white'}}
          tabItemContainerStyle={styles.tabs}
          contentContainerStyle={{overflow: 'hidden'}}
          inkBarStyle={styles.tabsInkBar}
          >
          <Tab label="Nodes" value="nodes">
            <Paper style={styles.paper}>
              <NodeHeatmap nodes={this.nodes} nodeMetrics={props.nodeMetrics} resourceRevision={props.resourceRevision}/>
              {renderFilters(props)}

              <FilterTable
                className={'cluster'}
                columns={this.columns}
                data={this.rows}
                height={'calc(100vh - 430px)'}
                displayRowCheckbox={false}
                onCellClick={this.handleCellClick.bind(this)}
                hoveredRow={this.state.hoveredRow}
                onRenderCell={this.renderCell}
                getCellValue={this.getCellValue}
                stripedRows={false}
                iconStyle={{fill: 'rgba(255,255,255,0.9)'}}
                iconInactiveStyle={{fill: 'rgba(255,255,255,0.5)'}}
                width={'calc(100vw - 60px)'}
                revision={props.resourceRevision + props.metricsRevision + props.filterNames.length}
                wrapperStyle={{marginLeft: - 15, marginRight: -15, overflowX: 'hidden', overflowY: 'auto'}}
                headerStyle={{backgroundColor: 'rgba(28,84,178,0.8)', color: 'white'}}
                />

              {this.state.hoveredResource &&
              <Popover
                className="actions-popover"
                style={styles.popover}
                open={this.state.actionsOpen}
                anchorEl={this.state.actionsAnchor}
                onRequestClose={this.handleActionsRequestClose}
                zDepth={0}
                anchorOrigin={{horizontal: 'left', vertical: 'bottom'}}
                targetOrigin={{horizontal: 'left', vertical: 'top'}}
              >
                {KubeKinds.cluster[this.state.hoveredResource.kind].hasLogs &&
                <FloatingActionButton mini={true} style={styles.miniButton}
                  onTouchTap={()=> { this.props.viewResource(this.state.hoveredResource,'logs') }}
                  data-rh="View Logs...">  
                  <IconLogs/>
                </FloatingActionButton>
                }

                {KubeKinds.cluster[this.state.hoveredResource.kind].hasTerminal &&
                <FloatingActionButton mini={true} style={styles.miniButton}
                  onTouchTap={()=> { this.props.viewResource(this.state.hoveredResource,'terminal') }}
                  data-rh="Open Terminal...">
                  <IconShell/>
                </FloatingActionButton>
                }

                {/* TODO: need to check whether this resource can actually be edited by the user */}
                <FloatingActionButton mini={true} style={styles.miniButton}
                  onTouchTap={()=> { this.props.viewResource(this.state.hoveredResource,'edit') }}
                  data-rh="Edit...">
                  <IconEdit/>
                </FloatingActionButton >
              </Popover>
              }
              {/* <Link to="/cluster/new" >
                <FloatingActionButton style={styles.newResourceButton} backgroundColor={blueA400}>
                  <IconAdd />
                </FloatingActionButton>
              </Link>

              <DeleteButton backgroundColor={red900} 
                mini={true} 
                style={styles.deleteResourceButton} 
                disabled={Object.keys(this.selectedIds).length === 0}
                onTouchTap={this.handleDelete}
                ref={(ref)=>{this.deleteButton = ref}}/> */}

            </Paper>



          </Tab>

          <Tab label="PersistentVolumes" value="persistentvolumes">
            
          </Tab>

          <Tab label="StorageClasses" value="storageclasses">
            
          </Tab>

        </Tabs>

        
    </div>
    )
  }
})))

// class DeleteButton extends React.Component {
  
//   constructor(props) {
//     super(props);
//     this.state = {
//       disabled: props.disabled,
//     }
//   }

//   setDisabled = (disabled) => {
//     this.setState({disabled: disabled})
//   }

//   render() {
//     let { props } = this
//     return <FloatingActionButton {...props} disabled={this.state.disabled}>
//        <IconDelete/>
//       </FloatingActionButton>
//   }

// }


function renderFilters(props) {

  return <ChipInput
    value={props.filterNames}
    onRequestAdd={(filter) => props.addFilter(filter)}
    onRequestDelete={(filter, index) => props.removeFilter(filter, index)}
    name={'filters'}
    dataSource={props.possibleFilters}
    floatingLabelText={'select by filters...'}
    defaultValue={['namespace:default']}
    menuProps={{
      desktop: true,
    }}
    chipRenderer={({ value, isFocused, isDisabled, handleClick, handleRequestDelete }, key) => {
      
      var labelText = value;
      var parts=value.split(":")
      if (parts.length === 2) {
        labelText=<span style={{fontWeight: 700}}><span style={{color: blueA400, paddingRight: 3}}>{parts[0]}:</span>{parts[1]}</span>
      } else if (parts.length === 1) {
        labelText=<span style={{fontWeight: 700}}><span style={{color: blueA400, paddingRight: 3}}>*:</span>{parts[0]}</span>
      }
      return (
        <Chip
          key={key}
          style={{
            margin: '8px 8px 0 0',
            padding: 0,
            float: 'left', 
            pointerEvents: isDisabled ? 'none' : undefined 
          }}
          labelStyle={{'lineHeight': '30px'}}
          backgroundColor={isFocused ? blueA100 : null}
          onTouchTap={handleClick}
          onRequestDelete={handleRequestDelete}
        >
        {labelText}
        </Chip>
      )}
    }
    underlineShow={true}
    fullWidth={true}
    style={styles.textField}
    inputStyle={styles.inputStyle}
    hintStyle={styles.hintStyle}
  />
}