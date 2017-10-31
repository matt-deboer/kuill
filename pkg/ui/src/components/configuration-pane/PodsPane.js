import React from 'react'
import PropTypes from 'prop-types'
import { removeResource, requestResources, viewResource } from '../../state/actions/resources'
import { requestMetrics } from '../../state/actions/metrics'
import { compareStatuses } from '../../utils/resource-utils'
import { getResourceCellValue, renderResourceCell } from '../../utils/resource-column-utils'
import sizeMe from 'react-sizeme'
import { connect } from 'react-redux'
import FilterTable from '../filter-table/FilterTable'
import RowActionMenu from '../RowActionMenu'
import ConfirmationDialog from '../ConfirmationDialog'
import './PodsPane.css'

const mapStateToProps = function(store) {
  return {
    resources: store.resources.resources,
    accessEvaluator: store.session.accessEvaluator,
    linkGenerator: store.session.linkGenerator,
    podsRevision: store.resources.maxResourceVersionByKind.Pod,
    podMetrics: store.metrics.pod,
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
}

export default sizeMe({ monitorHeight: true, monitorWidth: true }) (
connect(mapStateToProps, mapDispatchToProps) (
class PodsPane extends React.Component {
  
  static propTypes = {
    node: PropTypes.object.isRequired,
  }

  static defaultProps = {
  }

  constructor(props) {
    super(props)
    this.state = {
      nodeName: props.node.metadata.name,
      actionsOpen: false,
      deleteOpen: false,
      hoveredRow: -1,
      hoveredResources: null,
      selectedResources: [],
    }
    this.selectedIds = {}
    this.columns = [
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
      pods: this.resolvePods(this.props.resources, this.props.node.metadata.name),
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
      this.deleteEnabled = this.canDelete(selectedIds)
      this.suspendEnabled = this.canSuspend(selectedIds)
      this.deleteButton.setDisabled(!this.deleteEnabled)
      this.suspendButton.setDisabled(!this.suspendEnabled)
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

  resolvePods = (resources, nodeName) => {
    let pods = []
    if (!!resources) {
      for (let key in resources) {
        if (!key.startsWith('Pod/')) {
          continue
        }
        let pod = resources[key]
        if (pod.spec.nodeName === nodeName) {
          pods.push(pod)
        }
      }
    }
    return pods
  }

  componentWillReceiveProps = (props) => {
    this.setState({
      pods: this.resolvePods(props.resources, this.state.nodeName)
    })
  }

  shouldComponentUpdate = (nextProps, nextState) => {
    return nextProps.podsRevision !== this.props.podsRevision
        || nextState.actionsOpen !== this.state.actionsOpen
        || nextProps.contentTop !== this.props.contentTop
  }

  render() {
  
    let { props } = this

    return (
      <div>
        <FilterTable
          className={'pods'}
          columns={this.columns}
          data={this.state.pods}
          height={`calc(100vh - ${props.contentTop + 89}px)`}
          multiSelectable={true}
          revision={`${props.resourceRevision}-${props.metricsRevision}`}
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
          wrapperStyle={{overflowX: 'hidden', overflowY: 'auto'}}
          headerStyle={{backgroundColor: 'rgba(185, 162, 131, 0.85)', color: 'white'}}
          />
        
      <RowActionMenu
        open={!!this.state.hoveredResource}
        handlers={{
          logs: ()=> { this.props.viewResource(this.state.hoveredResource,'logs') },
          term: ()=> { this.props.viewResource(this.state.hoveredResource,'terminal') },
          edit: ()=> { this.props.viewResource(this.state.hoveredResource,'edit') },
          delete: ()=>{ this.handleDelete(this.state.hoveredResources)},
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
    </div>
    )
  }

}))
