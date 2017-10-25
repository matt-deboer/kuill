import React from 'react'
import FloatingActionButton from 'material-ui/FloatingActionButton'
import { blueA400, grey500, grey600, blueA100, white } from 'material-ui/styles/colors'
import { connect } from 'react-redux'
import { requestResources, addFilter, removeFilter, removeResource, viewResource } from '../../state/actions/resources'
import sizeMe from 'react-sizeme'
import FilterTable from '../filter-table/FilterTable'
import FilterChip from '../FilterChip'
import { toHumanizedAge, convertUnits } from '../../converters'
import { withRouter } from 'react-router-dom'
import IconShell from 'material-ui/svg-icons/hardware/computer'
import IconEdit from 'material-ui/svg-icons/editor/mode-edit'

import Popover from 'material-ui/Popover'
import Paper from 'material-ui/Paper'

import { arraysEqual } from '../../comparators'
import { resourceStatus as resourceStatusIcons } from '../icons'
import { compareStatuses } from '../../utils/resource-utils'
import NodeHeatmap from '../dashboard/NodeHeatmap'
import FilterBox from '../FilterBox'
import EmptyListPage from '../EmptyListPage'
import LoadingSpinner from '../LoadingSpinner'
import {
  zoneLabel,
  regionLabel,
  instanceTypeLabel,
  roleLabel,
  hostnameLabel
} from '../../utils/filter-utils'

import './NodesTab.css'

import Perf from 'react-addons-perf'

const mapStateToProps = function(store) {
  return {
    filters: store.resources.filters,
    filterNames: store.resources.filterNames,
    fetching: store.requests.fetching,
    autocomplete: store.resources.autocomplete.nodes,
    resourceRevision: store.resources.resourceRevision,
    nodeMetrics: store.metrics.node,
    metricsRevision: store.metrics.revision,
    resources: store.resources.resources,
    kinds: store.apimodels.kinds,
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
      dispatch(viewResource(resource,view))
    },
    removeResource: function(...resources) {
      dispatch(removeResource(...resources))
    },
    requestResources: function() {
      dispatch(requestResources())
    },
  } 
}

