import React from 'react'
import Dialog from 'material-ui/Dialog'
import FlatButton from 'material-ui/FlatButton'
import RaisedButton from 'material-ui/RaisedButton'
import TextField from 'material-ui/TextField'
import { grey300, grey800 } from 'material-ui/styles/colors'

export default class ScaleDialog extends React.PureComponent {

  componentDidUpdate = (prevProps, prevState) => {
    if (!prevProps.open && this.props.open) {
      // stupid hack required to auto-focus text field
      let that = this
      setTimeout(() => {
        that.replicaText && that.replicaText.input.focus()
      },250);
    }
  }

  handleConfirm = () => {
    this.props.onConfirm(this.replicaText.input.value)
  }

  render() {

    let { props } = this
    let { resource } = props
    
    if (!props.open || !resource || !resource.spec || !('replicas' in resource.spec)) {
      return null
    }

    let currentReplicas = !!resource && resource.spec.replicas
    let resourceLabel = !!resource && resource.key.replace(/\//g, ' / ')

    const styles ={
      bold: {
        fontWeight: 600,
      },
    }

    const actions = [
      <FlatButton
        label="Cancel"
        labelStyle={{color: grey800}}
        onTouchTap={props.onRequestClose}
      />,
      <RaisedButton
        label="Scale"
        primary={true}
        keyboardFocused={true}
        onTouchTap={this.handleConfirm}
      />,
    ];

    return (
      <Dialog
        title={<div>Scale Replicas:</div>}
        titleStyle={{backgroundColor: grey300, color: grey800, padding: 16}}
        bodyStyle={{paddingTop: 16}}
        actions={actions}
        modal={true}
        open={props.open}
        onRequestClose={props.onRequestClose}
      >
       <span style={styles.bold}>{resourceLabel}</span> currently has <span style={styles.bold}>{currentReplicas}</span> desired replicas.
       <TextField
          autoFocus
          floatingLabelText="New desired number of replicas:"
          ref={ (ref) => { 
            this.replicaText = ref 
            if (this.replicaText) {
              this.replicaText.input.onkeydown = this.numbersOnly
            }
          }}
        />
      </Dialog>
    )
  }

  numbersOnly = (event) => {
    let keyCode = ('which' in event) ? event.which : event.keyCode
    let isNumeric = (keyCode >= 48 /* KeyboardEvent.DOM_VK_0 */ && keyCode <= 57 /* KeyboardEvent.DOM_VK_9 */) ||
      (keyCode >= 96 /* KeyboardEvent.DOM_VK_NUMPAD0 */ && keyCode <= 105 /* KeyboardEvent.DOM_VK_NUMPAD9 */)
    let modifiers = (event.altKey || event.ctrlKey || event.shiftKey)
    let allowedNonNumerics = (keyCode === 8 /* backspace */ || keyCode === 9 /* tab */)
    if (keyCode === 13 /* enter */) {
      this.handleConfirm()
    } 
    return (isNumeric || allowedNonNumerics) && !modifiers
  }
}
