import React from 'react'
import { grey200, grey300, grey500, grey700, grey800 } from 'material-ui/styles/colors'
import { typography } from 'material-ui/styles'
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
      appBar: {
        position: 'fixed',
        top: 0,
        overflow: 'hidden',
        maxHeight: 57,
        width: '100%',
        paddingLeft: 40,
        paddingRight: 30,
        backgroundColor: grey800,
      },
      menu: {
        backgroundColor: 'transparent',
        color: grey200,
        fontSize: 18,
        fontWeight: 600,
      },
      menuButton: {
        marginLeft: 0,
        backgroundColor: grey700,
        marginRight: 10,
      },
      menuButtonLabel: {
        textTransform: 'none',
        color: grey300,
      },
      iconsRightContainer: {
        marginLeft: 20
      },
      headers: {
        padding: 0,
        fontSize: 15,
      },
      name: {
        fontSize: '18px',
        color: typography.textFullWhite,
        lineHeight: '58px',
        backgroundColor: grey800,
        height: 56,
        overflow: 'none',
      },
      avatar: {
        marginRight: 10,
      },
      message: {
        whiteSpace: 'pre-wrap',
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
        hoverColor={grey500}
        onTouchTap={this.applyChanges}
      />,
    ]

    if (!props.kinds || !props.namespaces) {
      return null
    }

    let namespaces = props.namespaces.sort()
    let kinds = Object.keys(props.kinds).filter(k => !(k in excludedKinds)).sort()

    return (
      <Dialog
        title={<div><IconFilters/>Filters</div>}
        titleStyle={{
          backgroundColor: 'rgb(66, 66, 66)', 
          color: grey200, 
          padding: '12px 24px',
          borderBottom: '4px solid rgb(41, 121, 255)',
        }}
        actions={actions}
        modal={false}
        bodyStyle={{backgroundColor: 'rgba(0, 0, 0, 0.2)'}}
        open={this.props.open}
        onRequestClose={this.props.handleClose}
        autoScrollBodyContent={true}
      >

        <div className="row">
          <div className="col-xs-6 col-sm-6 col-md-6 col-lg-6">
            {/* <Subheader>Show Namespaces:</Subheader> */}
            <Table fixedHeader={true} height={'50vh'} multiSelectable={true} selectable={true} 
              style={{ border: '0', margin: '10px 0px 0 -15px'}} wrapperStyle={{overflowX: 'hidden'}}>
              <TableHeader
                displaySelectAll={true}
                adjustForCheckbox={true}
                enableSelectAll={true}
              >
                <TableRow>
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
            {/* <Subheader>Show Resource Kinds:</Subheader> */}
            <Table fixedHeader={true} height={'50vh'} multiSelectable={true} selectable={true} 
              style={{ border: '0', margin: '10px -15px 0 0px'}} wrapperStyle={{overflowX: 'hidden'}}>
              <TableHeader
                displaySelectAll={true}
                adjustForCheckbox={true}
                enableSelectAll={true}
              >
              <TableRow>
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








