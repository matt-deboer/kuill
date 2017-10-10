import React from 'react'
import { Link } from 'react-router-dom'
import FloatingActionButton from 'material-ui/FloatingActionButton'
import { blueA400, grey500, red900, white } from 'material-ui/styles/colors'
import { routerActions } from 'react-router-redux'
import { connect } from 'react-redux'
import { addFilter, removeFilter, removeResource } from '../../state/actions/access'
import sizeMe from 'react-sizeme'
import FilterTable from '../filter-table/FilterTable'
import { toHumanizedAge } from '../../converters'

import { withRouter } from 'react-router-dom'
import { linkForResource } from '../../routes'
import IconAdd from 'material-ui/svg-icons/content/add'
import IconDelete from 'material-ui/svg-icons/action/delete'

import IconMore from 'material-ui/svg-icons/navigation/more-horiz'

import { arraysEqual } from '../../comparators'
import { resourceStatus as resourceStatusIcons } from '../icons'

import FilterBox from '../FilterBox'
import ConfirmationDialog from '../ConfirmationDialog'
import FilteredResourceCountsPanel from '../FilteredResourceCountsPanel'
import RowActionMenu from '../RowActionMenu'

import Perf from 'react-addons-perf'

const mapStateToProps = function(store) {
  return {
    filters: store.access.filters,
    filterNames: store.access.filterNames,
    possibleFilters: store.access.possibleFilters,
    resources: store.access.resources,
    accessEvaluator: store.session.accessEvaluator,
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
  } 
}

const styles = {
  newResourceButton: {
    margin: 0,
    top: 140,
    right: 60,
    bottom: 'auto',
    left: 'auto',
    position: 'fixed',
  },
  deleteResourceButton: {
    margin: 0,
    top: 150,
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
  wrapper: {
    padding: 15,
    margin: 0,
    height: 'calc(100vh - 190px)',
    // border: '1px solid rgba(33,33,33,0.8)',
  },
  statusIcon: {
    marginLeft: 10,
  },
}

// use functional component style for representational components
export default sizeMe({ monitorWidth: true, monitorHeight: true }) (
withRouter(connect(mapStateToProps, mapDispatchToProps) (
class ResourcesTab extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      actionsOpen: false,
      deleteOpen: false,
      hoveredRow: -1,
      hoveredResources: null,
      selectedResources: [],
    }
    this.selectedIds = {}
    this.deleteEnabled = false
    this.rows = this.resourcesToRows(props.resources)
    this.columns = [
      {
        id: 'kind',
        label: 'kind',
        sortable: true,
        headerStyle: styles.header,
        style: { ...styles.cell,
          width: 120,
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
        headerStyle: {...styles.header,
          textAlign: 'center',
          lineHeight: '50px',
        },
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
      || this.state.deleteOpen !== nextState.deleteOpen
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
      let trs = document.getElementsByClassName('access filter-table')[1].children[0].children
      let that = this
      this.props.accessEvaluator.getObjectAccess(resource, 'access').then((access) => {
        that.setState({
          actionsOpen: true,
          actionsAnchor: trs[rowId].children[colId+1],
          hoveredRow: rowId,
          hoveredResource: resource,
          hoveredResourceAccess: access,
        })
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
    this.setState({filters: nextProps})
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
        return toHumanizedAge(age)
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
      <div style={styles.wrapper}>
        
        <FilterBox
          addFilter={props.addFilter} 
          removeFilter={props.removeFilter}
          filterNames={props.filterNames}
          possibleFilters={props.possibleFilters}
          />

        <FilteredResourceCountsPanel 
          resources={props.resources} 
          style={{backgroundColor: 'rgb(99,99,99)'}}/>

        <FilterTable
          className={'access'}
          columns={this.columns}
          data={this.rows}
          height={'calc(100vh - 400px)'}
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
          width={'calc(100vw - 50px)'}
          wrapperStyle={{marginLeft: -15, marginRight: -15, overflowX: 'hidden', overflowY: 'auto'}}
          headerStyle={{backgroundColor: 'rgba(28,84,178,0.8)', color: 'white'}}
          />

        <RowActionMenu
          open={!!this.state.hoveredResource}
          handlers={{
            edit: ()=> { this.props.viewResource(this.state.hoveredResource,'edit') },
            delete: ()=>{ this.handleDelete(this.state.hoveredResources)},
            close: this.handleActionsRequestClose,
          }}
          access={this.state.hoveredResourceAccess}
          anchorEl={this.state.actionsAnchor}
          />

        <Link to="/access/new" >
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
