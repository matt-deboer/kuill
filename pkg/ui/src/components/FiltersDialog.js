import React from 'react'
import { grey200, grey300, grey500 } from 'material-ui/styles/colors'
import { connect } from 'react-redux'
import Dialog from 'material-ui/Dialog'
import FlatButton from 'material-ui/FlatButton'
import RaisedButton from 'material-ui/FlatButton'
import Checkbox from 'material-ui/Checkbox'
import IconFilters from 'material-ui/svg-icons/content/filter-list'
import {
  Table,
  TableBody,
  TableRow,
  TableRowColumn,
  TableHeader,
  TableHeaderColumn,
} from 'material-ui/Table'
import { excludedKinds } from '../state/actions/resources'
import { updateSettings } from '../state/actions/usersettings'
import './FiltersDialog.css'

const mapStateToProps = function(store) {
  return {
    namespaces: store.resources.namespaces,
    kinds: store.apimodels.kinds,
    selectedNamespaces: store.usersettings.selectedNamespaces,
    selectedKinds: store.usersettings.selectedKinds,
  }
}

const mapDispatchToProps = function(dispatch) {
  return {
    updateSettings: function(namespaces, kinds, save) {
      dispatch(updateSettings(namespaces, kinds, save))
    }
  }
}

export default connect(mapStateToProps, mapDispatchToProps) (
class FiltersDialog extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      save: true,
      selectedNamespaces: props.selectedNamespaces || {},
      selectedKinds: props.selectedKinds || {},
    }
    
    this.parseNamespacesAndKinds(props)

    for (let fn of [
      'updateCheckSave',
      'handleNamespaceSelection',
      'applyChanges',
    ]) {
      this[fn] = this[fn].bind(this)
    }
  }

  parseNamespacesAndKinds = (props) => {
    if (props.namespaces) {
      this.allNamespaces = props.namespaces.sort()
    }
    if (props.kinds) {
      this.allKinds = Object.keys(props.kinds).filter(k => !(k in excludedKinds)).sort()
    }
  }

  handleClose = () => {
    this.props.handleClose && this.props.handleClose()
  }

  applyChanges = () => {
    this.props.updateSettings(this.state.selectedNamespaces, this.state.selectedKinds, this.state.save)
    this.props.handleClose && this.props.handleClose()
  }

  updateCheckSave = (event, checked) => {
    this.setState({save: checked})
  }

  handleNamespaceSelection = (selection) => {
    let selectedNamespaces = {}
    if (selection !== 'all' && selection.length < this.allNamespaces.length) {
      for (let i of selection) {
        selectedNamespaces[this.allNamespaces[i]]=true
      }
    }
    this.setState({
      selectedNamespaces: selectedNamespaces,
    })
  }

  handleKindSelection = (selection) => {
    let selectedKinds = {}
    if (selection !== 'all' && selection.length < this.allKinds.length) {
      for (let i of selection) {
        selectedKinds[this.allKinds[i]]=true
      }
    }
    this.setState({
      selectedKinds: selectedKinds,
    })
  }

  componentWillReceiveProps = (props) => {
    this.parseNamespacesAndKinds(props)
    this.setState({
      selectedNamespaces: props.selectedNamespaces,
      selectedKinds: props.selectedKinds,
    })
  }

  render() {

    const styles = {
      headers: {
        padding: 0,
        fontSize: 15,
        color: 'rgb(255,245,225)',
        height: 18,
      },
      headerRow: {
        backgroundColor: 'rgba(28, 84, 178, 0.6)',
      },
      message: {
        whiteSpace: 'pre-wrap',
      },
      table: {
        // backgroundColor: 'rgba(255,255,255,0.2)',
      },
      tableWrapper: {
        overflowX: 'hidden',
        margin: '20px -5px 10px',
      },
      checkbox: {
        position: 'absolute',
        right: 24,
        top: 15,
        width: 'auto',
        textAlign: 'right',
      },
      checkboxLabel: {
        color: 'white',
        fontSize: 16,
        // width: 'auto',
        // marginRight: -20,
      },
      checkboxIcon: {
        // width: 'auto',
      }
    }

    const rowHeight = 18
    let { props } = this

    const actions = [
      <FlatButton
        label="Cancel"
        labelStyle={{color: 'rgb(180,180,180)'}}
        hoverColor={grey300}
        onTouchTap={props.handleClose}
        labelStyle={{
          color: 'rgb(66,66,66)',
        }}
      />,
      <RaisedButton
        label="Apply"
        onTouchTap={this.applyChanges}
        backgroundColor={'rgb(30, 136, 229)'}
        hoverColor={'rgb(94, 175, 245)'}
        labelStyle={{
          color: 'white',
        }}
      />,
    ]

    if (!props.kinds || !props.namespaces) {
      return null
    }

    let { selectedNamespaces, selectedKinds } = this.state
    let allNamespacesSelected = Object.keys(selectedNamespaces).length === 0
    let allKindsSelected = Object.keys(selectedKinds).length === 0

    return (
      <Dialog
        className="filters-dialog"
        title={<div style={{position: 'relative'}}>
          <IconFilters style={{
              position: 'absolute',
              left: 0,
              top: 0,
              margin: 16,
              height: 28,
              width: 28,
              color: 'rgba(255,255,255,0.5)',
            }}/>
          <div style={{paddingLeft: 24}}>Filters</div>
          <Checkbox
            label="Persist"
            className={'persist'}
            checked={this.state.save}
            onCheck={this.updateCheckSave}
            style={styles.checkbox}
            labelStyle={styles.checkboxLabel}
            labelPosition="left"
          />
        </div>}
        titleStyle={{
          backgroundColor: 'rgb(66, 66, 66)', 
          color: grey200, 
          padding: '12px 24px',
          borderBottom: '4px solid rgb(41, 121, 255)',
        }}
        actions={actions}
        actionsContainerStyle={{
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
        }}
        modal={false}
        bodyStyle={{backgroundColor: 'rgba(0, 0, 0, 0.2)', paddingBottom: 10}}
        open={this.props.open}
        onRequestClose={this.props.handleClose}
        autoScrollBodyContent={true}
      >

        <div className="row">
          <div className="col-xs-6 col-sm-6 col-md-6 col-lg-6 namespaces">
            <Table fixedHeader={true} height={'50vh'} multiSelectable={true} selectable={true} 
              style={styles.table} wrapperStyle={{...styles.tableWrapper,marginLeft: -5}}
              onRowSelection={this.handleNamespaceSelection}
              allRowsSelected={allNamespacesSelected}>
              <TableHeader
                displaySelectAll={true}
                adjustForCheckbox={true}
                enableSelectAll={true}
                >
                <TableRow style={styles.headerRow}>
                  <TableHeaderColumn style={styles.headers}>Show These Namespaces:</TableHeaderColumn>
                </TableRow>
              </TableHeader>
              <TableBody displayRowCheckbox={true} deselectOnClickaway={false}> 
                {this.allNamespaces.map((ns)=>
                  <TableRow selected={ns in selectedNamespaces || allNamespacesSelected} 
                    key={ns} displayBorder={true} style={{height: rowHeight}}>
                    <TableRowColumn style={{ height: rowHeight, padding: 2}}>
                      <span style={styles.message}>{ns}</span>
                    </TableRowColumn>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="col-xs-6 col-sm-6 col-md-6 col-lg-6 kinds">
            <Table fixedHeader={true} height={'50vh'} multiSelectable={true} selectable={true} 
              style={styles.table} wrapperStyle={styles.tableWrapper}
              onRowSelection={this.handleKindSelection}
              allRowsSelected={allKindsSelected}>
              <TableHeader
                displaySelectAll={true}
                adjustForCheckbox={true}
                enableSelectAll={true}
                >
                <TableRow style={styles.headerRow}>
                  <TableHeaderColumn style={styles.headers}>Show These Resource Kinds:</TableHeaderColumn>
                </TableRow>
              </TableHeader>
              <TableBody displayRowCheckbox={true} deselectOnClickaway={false}> 
                {this.allKinds.map((kind)=>
                  <TableRow selected={kind in selectedKinds || allKindsSelected} 
                    key={kind} displayBorder={true} style={{height: rowHeight}}>
                    <TableRowColumn style={{ height: rowHeight, padding: 2}}>
                      <span style={styles.message}>{kind}</span>
                    </TableRowColumn>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Dialog>
    )
  }
})








