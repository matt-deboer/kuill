import React from 'react'
import { Link } from 'react-router-dom'
import FloatingActionButton from 'material-ui/FloatingActionButton'
import RaisedButton from 'material-ui/RaisedButton'
import IconButton from 'material-ui/IconButton'
import { blueA400, grey200, grey300, grey500, grey800, blueA100, red900, white } from 'material-ui/styles/colors'
import { routerActions } from 'react-router-redux'
import { connect } from 'react-redux'
import { addFilter, removeFilter, removeResource, scaleResource } from '../state/actions/workloads'
import sizeMe from 'react-sizeme'
import FilterTable from './filter-table/FilterTable'
import * as moment from 'moment'

import ChipInput from 'material-ui-chip-input'
import Chip from 'material-ui/Chip'
import { withRouter } from 'react-router-dom'
import { linkForResource } from '../routes'
import IconAdd from 'material-ui/svg-icons/content/add'
import IconLogs from 'material-ui/svg-icons/action/receipt'
import IconShell from 'material-ui/svg-icons/hardware/computer'
import IconEdit from 'material-ui/svg-icons/editor/mode-edit'
import IconDelete from 'material-ui/svg-icons/action/delete'
import IconScale from 'material-ui/svg-icons/communication/import-export'
import IconSuspend from 'material-ui/svg-icons/content/block'

import IconMore from 'material-ui/svg-icons/navigation/more-horiz'
import Popover from 'material-ui/Popover'
import Paper from 'material-ui/Paper'

import { arraysEqual } from '../comparators'
import { resourceStatus as resourceStatusIcons } from './icons'
import { compareStatuses } from '../resource-utils'

import ConfirmationDialog from './ConfirmationDialog'
import ScaleDialog from './ScaleDialog'
import KubeKinds from '../kube-kinds'
import './WorkloadsPage.css'

import Perf from 'react-addons-perf'

const mapStateToProps = function(store) {
  return {
    filters: store.workloads.filters,
    filterNames: store.workloads.filterNames,
    possibleFilters: store.workloads.possibleFilters,
  };
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
    },
    scaleResource: function(resource, replicas) {
      dispatch(scaleResource(
        resource.metadata.namespace,
        resource.kind,
        resource.metadata.name,
        replicas))
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
  suspendResourceButton: {
    margin: 0,
    top: 110,
    right: 180,
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
    display: 'flex',
  },
  paper: {
    padding: 15,
    margin: 5,
  },
  statusIcon: {
    marginLeft: 10,
  },
  actionContainer: {
    position: 'relative',
    display: 'inline-block',
    float: 'left',
  },
  actionLabel: {
    position: 'absolute',
    bottom: 0,
    textAlign: 'center',
    width: '100%',
    color: white,
    fontSize: 10,
    zIndex: 100,
  },
  actionButton: {
    backgroundColor: 'transparent',
    marginTop: 4,
    marginBottom: 4,
    color: grey200,
    fontSize: 18,
    fontWeight: 600,
  },
  actionButtonLabel: {
    textTransform: 'none',
    color: grey300,
  },
  actionIcon: {
    color: white,
    marginTop: -4,
  },
  actionHoverStyle: {
    backgroundColor: '#999',
  }
}

