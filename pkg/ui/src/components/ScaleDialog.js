import React from 'react'
import ReactDOM from 'react-dom'
import Dialog from 'material-ui/Dialog'
import FlatButton from 'material-ui/FlatButton'
import RaisedButton from 'material-ui/RaisedButton'
import TextField from 'material-ui/TextField'
import { grey300, grey800, red900 } from 'material-ui/styles/colors'
import { Link } from 'react-router-dom'
import { linkForResource } from '../routes'

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
        onTouchTap={()=> {
          props.onConfirm(this.replicaText.input.value)}
        }
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
          }}
        />
      </Dialog>
    )
  }
}