var includedLabels = {}
includedLabels[zoneLabel]=true
includedLabels[regionLabel]=true
includedLabels[instanceTypeLabel]=true
includedLabels[roleLabel]=true

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
class NodesTab extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      actionsOpen: false,
      hoveredRow: -1,
      hoveredResources: null,
    }
    this.selectedIds = {}
    this.extractNodes(props.resources)
    // this.nodes = Object.entries(props.resources).map(([k,v])=> v).filter(v => v.kind === 'Node')
    // this.rows = Object.entries(this.nodes).map(([k,v])=> v).filter(v => !v.isFiltered)
    this.columns = [
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
          width: '20%',
          paddingLeft: 20,
        },
      },
      {
        id: 'labels',
        label: 'labels',
        headerStyle: styles.header,
        clickDisabled: true,
        style: { ...styles.cell,
          width: '35%',
        }
      },
      {
        id: 'age',
        label: 'age',
        sortable: true,
        headerStyle: styles.header,
        style: { ...styles.cell,
          width: '10%',
        }
      },
      {
        id: 'pods',
        label: 'pods',
        sortable: true,
        isNumeric: true,
        headerStyle: styles.header,
        style: { ...styles.cell,
          width: '8%',
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
          width: '8%',
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
          width: '8%',
          textAlign: 'right',
        },
      },
      {
        id: 'cpu_total',
        label: 'cpu total',
        sortable: true,
        isNumeric: true,
        headerStyle: {...styles.header,
          textAlign: 'center',
          whiteSpace: 'normal',
          lineHeight: '13px',
          paddingRight: 0,
        },
        style: { ...styles.cell,
          width: '8%',
          textAlign: 'right',
          paddingRight: '1%',
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
          width: '9%',
          textAlign: 'right',
        },
      },
      {
        id: 'mem_total',
        label: 'mem total',
        sortable: true,
        isNumeric: true,
        headerStyle: {...styles.header,
          textAlign: 'center',
          whiteSpace: 'normal',
          lineHeight: '13px',
          paddingRight: 0,
        },
        style: { ...styles.cell,
          width: '9%',
          textAlign: 'right',
          paddingRight: '1%',
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
          width: '8%',
          textAlign: 'right',
        },
      },
      {
        id: 'disk_total',
        label: 'disk total',
        sortable: true,
        isNumeric: true,
        headerStyle: {...styles.header,
          textAlign: 'center',
          whiteSpace: 'normal',
          lineHeight: '13px',
          paddingRight: 0,
        },
        style: { ...styles.cell,
          width: '8%',
          textAlign: 'right',
          paddingRight: '1%',
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

  extractNodes = (resources) => {
    this.nodes = Object.entries(resources).map(([k,v])=> v).filter(v => v.kind === 'Node')
    let allLabels = {}
    this.rows = Object.entries(this.nodes).map(([k,v])=> v).filter(v => {
      for (let key in v.metadata.labels) {
        allLabels[key] = allLabels[key] || {}
        allLabels[key][v.metadata.labels[key]] = true
      }
      return !v.isFiltered
    })
    this.labelsOfInterest = {}
    for (let name in allLabels) {
      if (Object.keys(allLabels[name]).length > 1 && (name in includedLabels)) {
        this.labelsOfInterest[name]=true
      }
    }
  }

  resourcesToRows = (resources) => {
    return Object.values(resources).filter(el => !el.isFiltered)
  }

  shouldComponentUpdate = (nextProps, nextState) => {
    return !arraysEqual(this.props.filterNames, nextProps.filterNames)
      || !arraysEqual(this.props.autocomplete, nextProps.autocomplete)
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
      if (!col.clickDisabled) {
        this.props.viewResource(resource)
      }
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
    this.extractNodes(nextProps.resources)
  }

  renderCell = (column, row) => {
    let { nodeMetrics } = this.props
    let value = ''
    let metrics = null
    let that = this
    switch(column) {
      case 'hostname':
        return row.metadata.labels[hostnameLabel]
      case 'namespace':
        return row.metadata.namespace
      case 'kind':
        return row.kind
      case 'labels':
        return <div>
          {Object.entries(row.metadata.labels).filter(([key, val])=> (key in this.labelsOfInterest))
            .map(([key, val]) => {
              let prefix = `${key.split('/').pop()}`
              return <FilterChip key={key} prefix={prefix} suffix={val} 
                labelStyle={{fontSize: 10}} style={{margin: '5px 5px 0 0',}}
                onTouchTap={that.props.addFilter.bind(that, `${prefix}:${val}`)}
              />
            })
          }
        </div>
      case 'mem_utilized':
        if (nodeMetrics && row.metadata.name in nodeMetrics) {
          metrics = nodeMetrics[row.metadata.name]
          value = Math.round(100 * metrics.memory.usage / metrics.memory.total) + '%'
        }
        return <span className="centered-percentage">{value}</span>
      case 'mem_total':
        if (nodeMetrics && row.metadata.name in nodeMetrics) {
          metrics = nodeMetrics[row.metadata.name]
          value = convertUnits(metrics.memory.total, 'bytes', 'gibibytes')
        } else {
          value = 0
        }
        return value.toFixed(2) + ' Gi'
      case 'cpu_utilized':
        if (nodeMetrics && row.metadata.name in nodeMetrics) {
          metrics = nodeMetrics[row.metadata.name]
          value = Math.round(100 * metrics.cpu.usage / metrics.cpu.total) + '%'
        }
        return <span className="centered-percentage">{value}</span>
      case 'cpu_total':
        if (nodeMetrics && row.metadata.name in nodeMetrics) {
          metrics = nodeMetrics[row.metadata.name]
          value = convertUnits(metrics.cpu.total, 'millicores', 'cores')
        }
        return value
      case 'disk_utilized':
        if (nodeMetrics && row.metadata.name in nodeMetrics) {
          metrics = nodeMetrics[row.metadata.name]
          value = Math.round(100 * metrics.disk.usage / metrics.disk.total) + '%'
        }
        return <span className="centered-percentage">{value}</span>
      case 'disk_total':
        if (nodeMetrics && row.metadata.name in nodeMetrics) {
          metrics = nodeMetrics[row.metadata.name]
          value = convertUnits(metrics.disk.total, 'bytes', 'gibibytes')
        } else {
          value = 0
        }
        return value.toFixed(1) + ' Gi'
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
        return toHumanizedAge(age)
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
      case 'mem_total':
        if (nodeMetrics && row.metadata.name in nodeMetrics) {
          value = nodeMetrics[row.metadata.name].memory.total
        }
        return value
      case 'cpu_utilized':
        if (nodeMetrics && row.metadata.name in nodeMetrics) {
          value = nodeMetrics[row.metadata.name].cpu.ratio
        }
        return value
      case 'cpu_total':
        if (nodeMetrics && row.metadata.name in nodeMetrics) {
          value = nodeMetrics[row.metadata.name].cpu.total
        }
        return value
      case 'disk_utilized':
        if (nodeMetrics && row.metadata.name in nodeMetrics) {
          value = nodeMetrics[row.metadata.name].disk.ratio
        }
        return value
      case 'disk_total':
        if (nodeMetrics && row.metadata.name in nodeMetrics) {
          value = nodeMetrics[row.metadata.name].disk.total
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

  render() {
    let { props } = this

    return (
      <Paper style={styles.paper}>
        <NodeHeatmap nodes={this.nodes} nodeMetrics={props.nodeMetrics} resourceRevision={props.resourceRevision}/>
        
        <EmptyListPage 
          visible={this.rows.length === 0 && Object.keys(props.fetching).length === 0}
            style={{
            top: 0,
            left: 'auto',
            marginTop: 15,
            paddingTop: 5,
            height: 'calc(100vh - 353px)',
            width: 'calc(100vw - 80px)',
            position: 'relative',
          }}
          imageStyle={{
            height: 325,
            backgroundSize: '300px',
          }}
          />

        <LoadingSpinner loading={Object.keys(this.props.fetching).length > 0} />

        {this.rows.length > 0 &&
          <FilterBox
          addFilter={props.addFilter} 
          removeFilter={props.removeFilter}
          filterNames={props.filterNames}
          autocomplete={props.autocomplete}
          />
        }

        {this.rows.length > 0 &&
          <FilterTable
            className={'nodes'}
            columns={this.columns}
            data={this.rows}
            initialOrderBy={'status'}
            initialOrder={'desc'}
            height={'calc(100vh - 480px)'}
            displayRowCheckbox={false}
            onCellClick={this.handleCellClick.bind(this)}
            hoveredRow={this.state.hoveredRow}
            onRenderCell={this.renderCell}
            getCellValue={this.getCellValue}
            stripedRows={false}
            iconStyle={{fill: 'rgba(255,255,255,0.9)'}}
            iconInactiveStyle={{fill: 'rgba(255,255,255,0.5)'}}
            width={'calc(100vw - 50px)'}
            revision={props.resourceRevision + props.metricsRevision + props.filterNames.length}
            wrapperStyle={{marginLeft: - 15, marginRight: -15, overflowX: 'hidden', overflowY: 'auto'}}
            headerStyle={{backgroundColor: 'rgb(66, 77, 99)', color: 'white'}}
            />
        }

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
          {/* can we get a terminal into the kubelet itself? */}

          {this.props.kinds.cluster[this.state.hoveredResource.kind].hasTerminal &&
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
       
      </Paper>
    )
  }
})))
