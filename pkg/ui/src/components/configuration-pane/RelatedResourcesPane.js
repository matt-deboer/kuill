import React from 'react'
import PropTypes from 'prop-types'
import { removeResource, requestResources, viewResource, addFilter, removeFilter, detachResource } from '../../state/actions/resources'
import { red900 } from 'material-ui/styles/colors'
import { requestMetrics } from '../../state/actions/metrics'
import { compareStatuses } from '../../utils/resource-utils'
import { objectEmpty } from '../../comparators'
import { getResourceCellValue, renderResourceCell } from '../../utils/resource-column-utils'
import sizeMe from 'react-sizeme'
import { connect } from 'react-redux'
import IconDelete from 'material-ui/svg-icons/action/delete'
import FilterBox from '../FilterBox'
import FilterTable from '../filter-table/FilterTable'
import RowActionMenu from '../RowActionMenu'
import ConfirmationDialog from '../ConfirmationDialog'
import Checkbox from 'material-ui/Checkbox'
import MultiResourceActionButton from '../MultiResourceActionButton'
import './PodsForNodePane.css'

const mapStateToProps = function(store) {
  return {
    resources: store.resources.resources,
    podsByEndpoint: store.resources.podsByEndpoint,
    accessEvaluator: store.session.accessEvaluator,
    linkGenerator: store.session.linkGenerator,
    maxResourceVersionByKind: store.resources.maxResourceVersionByKind,
    resourceRevision: store.resources.revision,
    podMetrics: store.metrics.pod,
    filterNames: store.resources.filterNames,
    autocomplete: store.resources.autocomplete.workloads,
  }
}

const mapDispatchToProps = function(dispatch, ownProps) {
  return {
    viewResource: function(resource, view='config') {
      dispatch(viewResource(resource,view))
    },
    requestResources: function() {
      dispatch(requestResources())
    },
    requestMetrics: function() {
      dispatch(requestMetrics())
    },
    removeResource: function(...resources) {
      dispatch(removeResource(...resources))
    },
    detachResource: function(resource) {
      dispatch(detachResource(resource))
    },
    addFilter: function(filterName) {
      dispatch(addFilter(filterName))
    },
    removeFilter: function(filterName, index) {
      dispatch(removeFilter(filterName, index))
    },
  } 
}

const styles = {
  header: {
    fontWeight: 600,
    fontSize: '13px',
    color: 'white',
    fill: 'white',
  },
  cell: {
    paddingLeft: 2,
    paddingRight: 2,
  },
  deleteResourceButton: {
    margin: 0,
    top: 20,
    right: 40,
    bottom: 'auto',
    left: 'auto',
    position: 'absolute',
  },
}

