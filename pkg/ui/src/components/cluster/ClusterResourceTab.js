import React from 'react'
import {blueA400, grey200, grey300, grey500, grey600, blueA100, white } from 'material-ui/styles/colors'
import { connect } from 'react-redux'
import { viewResource, removeResource } from '../../state/actions/resources'
import sizeMe from 'react-sizeme'
import FilterTable from '../filter-table/FilterTable'

import IconButton from 'material-ui/IconButton'

import IconEdit from 'material-ui/svg-icons/editor/mode-edit'
import IconDelete from 'material-ui/svg-icons/action/delete'
import IconMore from 'material-ui/svg-icons/navigation/more-horiz'

import Popover from 'material-ui/Popover'
import Paper from 'material-ui/Paper'

import EmptyListPage from '../EmptyListPage'

import './ClusterResourceTab.css'

const mapStateToProps = function(store) {
  return {
    resourceRevision: store.resources.resourceRevision,
    resources: store.resources.resources,
    linkGenerator: store.session.linkGenerator,
  }
}

const mapDispatchToProps = function(dispatch, ownProps) {
  return {
    removeResource: function(...resources) {
      dispatch(removeResource(...resources))
    },
    viewResource: function(resource, view='config') {
      dispatch(viewResource(resource,view))
    },
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
    display: 'flex',
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
    pointerEvents: 'none',
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
  },
}

const defaultColumns = [
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
    id: 'modified',
    label: 'modified',
    sortable: true,
    headerStyle: styles.header,
    style: { ...styles.cell,
      width: 90,
    }
  },
]

// use functional component style for representational components
export default sizeMe({ monitorWidth: true }) (
connect(mapStateToProps, mapDispatchToProps) (
class ClusterResourceTab extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      actionsOpen: false,
      hoveredRow: -1,
      hoveredResources: null,
    }

    this.selectedIds = {}
    this.rows = Object.entries(props.resources).map(([k,v])=> v).filter(v => v.kind === props.kind)
    this.columns = props.columns || defaultColumns
    let lastColumn = this.columns[this.columns.length - 1]
    
    if (lastColumn.id !== 'pad_right' && lastColumn.id !== 'actions') {
      if (props.deletable || props.editable) {
        this.columns.push({
          id: 'actions',
          label: 'actions ',
          headerStyle: styles.header,
          style: { ...styles.cell,
            width: 75,
            lineHeight: '0px',
          },
          className: 'resource-actions',
        })
      } else {
        this.columns.push({
          id: 'pad_right',
          label: '',
          headerStyle: {...styles.header,
            color: 'transparent',
            pointerEvents: 'none',
          },
          style: { ...styles.cell,
            width: 16,
          },
        })
      }
    }
    this.columnsById = {}
    for (let col of this.columns) {
      this.columnsById[col.id] = col
    }
    for (let fn of ['renderCell', 'getCellValue']) {
      this[fn] = this[fn].bind(this)
    }
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
      let trs = document.getElementsByClassName('filter-table ' + this.props.kind.toLowerCase())[1].children[0].children
      let anchor = trs[rowId].children[colId]
      this.setState({
        actionsOpen: true,
        actionsAnchor: anchor,
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

  componentWillReceiveProps = (nextProps) => {
    this.rows = Object.entries(nextProps.resources).map(([k,v])=> v).filter(v => v.kind === nextProps.kind)
  }

  renderCell = (columnId, row) => {
    if (columnId === 'actions') {
      return <IconMore color={'rgba(0,0,0,0.4)'} hoverColor={'rgba(0,0,0,0.87)'} data-rh="Actions..."/>
    }
    let column = this.columnsById[columnId]
    return column.render ? column.render(row) : this.getCellValue(columnId, row)
  }

  getCellValue = (columnId, row) => {
    if (columnId === 'id') {
      return row.key
    }
    let column = this.columnsById[columnId]
    return column.value ? column.value(row) : ''
  }

  render() {
    let { props } = this

    return (
      <Paper style={styles.paper}>

        <FilterTable
          className={this.props.kind.toLowerCase()}
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
          headerStyle={{backgroundColor: 'rgb(66, 77, 99)', color: white}}
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
              {props.editable &&
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
              }
    
              {props.deletable &&
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
              }
    
            </Popover>
          }

          {this.rows.length === 0 &&
            <EmptyListPage />
          }
      </Paper>
    )
  }
}))
