import React from 'react'
import {Link} from 'react-router-dom'
import FloatingActionButton from 'material-ui/FloatingActionButton'
import {blueA400, grey500, blueA100, red900 } from 'material-ui/styles/colors'
import { routerActions } from 'react-router-redux'
import { connect } from 'react-redux'
import { addFilter, removeFilter, removeResource } from '../state/actions/workloads'
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
import IconButton from 'material-ui/IconButton'

import IconMore from 'material-ui/svg-icons/navigation/more-horiz'
import Popover from 'material-ui/Popover'
import Paper from 'material-ui/Paper'

import { arraysEqual } from '../comparators'
import { resourceStatus as resourceStatusIcons } from './icons'

import KubeKinds from '../kube-kinds'
import KindAbbreviation from './KindAbbreviation'
import './WorkloadsPage.css'

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
    viewResource: function(resource, view='configuration') {
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
    margin: 5,
  }
}

// use functional component style for representational components
export default withRouter(connect(mapStateToProps, mapDispatchToProps) (
class WorkloadsPage extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      actionsOpen: false,
      hoveredRow: -1,
      hoveredResources: null,
    }
    this.selectedIds = {}
  }

  shouldComponentUpdate = (nextProps, nextState) => {
    return !arraysEqual(this.props.filterNames, nextProps.filterNames)
      || !arraysEqual(this.props.possibleFilters, nextProps.possibleFilters)
      || this.state.actionsOpen !== nextState.actionsOpen
      || this.state.hoveredRow !== nextState.hoveredRow
      || this.props.resources !== nextProps.resources
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

  renderAge = (resource) => {
    let age = ''
    if (resource.status && resource.status.conditions && resource.status.conditions.length) {
      let dur = 0
      for (let cond of resource.status.conditions) {
        let ago = Date.now() - Date.parse(cond.lastTransitionTime)
        if (ago > dur) {
          dur = ago
        }
      }
      age = dur
    }
    return age
  }

  render() {
    let { props } = this

    let columns=[
      {
        id: 'kind',
        label: 'kind',
        sortable: true,
        headerStyle: styles.header,
        style: { ...styles.cell,
          width: '60px',
        }
      },
      {
        id: 'name',
        label: 'name',
        sortable: true,
        headerStyle: styles.header,
        style: { ...styles.cell,
          width: '35%'
        },
      },
      {
        id: 'namespace',
        label: 'ns',
        sortable: true,
        headerStyle: styles.header,
        style: { ...styles.cell,
          width: '12%'
        }
      },
      {
        id: 'status',
        label: 'status',
        headerStyle: styles.header,
        style: { ...styles.cell,
          width: '28px',
          verticalAlign: 'middle',
        }
      },
      {
        id: 'age',
        label: 'age',
        sortable: true,
        headerStyle: styles.header,
        style: { ...styles.cell,
          width: '10%'
        }
      },
      {
        id: 'actions',
        label: '',
        headerStyle: styles.header,
        style: { ...styles.cell,
          width: '24px',
        },
        className: 'resource-actions',
      },
    ]

    let renderCell = function(column, row) {
      if (column.id === 'age') {
        let age = row[column.id]
        if (age) {
          return moment.duration(age).humanize()
        } else {
          return ''
        }
      // } else if (column.id === 'kind') {
      //   let kind = KubeKinds.workloads[row[column.id]]
      //   if (!kind) {
      //     console.error(`couldn't find KubeKind for ${row[column.id]}`)
      //   } else {
      //     return <KindAbbreviation noBackground={true} text={kind.abbrev} color={kind.color} size={36} 
      //       style={{marginTop: 5, marginBottom: -5}}/>
      //   }
      } else {
        return row[column.id]
      }
    }

    let rows = []
    for (let entry of Object.entries(props.resources)) {
      let [ _, resource ] = entry
      if (!resource.isFiltered) {
        if (!resource.metadata) {
          console.warn(`malformed resource`)
          console.log(resource)
          continue
        }
        rows.push({
          id: resource.key,
          name: resource.metadata.name,
          namespace: resource.metadata.namespace,
          kind: resource.kind,
          actions: <IconMore color={'rgba(0,0,0,0.4)'} hoverColor={'rgba(0,0,0,0.87)'} data-rh="Actions..."/>,
          age: this.renderAge(resource),
          status: resourceStatusIcons[resource.statusSummary],
        })
      }
    }

    return (
    <div>
      <Paper style={styles.paper}>
        
        {renderFilters(props)}

        <FilterTable
          className={'workloads'}
          columns={columns}
          data={rows}
          height={`${window.innerHeight - 290}px`}
          multiSelectable={true}
          onRowSelection={this.handleRowSelection.bind(this)}
          onCellClick={this.handleCellClick.bind(this)}
          hoveredRow={this.state.hoveredRow}
          onRenderCell={renderCell}
          selectedIds={this.selectedIds}
          stripedRows={false}
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
          {KubeKinds.workloads[this.state.hoveredResource.kind].hasLogs &&
          <FloatingActionButton mini={true} style={styles.miniButton}
            onTouchTap={()=> { this.props.viewResource(this.state.hoveredResource,'logs') }}
            data-rh="View Logs...">  
            <IconLogs/>
          </FloatingActionButton>
          }

          {KubeKinds.workloads[this.state.hoveredResource.kind].hasTerminal &&
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
        <Link to="/workloads/new" >
          <FloatingActionButton style={styles.newResourceButton} backgroundColor={blueA400}>
            <IconAdd />
          </FloatingActionButton>
        </Link>

        <DeleteButton backgroundColor={red900} 
          mini={true} 
          style={styles.deleteResourceButton} 
          disabled={Object.keys(this.selectedIds).length === 0}
          onTouchTap={this.handleDelete}
          ref={(ref)=>{this.deleteButton = ref}}/>

      </Paper>
    </div>
    )
  }
}))

class DeleteButton extends React.Component {
  
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
       <IconDelete/>
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