export default sizeMe({ monitorHeight: true, monitorWidth: true }) (
connect(mapStateToProps, mapDispatchToProps) (
class RelatedResourcesPane extends React.PureComponent {
  
  static propTypes = {
    node: PropTypes.object.isRequired,
  }

  static defaultProps = {
  }

  constructor(props) {
    super(props)
    this.state = {
      actionsOpen: false,
      deleteOpen: false,
      hoveredRow: -1,
      hoveredResources: null,
      selectedResources: [],
      relatedResources: [],
    }
    this.selectedIds = {}
    this.columns = [
      {
        id: 'kind',
        label: 'kind',
        sortable: true,
        headerStyle: styles.header,
        style: { ...styles.cell,
          width: '8%',
        },
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
        id: 'cpu_utilized',
        label: <div><span>cpu</span><br/><span>used</span></div>,
        sortable: true,
        isNumeric: true,
        headerStyle: {...styles.header,
          textAlign: 'center',
          whiteSpace: 'normal',
          lineHeight: '13px',
          padding: 0,
        },
        style: { ...styles.cell,
          width: '7%',
          textAlign: 'right',
          paddingRight: '2%',
        },
      },
      {
        id: 'mem_utilized',
        label: <div><span>Gi mem</span><br/><span>used</span></div>,
        sortable: true,
        isNumeric: true,
        headerStyle: {...styles.header,
          textAlign: 'center',
          whiteSpace: 'normal',
          lineHeight: '13px',
          padding: 0,
        },
        style: { ...styles.cell,
          width: '7%',
          textAlign: 'right',
          paddingRight: '2%',
        },
      },
      {
        id: 'disk_utilized',
        label: <div><span>Gi disk</span><br/><span>used</span></div>,
        sortable: true,
        isNumeric: true,
        headerStyle: {...styles.header,
          textAlign: 'center',
          whiteSpace: 'normal',
          lineHeight: '13px',
          padding: 0,
        },
        style: { ...styles.cell,
          width: '7%',
          textAlign: 'right',
          paddingRight: '2%',
        },
      },
      {
        id: 'status',
        label: 'status',
        headerStyle: styles.header,
        style: { ...styles.cell,
          width: '7%',
          verticalAlign: 'middle',
          textAlign: 'center',
          paddingLeft: '1%',
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
          width: '10%',
          textAlign: 'center',
        }
      },
      {
        id: 'actions',
        label: 'actions ',
        headerStyle: {...styles.header,
          paddingLeft: 0,
          paddingRight: 10,
        },
        style: { ...styles.cell,
          width: 55,
          lineHeight: '50px',
        },
        className: 'resource-actions',
      },
    ]
    for (let fn of [
      'renderCell',
      'getCellValue',
      'handleRowSelection',
      'handleCellClick',
    ]) {
      this[fn] = this[fn].bind(this)
    }
  }

  componentDidMount = () => {
    this.setState({
      relatedResources: this.resolveRelated(this.props.resource, this.props.resources),
    })
  }

  renderCell = (column, row) => {
    return renderResourceCell(column, row, this.props.podMetrics)
  }

  getCellValue = (column, row) => {
    return getResourceCellValue(column, row, this.props.podMetrics)
  }

  componentDidUpdate = () => {
    if (!this.state.actionsOpen) {
      this.actionsClicked = false
    }
  }

  handleActionsRequestClose = () => {
    this.setState({
      actionsOpen: false,
      hoveredRow: -1,
      hoveredResource: null,
    })
  }

  handleCellClick = (rowId, colId, resource, col) => {
    this.actionsClicked = false
    if (col.id === 'actions') {
      let trs = document.getElementsByClassName('pods filter-table')[1].children[0].children
      let that = this
      this.props.accessEvaluator.getObjectAccess(resource, 'workloads').then((access) => {
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

  handleRowSelection = (selectedIds) => {
    if (!this.actionsClicked) {
      this.selectedIds = selectedIds
      this.deleteEnabled = !objectEmpty(selectedIds)
      this.deleteButton.setDisabled(!this.deleteEnabled)
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
    this.props.removeResource(...this.state.selectedResources)
    this.setState({
      selectedResources: [],
      deleteOpen: false,
    })
    this.handleRowSelection({})
  }

  handleDetach = (resource) => {
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
      detachOpen: true,
      actionsOpen: false,
    })
  }

  handleRequestCloseDetach = () => {
    this.setState({
      detachOpen: false,
      selectedResources: [],
    })
  }

  toggleOpenTerminalOnDetach = () => {
    this.setState({
      openTerminalOnDetach: !this.state.openTerminalOnDetach,
    })
  }

  handleConfirmDetach = () => {
    this.props.detachResource(...this.state.selectedResources)
    this.setState({
      selectedResources: [],
      detachOpen: false,
    })
    this.handleRowSelection({})
  }

  resolveRelated = (resource, resources) => {
    let related = []
    if (!!resources) {
      // resolved owned resources
      this.resolveOwned(resource, related)
      let relKeys = [].concat.apply([], related.map(r=>r.related ? Object.keys(r.related) : []))
      let relatedResources = {}
      while (relKeys.length > 0) {
        let key = relKeys.shift()
        if (!(key in relatedResources)) {
          let r = resources[key]
          relatedResources[key] = r
          if (r.related) {
            for (let relKey in r.related) {
              if (!(relKey in relatedResources)) {
                relKeys.push(relKey)
              }
            }
          }
        }
      }
      related.push(...Object.values(relatedResources))
    }
    return related.filter(e=>!e.isFiltered)
  }

  resolveOwned = (resource, related) => {
    if (resource.owned) {
      let owned = Object.values(resource.owned)
      while (owned.length) {
        let r = owned.shift()
        if (r.owned) {
          owned.push(...Object.values(r.owned))
        }
        related.push(r)
      }
    }
  }


  componentWillReceiveProps = (props) => {
    if (props.resourceRevision !== this.props.resourceRevision
      || props.filterNames !== this.props.filterNames
    ) {
      this.setState({
        relatedResources: this.resolveRelated(props.resource, props.resources)
      })
    }
  }

  shouldComponentUpdate = (nextProps, nextState) => {
    return nextState.actionsOpen !== this.state.actionsOpen
        || nextProps.resourceRevision !== this.props.resourceRevision
        || nextProps.contentTop !== this.props.contentTop
        || nextState.relatedResources !== this.state.relatedResources
        || nextProps.filterNames !== this.props.filterNames
        || nextState.openTerminalOnDetach !== this.state.openTerminalOnDetach
        || nextState.deleteOpen !== this.state.deleteOpen
        || nextState.detachOpen !== this.state.detachOpen
        || nextState.selectedResources !== this.state.selectedResources
  }

  render() {
  
    let { props } = this

    return (
      <div style={{padding: '0 15px'}}>
        <FilterBox
          addFilter={props.addFilter} 
          removeFilter={props.removeFilter}
          filterNames={props.filterNames}
          autocomplete={props.autocomplete}
          />

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

        <FilterTable
          className={'pods'}
          columns={this.columns}
          data={this.state.relatedResources}
          height={`calc(100vh - ${props.contentTop + 177}px)`}
          multiSelectable={true}
          onRowSelection={this.handleRowSelection}
          onCellClick={this.handleCellClick}
          hoveredRow={this.state.hoveredRow}
          onRenderCell={this.renderCell}
          getCellValue={this.getCellValue}
          selectedIds={this.selectedIds}
          stripedRows={false}
          iconStyle={{fill: 'rgba(255,255,255,0.9)'}}
          iconInactiveStyle={{fill: 'rgba(255,255,255,0.5)'}}
          width={'calc(100vw - 60px)'}
          wrapperStyle={{marginLeft: -15, marginRight: -15, overflowX: 'hidden', overflowY: 'auto'}}
          headerStyle={{backgroundColor: 'rgba(185, 162, 131, 0.85)', color: 'white'}}
          />
        
      <RowActionMenu
        open={!!this.state.hoveredResource}
        handlers={{
          logs: ()=> { this.props.viewResource(this.state.hoveredResource,'logs') },
          term: ()=> { this.props.viewResource(this.state.hoveredResource,'terminal') },
          edit: ()=> { this.props.viewResource(this.state.hoveredResource,'edit') },
          detach: ()=> {this.handleDetach(this.state.hoveredResource)},
          delete: ()=>{ this.handleDelete(this.state.hoveredResource)},
          close: this.handleActionsRequestClose,
        }}
        access={this.state.hoveredResourceAccess}
        anchorEl={this.state.actionsAnchor}
        />

      <ConfirmationDialog 
        open={this.state.deleteOpen}
        title={'Delete Resource(s):'}
        message={`Are you sure you want to delete the following ` +
          `${this.state.selectedResources.length > 1 ? this.state.selectedResources.length + ' ' : ''}` +
          `resource${this.state.selectedResources.length > 1 ? 's':''}?`}
        resources={this.state.selectedResources}
        onRequestClose={this.handleRequestCloseDelete}
        onConfirm={this.handleConfirmDelete}
        linkGenerator={this.props.linkGenerator}
        />

      <ConfirmationDialog 
        open={this.state.detachOpen}
        title={'Detach Resource:'}
        message={`Are you sure you want to detach the following resource?`}
        resources={this.state.selectedResources}
        onRequestClose={this.handleRequestCloseDetach}
        onConfirm={this.handleConfirmDetach}
        linkGenerator={this.props.linkGenerator}
        >
        <p>
          This object will no longer count among the replicas for it's owner.
          <br/>
          Note: You can view "detached" resources in the workloads view by adding the filter 'detached:true'
        </p>
        <Checkbox
          label="Open terminal view"
          className={'open-term'}
          checked={this.state.openTerminalOnDetach}
          onCheck={this.toggleOpenTerminalOnDetach}
          style={styles.checkbox}
          labelStyle={styles.checkboxLabel}
        />
      </ConfirmationDialog>
    </div>
    )
  }

}))
