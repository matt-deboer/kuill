import React from 'react'
import {Link} from 'react-router-dom'
import FloatingActionButton from 'material-ui/FloatingActionButton'
import {blueA400, grey500, blueA100, red900 } from 'material-ui/styles/colors'
import { routerActions } from 'react-router-redux'
import { connect } from 'react-redux'
import { addFilter, removeFilter, removeResource } from '../state/actions/access'
import FilterTable from './filter-table/FilterTable'
import { toHumanizedAge } from './converters'

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
import { statusIcons } from './status-icons'
import KindAbbreviation from './KindAbbreviation'
import './ResourceGroupPage.css'

const mapStateToProps = function(store, ownProps) {
  return {
    filters: store[ownProps.resourceGroup].filters,
    filterNames: store[ownProps.resourceGroup].filterNames,
    possibleFilters: store[ownProps.resourceGroup].possibleFilters,
    kinds: store.apimodels.kinds,
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
class ResourceGroupPage extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      actionsOpen: false,
      hoveredRow: -1,
      hoveredResources: null,
    }
    this.selectedIds = {}
    this.handleCellClick = this.handleCellClick.bind(this)
    this.handleRowSelection = this.handleRowSelection.bind(this)
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
      let trs = document.getElementsByClassName('access filter-table')[1].children[0].children
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

  render() {
    let { props } = this
    let columns = props.columns
    let renderCell = props.renderCell
    let rows = props.rows

    return (
    <div>
      <Paper style={styles.paper}>
        
        {renderFilters(props)}

        <FilterTable
          className={'resources'}
          columns={columns}
          data={rows}
          height={`${window.innerHeight - 290}px`}
          multiSelectable={true}
          onRowSelection={this.handleRowSelection}
          onCellClick={this.handleCellClick}
          hoveredRow={this.state.hoveredRow}
          onRenderCell={renderCell}
          selectedIds={this.selectedIds}
          />

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

          <FloatingActionButton mini={true} style={styles.miniButton}
            onTouchTap={()=> { this.props.viewResource(this.state.hoveredResource,'logs') }}
            data-rh="View Logs...">  
            <IconLogs/>
          </FloatingActionButton>

          <FloatingActionButton mini={true} style={styles.miniButton}
            onTouchTap={()=> { this.props.viewResource(this.state.hoveredResource,'terminal') }}
            data-rh="Open Terminal...">
            <IconShell/>
          </FloatingActionButton>

          <FloatingActionButton mini={true} style={styles.miniButton}
            onTouchTap={()=> { this.props.viewResource(this.state.hoveredResource,'edit') }}
            data-rh="Edit...">
            <IconEdit/>
          </FloatingActionButton >
        </Popover>

        <Link to={`/${props.resourceGroup}/new`} >
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