// use functional component style for representational components
export default sizeMe({ monitorWidth: true, monitorHeight: true }) (
withRouter(connect(mapStateToProps, mapDispatchToProps) (
class WorkloadsPage extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      actionsOpen: false,
      deleteOpen: false,
      scaleOpen: false,
      suspendOpen: false,
      hoveredRow: -1,
      hoveredResources: null,
      selectedResources: [],
    }
    this.selectedIds = {}
    this.deleteEnabled = false
    this.suspendEnabled = false
    this.rows = this.resourcesToRows(props.resources)
    this.columns = [
      {
        id: 'kind',
        label: 'kind',
        sortable: true,
        headerStyle: styles.header,
        style: { ...styles.cell,
          width: '100px',
        }
      },
      {
        id: 'name',
        label: 'name',
        sortable: true,
        headerStyle: styles.header,
        style: { ...styles.cell,
          // width: '35%',
        },
      },
      {
        id: 'namespace',
        label: 'ns',
        sortable: true,
        headerStyle: styles.header,
        style: { ...styles.cell,
          width: 100,
        }
      },
      {
        id: 'pods',
        label: 'pods',
        sortable: true,
        isNumeric: true,
        headerStyle: styles.header,
        style: { ...styles.cell,
          width: 80,
        }
      },
      {
        id: 'status',
        label: 'status',
        headerStyle: styles.header,
        style: { ...styles.cell,
          width: 65,
          verticalAlign: 'middle',
          textAlign: 'center',
          paddingLeft: 30,
        },
        sortable: true,
        comparator: compareStatuses,
      },
      {
        id: 'age',
        label: 'age',
        sortable: true,
        headerStyle: {...styles.header,
          textAlign: 'center',
        },
        style: { ...styles.cell,
          width: 90,
        }
      },
      {
        id: 'actions',
        label: 'actions ',
        headerStyle: styles.header,
        style: { ...styles.cell,
          width: 55,
        },
        className: 'resource-actions',
      },
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
      || this.state.deleteOpen != nextState.deleteOpen
      || this.state.suspendOpen != nextState.suspendOpen
      || this.state.scaleOpen != nextState.scaleOpen
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
      this.deleteEnabled = this.canDelete(selectedIds)
      this.suspendEnabled = this.canSuspend(selectedIds)
      this.deleteButton.setDisabled(!this.deleteEnabled)
      this.suspendButton.setDisabled(!this.suspendEnabled)
    }
  }

  canSuspend = (selectedIds) => {
    for (let id in selectedIds) {
      if ('spec' in this.props.resources[id] && !!this.props.resources[id].spec.replicas) {
        return true
      }
    }
    return false
  }

  canDelete = (selectedIds) => {
    return Object.keys(selectedIds).length > 0
  }

  handleCellClick = (rowId, colId, resource, col) => {
    this.actionsClicked = false
    if (col.id === 'actions') {
      let trs = document.getElementsByClassName('workloads filter-table')[1].children[0].children
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

  handleDelete = (resource) => {
    let resources = []
    if (resource) {
      resources.push(resource)
    } else if (this.selectedIds && Object.keys(this.selectedIds).length > 0) {
      for (let id in this.selectedIds) {
        resources.push(this.props.resources[id])
      }
    }

    this.setState({
      selectedResources: resources,
      deleteOpen: true,
      actionsOpen: false,
    })

    // this.props.removeResource(...resources)
    // this.handleRowSelection({})
  }

  handleSuspend = (resource) => {
    let resources = []
    if (resource) {
      resources.push(resource)
    } else if (this.selectedIds && Object.keys(this.selectedIds).length > 0) {
      for (let id in this.selectedIds) {
        let resource = this.props.resources[id]
        if ('replicas' in resource.spec && resource.spec.replicas > 0) {
          resources.push(resource)
        }
      }
    }
    this.setState({
      selectedResources: resources,
      suspendOpen: true,
      actionsOpen: false,
    })

      // this.props.removeResource(...resources)
      // this.handleRowSelection({})
  }

  handleScale = () => {
    this.setState({
      scaleOpen: true,
      actionsOpen: false,
    })
  }

  handleRequestCloseDelete = () => {
    this.setState({
      deleteOpen: false,
      selectedResources: [],
    })
  }

  handleConfirmDelete = () => {
    this.setState({
      selectedResources: [],
      deleteOpen: false,
    })
    this.props.removeResource(...this.state.selectedResources)
    this.handleRowSelection({})
  }

  handleRequestCloseScale = () => {
    this.setState({
      scaleOpen: false,
      hoveredRow: -1,
    })
  }

  handleConfirmScale = (replicas) => {
    this.setState({
      scaleOpen: false,
    })
    if (replicas !== undefined) {
      this.props.scaleResource(this.state.hoveredResource, replicas)
    }
    // TODO: need to perform a targeted edit that only scales...
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
    for (let resource of this.state.selectedResources) {
      this.props.scaleResource(resource, 0)
    }
    this.handleRowSelection({})
    this.actionsClicked = false
    // TODO: need to perform a targeted edit that only scales...
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

    if (!this.state.actionsOpen) {
      this.actionsClicked = false
    }

  }

  componentWillReceiveProps = (nextProps) => {
    this.rows = this.resourcesToRows(nextProps.resources)
  }

  renderCell = (column, row) => {
    switch(column) {
      case 'name':
        return row.metadata.name
      case 'namespace':
        return row.metadata.namespace
      case 'kind':
        return row.kind
      case 'actions':
        return <IconMore color={'rgba(0,0,0,0.4)'} hoverColor={'rgba(0,0,0,0.87)'} data-rh="Actions..."/>
      case 'age':
        let age = Date.now() - Date.parse(row.metadata.creationTimestamp)
        return moment.duration(age).humanize()
      case 'status':
        return <div style={styles.statusIcon}>{resourceStatusIcons[row.statusSummary]}</div>
      case 'pods':
        if (row.kind === 'Deployment' || row.kind === 'ReplicaSet' || row.kind === 'ReplicationController') {
          return `${(row.status.readyReplicas || 0)} / ${row.spec.replicas}`
        } else if (row.kind === 'StatefulSet') {
          return `${(row.status.replicas || 0)} / ${row.spec.replicas}`
        } else {
          return ''
        }
      default:
        return ''
    }
  }

  getCellValue = (column, row) => {
    switch(column) {
      case 'id':
        return row.key
      case 'name':
        return row.metadata.name
      case 'namespace':
        return row.metadata.namespace
      case 'kind':
        return row.kind
      case 'age':
        return row.metadata.creationTimestamp
      case 'status':
        return row.statusSummary
      case 'pods':
        if (row.kind === 'Deployment' || row.kind === 'ReplicaSet' || row.kind === 'ReplicationController') {
          return (row.status.readyReplicas || 0)
        } else if (row.kind === 'StatefulSet') {
          return (row.status.replicas || 0)
        } else {
          return -1
        }
      default:
        return ''
    }
  }

  render() {
    let { props } = this

    return (
    <div>
      <Paper style={styles.paper}>
        
        {renderFilters(props)}

        <FilterTable
          className={'workloads'}
          columns={this.columns}
          data={this.rows}
          height={'calc(100vh - 310px)'}
          multiSelectable={true}
          onRowSelection={this.handleRowSelection.bind(this)}
          onCellClick={this.handleCellClick.bind(this)}
          hoveredRow={this.state.hoveredRow}
          onRenderCell={this.renderCell}
          getCellValue={this.getCellValue}
          selectedIds={this.selectedIds}
          stripedRows={false}
          iconStyle={{fill: 'rgba(255,255,255,0.9)'}}
          iconInactiveStyle={{fill: 'rgba(255,255,255,0.5)'}}
          width={'calc(100vw - 60px)'}
          wrapperStyle={{marginLeft: -15, marginRight: -15, overflowX: 'hidden', overflowY: 'auto'}}
          headerStyle={{backgroundColor: 'rgba(21, 61, 128, 0.5)', color: 'white'}}
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
          {(this.state.hoveredResource.kind === 'Pod' || this.getCellValue('pods', this.state.hoveredResource) > 0) &&
            <div style={styles.actionContainer}>
              <div style={styles.actionLabel}>logs</div>
              <IconButton
                onTouchTap={()=> { this.props.viewResource(this.state.hoveredResource,'logs') }}
                style={styles.actionButton}
                hoveredStyle={styles.actionHoverStyle}
                iconStyle={styles.actionIcon}
              >
                <IconLogs/>
              </IconButton>
            </div>
          }

          {(this.state.hoveredResource.kind === 'Pod' || this.getCellValue('pods', this.state.hoveredResource) > 0) &&
            <div style={styles.actionContainer}>
              <div style={styles.actionLabel}>term</div>
              <IconButton
                onTouchTap={()=> { this.props.viewResource(this.state.hoveredResource,'terminal') }}
                style={styles.actionButton}
                hoveredStyle={styles.actionHoverStyle}
                iconStyle={styles.actionIcon}
              >
                <IconShell/>
              </IconButton>
            </div>
          }
          
          {(this.getCellValue('pods', this.state.hoveredResource) > -1) && this.state.hoveredResource.spec.replicas > 0 &&
            <div style={styles.actionContainer}>
              <div style={styles.actionLabel}>suspend</div>
              <IconButton
                onTouchTap={()=>{ this.handleSuspend(this.state.hoveredResource)} }
                style={styles.actionButton}
                hoveredStyle={styles.actionHoverStyle}
                iconStyle={styles.actionIcon}
                >
                <IconSuspend/>
              </IconButton>
            </div>
          }

          {(this.getCellValue('pods', this.state.hoveredResource) > -1) &&
            <div style={styles.actionContainer}>
              <div style={styles.actionLabel}>scale</div>
              <IconButton
                onTouchTap={this.handleScale}
                style={styles.actionButton}
                hoveredStyle={styles.actionHoverStyle}
                iconStyle={styles.actionIcon}
                >
                <IconScale/>
              </IconButton>
            </div>
          }
          
          <div style={styles.actionContainer}>
            <div style={styles.actionLabel}>edit</div>
            <IconButton
              onTouchTap={()=> { this.props.viewResource(this.state.hoveredResource,'edit') }}
              style={styles.actionButton}
              hoveredStyle={styles.actionHoverStyle}
              iconStyle={styles.actionIcon}
              >
              <IconEdit/>
            </IconButton>
          </div>

          <div style={styles.actionContainer}>
            <div style={styles.actionLabel}>delete</div>
            <IconButton
              onTouchTap={()=>{ this.handleDelete(this.state.hoveredResources)} }
              style={styles.actionButton}
              hoveredStyle={styles.actionHoverStyle}
              iconStyle={styles.actionIcon}
              >
              <IconDelete/>
            </IconButton>
          </div>

        </Popover>
        }
        <Link to="/workloads/new" >
          <FloatingActionButton style={styles.newResourceButton} backgroundColor={blueA400}>
            <IconAdd />
          </FloatingActionButton>
        </Link>

        <MultiResourceActionButton backgroundColor={red900} 
          mini={true} 
          style={styles.deleteResourceButton} 
          disabled={!this.deleteEnabled}
          onTouchTap={this.handleDelete}
          ref={(ref)=>{this.deleteButton = ref}}
          data-rh={'Delete Selected...'}
          data-rh-at={'bottom'}>
            <IconDelete/>
        </MultiResourceActionButton>

        <MultiResourceActionButton backgroundColor={grey800} 
          mini={true} 
          style={styles.suspendResourceButton} 
          disabled={!this.suspendEnabled}
          onTouchTap={this.handleSuspend}
          ref={(ref)=>{this.suspendButton = ref}}
          data-rh={'Suspend Selected...'}
          data-rh-at={'bottom'}>
            <IconSuspend/>
        </MultiResourceActionButton>

        <ConfirmationDialog 
          open={this.state.deleteOpen}
          title={'Delete Resource(s):'}
          message={`Are you sure you want to delete the following ` +
           `${this.state.selectedResources.length > 1 ? this.state.selectedResources.length + ' ' : ''}` +
           `resource${this.state.selectedResources.length > 1 ? 's':''}?`}
          resources={this.state.selectedResources}
          onRequestClose={this.handleRequestCloseDelete}
          onConfirm={this.handleConfirmDelete}
          />
       
        <ConfirmationDialog 
          open={this.state.suspendOpen}
          title={'Suspend Resource(s):'}
          message={`Are you sure you want to suspend the following ` +
           `${this.state.selectedResources.length > 1 ? this.state.selectedResources.length + ' ' : ''}` +
           `resource${this.state.selectedResources.length > 1 ? 's':''} (by scaling to 0 replicas)?`}
          resources={this.state.selectedResources}
          onRequestClose={this.handleRequestCloseSuspend}
          onConfirm={this.handleConfirmSuspend}
          />

        <ScaleDialog 
          open={this.state.scaleOpen}
          resource={this.state.hoveredResource}
          onRequestClose={this.handleRequestCloseScale}
          onConfirm={this.handleConfirmScale}
          />

      </Paper>
    </div>
    )
  }
})))

class MultiResourceActionButton extends React.Component {
  
  constructor(props) {
    super(props);
    this.state = {
      disabled: props.disabled,
    }
  }

  setDisabled = (disabled) => {
    this.setState({disabled: disabled})
  }

  render() {
    let { props } = this
    return <FloatingActionButton {...props} disabled={this.state.disabled}>
       {props.children}
      </FloatingActionButton>
  }

}


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