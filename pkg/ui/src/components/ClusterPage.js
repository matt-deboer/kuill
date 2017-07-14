import React from 'react';
import {Link} from 'react-router-dom';
import FloatingActionButton from 'material-ui/FloatingActionButton';
import ContentAdd from 'material-ui/svg-icons/content/add';
import {blueA400, grey500, blueA100, red900} from 'material-ui/styles/colors';
import { routerActions } from 'react-router-redux'
import { connect } from 'react-redux';
import { addFilter, removeFilter } from '../state/actions/cluster'
import FilterTable from './filter-table/FilterTable';
import * as moment from 'moment';

import ChipInput from 'material-ui-chip-input';
import Chip from 'material-ui/Chip';
import { withRouter } from 'react-router-dom'
import { linkForResource } from '../routes'
import IconLogs from 'material-ui/svg-icons/action/receipt'
import IconShell from 'material-ui/svg-icons/action/system-update-alt'
import IconEdit from 'material-ui/svg-icons/editor/mode-edit'
import IconDelete from 'material-ui/svg-icons/action/delete'

import IconMore from 'material-ui/svg-icons/navigation/more-horiz'
import Popover from 'material-ui/Popover'
import Paper from 'material-ui/Paper'

import { arraysEqual } from '../comparators'
import './ClusterPage.css'


const mapStateToProps = function(store) {
  return {
    filters: store.cluster.filters,
    filterNames: store.cluster.filterNames,
    possibleFilters: store.cluster.possibleFilters,
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
      console.log(`ClusterPage: pushed new location: ${linkForResource(resource,view)}`)
      dispatch(routerActions.push(linkForResource(resource,view)))
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
    marginLeft: -15,
    backgroundColor: 'transparent',
  },
  paper: {
    padding: 15,
    margin: 5,
  }
}

// use functional component style for representational components
export default withRouter(connect(mapStateToProps, mapDispatchToProps) (
class ClusterPage extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      actionsOpen: false,
      hoveredRow: -1,
      hoveredResources: null,
    }
    this.rowSelection = []
  }

  shouldComponentUpdate = (nextProps, nextState) => {
    return !arraysEqual(this.props.filterNames, nextProps.filterNames)
      || !arraysEqual(this.props.possibleFilters, nextProps.possibleFilters)
      || this.state.actionsOpen !== nextState.actionsOpen
      || this.state.hoveredRow !== nextState.hoveredRow
  }

  handleActionsRequestClose = () => {
    this.setState({
      actionsOpen: false,
      hoveredRow: -1,
      hoveredResource: null,
    })
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
        id: 'name',
        label: 'name',
        sortable: true,
        headerStyle: styles.header,
        style: { ...styles.cell,
          width: '35%'
        },
      },
      // {
      //   id: 'namespace',
      //   label: 'ns',
      //   sortable: true,
      //   headerStyle: styles.header,
      //   style: { ...styles.cell,
      //     width: '12%'
      //   }
      // },
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
      {
        id: 'status',
        label: 'status',
        headerStyle: styles.header,
        style: { ...styles.cell,
          width: '25%'
        }
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
      } else {
        return row[column.id]
      }
    }

    let rows = []
    let counter = 0
    for (let entry of Object.entries(props.resources)) {
      let [ _, resource ] = entry
      if (!resource.isFiltered) {
        rows.push({
          id: (++counter),
          name: resource.metadata.name,
          // namespace: resource.metadata.namespace,
          kind: resource.kind,
          actions: <IconMore color={'rgba(0,0,0,0.4)'} hoverColor={'rgba(0,0,0,0.87)'}/>,
          age: this.renderAge(resource),
          status: resource._status,
        })
      }
    }

    return (
      <Paper style={styles.paper}>
        
        {renderFilters(props)}

        <FilterTable
          className={'cluster'}
          columns={columns}
          data={rows}
          height={`${window.innerHeight - 290}px`}
          multiSelectable={true}
          onRowSelection={(selection) => {
            this.rowSelection = selection
            this.deleteButton.setDisabled(this.rowSelection.length === 0)
          }}
          onCellClick={(rowId, colId, resource, col) => {
            if (col.id === 'actions') {
              let trs = document.getElementsByClassName('cluster filter-table')[1].children[0].children
              this.setState({
                actionsOpen: true,
                actionsAnchor: trs[rowId].children[colId+1],
                hoveredRow: rowId,
                hoveredResource: resource,
              })
              return false
            } else {
              props.viewResource(resource)
              return false
            }
          }}
          hoveredRow={this.state.hoveredRow}
          onRenderCell={renderCell}
          />

        <Popover
          style={styles.popover}
          open={this.state.actionsOpen}
          anchorEl={this.state.actionsAnchor}
          onRequestClose={this.handleActionsRequestClose}
          zDepth={0}
          anchorOrigin={{horizontal: 'left', vertical: 'bottom'}}
          targetOrigin={{horizontal: 'left', vertical: 'top'}}
        >
          <FloatingActionButton mini={true} style={styles.miniButton} tooltip={'logs'}
            onTouchTap={()=> { this.props.viewResource(this.state.hoveredResource,'logs') }}>
            <IconLogs/>
          </FloatingActionButton>
          <FloatingActionButton mini={true} style={styles.miniButton} tooltip={'terminal'}
            onTouchTap={()=> { this.props.viewResource(this.state.hoveredResource,'terminal') }}>
            <IconShell/>
          </FloatingActionButton>
          <FloatingActionButton mini={true} style={styles.miniButton} tooltip={'edit'}
            onTouchTap={()=> { this.props.viewResource(this.state.hoveredResource,'edit') }}>
            <IconEdit/>
          </FloatingActionButton >
        </Popover>

        <Link to="/cluster/edit/default/Deployment/::new::" >
          <FloatingActionButton style={styles.newResourceButton} backgroundColor={blueA400}>
            <ContentAdd />
          </FloatingActionButton>
        </Link>

        <DeleteButton backgroundColor={red900} 
          mini={true} 
          style={styles.deleteResourceButton} 
          disabled={true} 
          ref={(ref)=>{this.deleteButton = ref}}/>

      </Paper>
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
  console.log(`ClusterPage::renderFilters { filterNames: ${JSON.stringify(props.filterNames)}, possibleFilters.length: ${props.possibleFilters.length}`)
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