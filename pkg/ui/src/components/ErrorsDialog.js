import React from 'react'
import {grey200, grey300, grey500, grey700, grey800, red900, white} from 'material-ui/styles/colors'
import {typography} from 'material-ui/styles'
import { connect } from 'react-redux'
import { clearErrors } from '../state/actions/errors'
import IconButton from 'material-ui/IconButton'
import IconError from 'material-ui/svg-icons/action/info'
import IconClearError from 'material-ui/svg-icons/action/delete'
import IconRetry from 'material-ui/svg-icons/av/loop'
import Dialog from 'material-ui/Dialog'
import FlatButton from 'material-ui/FlatButton'
import RaisedButton from 'material-ui/FlatButton'
import {
  Table,
  TableBody,
  TableRow,
  TableRowColumn,
} from 'material-ui/Table'

const mapStateToProps = function(store) {
  return {
    errors: store.errors.errors,
  }
}

const mapDispatchToProps = function(dispatch) {
  return {
    clearError: function(error) {
      dispatch(clearErrors(error))
    },
    clearAllErrors: function(errors) {
      dispatch(clearErrors(...errors))
    }
  }
}

const errorIcons = {
  error: <IconError style={{color: grey500}}/>,
}

export default connect(mapStateToProps, mapDispatchToProps) (
class ErrorsDialog extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      open: props.open,
    }
  }

  handleClose = () => {
    this.setState({open: false})
  }

  componentWillReceiveProps = (props) => {
    this.setState({
      open: props.open,
    })
  }

  shouldComponentUpdate = (nextProps, nextState) => {
    return nextState.open !== this.state.open
      || (this.state.open && nextProps.errors.length !== this.props.errors.length)
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
    }

    const actions = [
      <FlatButton
        label="Dismiss"
        secondary={true}
        labelStyle={{color: red900, fontWeight: 600}}
        keyboardFocused={true}
        onTouchTap={this.handleClose}
      />,
    ]

    let { props } = this
    return (
      <Dialog
        title={<div>{`Dashboard Errors: ${this.props.errors.length}`}
          <RaisedButton label="Clear All" 
            backgroundColor={grey700} 
            style={{float: 'right', color: white}}
            onTouchTap={this.props.clearAllErrors.bind(this, this.props.errors)}
            />
          </div>}
        titleStyle={{backgroundColor: red900, color: grey200}}
        actions={actions}
        modal={false}
        open={this.state.open}
        onRequestClose={this.handleClose}
        autoScrollBodyContent={true}
      >
        <Table selectable={false} style={{ border: '0', margin: 15}} wrapperStyle={{overflowX: 'hidden'}}>
          <TableBody displayRowCheckbox={false}>
            {props.errors.map((error, index)=>
              <TableRow key={error.id} displayBorder={true} style={{height: 28}}>
                <TableRowColumn style={{ width: 48, height: 28, padding: 4}}>
                  <IconButton iconStyle={{color: grey500}} data-rh="Clear Error"
                    onTouchTap={props.clearError.bind(this, error)}>
                    <IconClearError/>
                  </IconButton>
                </TableRowColumn>
                <TableRowColumn style={{ width: 48, height: 28, padding: 4}}>
                  {!!error.retry &&
                    <IconButton iconStyle={{color: grey500}} data-rh={error.retry.text}
                      onTouchTap={error.retry.action}>
                      <IconRetry/>
                    </IconButton>
                  }
                </TableRowColumn>
                <TableRowColumn style={{ width: 48, height: 28, padding: 4}}>
                  <IconButton disableTouchRipple={true} hoveredStyle={{cursor: 'default'}} iconStyle={{color: red900}}>{errorIcons[error.severity]}</IconButton>
                </TableRowColumn>
                <TableRowColumn style={{ height: 28, padding: 4}}>
                  <span style={styles.message}>{error.message}</span>
                </TableRowColumn>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Dialog>
    )
  }
})








