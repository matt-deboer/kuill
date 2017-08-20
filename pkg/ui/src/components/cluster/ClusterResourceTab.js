import React from 'react'
import FloatingActionButton from 'material-ui/FloatingActionButton'
import {blueA400, grey500, grey600, blueA100, white } from 'material-ui/styles/colors'
import { routerActions } from 'react-router-redux'
import { connect } from 'react-redux'
import { addFilter, removeFilter, removeResource } from '../../state/actions/cluster'
import sizeMe from 'react-sizeme'
import FilterTable from '../filter-table/FilterTable'
import * as moment from 'moment'

import ChipInput from 'material-ui-chip-input'
import Chip from 'material-ui/Chip'
import { withRouter } from 'react-router-dom'
import { linkForResource } from '../../routes'
import IconLogs from 'material-ui/svg-icons/action/receipt'
import IconShell from 'material-ui/svg-icons/hardware/computer'
import IconEdit from 'material-ui/svg-icons/editor/mode-edit'

import Popover from 'material-ui/Popover'
import Paper from 'material-ui/Paper'

import { arraysEqual } from '../../comparators'
import { resourceStatus as resourceStatusIcons } from '../icons'
import { compareStatuses } from '../../utils/resource-utils'
import { hostnameLabel } from '../../utils/filter-utils'
// import BrowserUsage from './dashboard/BrowserUsage'
// import Data from '../data'
import KubeKinds from '../../kube-kinds'
import './ClusterResourceTab.css'

import Perf from 'react-addons-perf'

const mapStateToProps = function(store) {
  return {
    resourceRevision: store.cluster.resourceRevision,
    resources: store.cluster.resources,
  }
}

const mapDispatchToProps = function(dispatch, ownProps) {
  return {
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
    color: 'rgba(33,33,33,0.8)',
    fill: 'rgba(33,33,33,0.8)',
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
    marginTop: -15,
    paddingBottom: 17,
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
    this.rows = Object.entries(props.resources).map(([k,v])=> v).filter(v => v.kind === props.kind && !v.isFiltered)
    this.resources = Object.entries(props.resources).map(([k,v])=> v).filter(v => v.kind === props.kind)
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
        id: 'name',
        label: 'name',
        sortable: true,
        headerStyle: styles.header,
        style: { ...styles.cell,
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
    ]
  }

  resourcesToRows = (resources) => {
    return Object.values(resources).filter(el => !el.isFiltered)
  }

  shouldComponentUpdate = (nextProps, nextState) => {

    return this.state.actionsOpen !== nextState.actionsOpen
      || this.state.hoveredRow !== nextState.hoveredRow
      || this.props.resources !== nextProps.resources
      || this.props.resourceRevision !== nextProps.resourceRevision
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
    this.rows = Object.entries(nextProps.resources).map(([k,v])=> v).filter(v => v.kind === nextProps.kind && !v.isFiltered)
    this.nodes = Object.entries(nextProps.resources).map(([k,v])=> v).filter(v => v.kind === nextProps.kind)
  }

  renderCell = (column, row) => {
    switch(column) {
      case 'name':
        return row.metadata.name
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
    switch(column) {
      case 'id':
        return row.key
      case 'name':
        return row.metadata.name
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

        <FilterTable
          className={'cluster-resource'}
          columns={this.columns}
          data={this.rows}
          height={'calc(100vh - 230px)'}
          displayRowCheckbox={false}
          onCellClick={this.handleCellClick.bind(this)}
          hoveredRow={this.state.hoveredRow}
          onRenderCell={this.renderCell}
          getCellValue={this.getCellValue}
          stripedRows={false}
          iconStyle={{fill: 'rgba(33,33,33,0.8)'}}
          iconInactiveStyle={{fill: 'rgba(255,255,255,0.5)'}}
          width={'calc(100vw - 50px)'}
          revision={props.resourceRevision}
          wrapperStyle={{marginLeft: - 15, marginRight: -15, overflowX: 'hidden', overflowY: 'auto'}}
          headerStyle={{backgroundColor: 'rgba(191, 138, 76, 0.5)', color: 'rgba(33,33,33,0.8)'}}
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
