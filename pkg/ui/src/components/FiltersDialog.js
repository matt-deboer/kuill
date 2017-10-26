import React from 'react'
import { grey200, grey500 } from 'material-ui/styles/colors'
import { connect } from 'react-redux'
import Dialog from 'material-ui/Dialog'
import FlatButton from 'material-ui/FlatButton'
import RaisedButton from 'material-ui/FlatButton'
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

const mapStateToProps = function(store) {
  return {
    namespaces: store.resources.namespaces,
    kinds: store.apimodels.kinds,
  }
}

const mapDispatchToProps = function(dispatch) {
  return {
  }
}

export default connect(mapStateToProps, mapDispatchToProps) (
class FiltersDialog extends React.Component {

  handleClose = () => {
    this.props.handleClose && this.props.handleClose()
  }

  applyChanges = () => {
    
  }

  render() {

    const styles = {
      headers: {
        padding: 0,
        fontSize: 15,
        color: 'rgb(255,245,225)',
      },
      headerRow: {
        backgroundColor: 'rgb(125,120,120)',
      },
      message: {
        whiteSpace: 'pre-wrap',
      },
      table: {
        backgroundColor: 'rgb(200,200,200)',
      },
      tableWrapper: {
        overflowX: 'hidden',
        border: '1px solid rgba(0,0,0,0.2)',
        margin: '10px -10px 0',
      }
    }

    
    const rowHeight = 18
    let { props } = this

    const actions = [
      <FlatButton
        label="Cancel"
        labelStyle={{color: 'rgb(180,180,180)'}}
        hoverColor={grey500}
        onTouchTap={props.handleClose}
      />,
      <RaisedButton
        label="Apply"
        primary={true}
        onTouchTap={this.applyChanges}
        backgroundColor={'rgb(30, 136, 229)'}
      />,
    ]

    if (!props.kinds || !props.namespaces) {
      return null
    }

    let namespaces = props.namespaces.sort()
    let kinds = Object.keys(props.kinds).filter(k => !(k in excludedKinds)).sort()

    return (
      <Dialog
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
        </div>}
        titleStyle={{
          backgroundColor: 'rgb(66, 66, 66)', 
          color: grey200, 
          padding: '12px 24px',
          borderBottom: '4px solid rgb(41, 121, 255)',
        }}
        actions={actions}
        modal={false}
        bodyStyle={{backgroundColor: 'rgba(0, 0, 0, 0.4)', paddingBottom: 10}}
        open={this.props.open}
        onRequestClose={this.props.handleClose}
        autoScrollBodyContent={true}
      >

        <div className="row">
          <div className="col-xs-6 col-sm-6 col-md-6 col-lg-6">
            <Table fixedHeader={true} height={'50vh'} multiSelectable={true} selectable={true} 
              style={styles.table} wrapperStyle={{...styles.tableWrapper,marginLeft: -10}}>
              <TableHeader
                displaySelectAll={true}
                adjustForCheckbox={true}
                enableSelectAll={true}
              >
                <TableRow style={styles.headerRow}>
                  <TableHeaderColumn style={styles.headers}>Show These Namespaces:</TableHeaderColumn>
                </TableRow>
              </TableHeader>
              <TableBody displayRowCheckbox={true}>
                {namespaces.map((ns)=>
                  <TableRow key={ns} displayBorder={true} style={{height: rowHeight}}>
                    <TableRowColumn style={{ height: rowHeight, padding: 4}}>
                      <span style={styles.message}>{ns}</span>
                    </TableRowColumn>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="col-xs-6 col-sm-6 col-md-6 col-lg-6">
            <Table fixedHeader={true} height={'50vh'} multiSelectable={true} selectable={true} 
              style={styles.table} wrapperStyle={styles.tableWrapper}>
              <TableHeader
                displaySelectAll={true}
                adjustForCheckbox={true}
                enableSelectAll={true}
              >
              <TableRow style={styles.headerRow}>
                  <TableHeaderColumn style={styles.headers}>Show These Resource Kinds:</TableHeaderColumn>
                </TableRow>
              </TableHeader>
              <TableBody displayRowCheckbox={true}>
                {kinds.map((kind)=>
                  <TableRow key={kind} displayBorder={true} style={{height: rowHeight}}>
                    <TableRowColumn style={{ height: rowHeight, padding: 4}}>
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








