import React from 'react'
import Dialog from 'material-ui/Dialog'
import FlatButton from 'material-ui/FlatButton'
import RaisedButton from 'material-ui/RaisedButton'
import { grey300, grey800, red900 } from 'material-ui/styles/colors'
import { Link } from 'react-router-dom'
import { linkForResource } from '../routes'

export default class ConfirmationDialog extends React.PureComponent {

  render() {

    let { props } = this

    const actions = [
      <FlatButton
        label={props.cancelText || 'Cancel'}
        labelStyle={{color: grey800}}
        onTouchTap={props.onRequestClose}
      />,
      <RaisedButton
        label={props.confirmText || 'Yes'}
        primary={true}
        keyboardFocused={true}
        onTouchTap={props.onConfirm}
      />,
    ];

    return (
      <Dialog
        title={<div>{props.title}</div>}
        titleStyle={{backgroundColor: grey300, color: grey800, padding: 16}}
        bodyStyle={{paddingTop: 16}}
        actions={actions}
        modal={false}
        open={props.open}
        onRequestClose={props.onRequestClose}
      >
        {props.message}
        {props.resources.map(r => <div key={r.key}><Link to={linkForResource(r)}>{r.key.replace(/\//g, ' / ')}</Link></div>)}
      </Dialog>
    )
  }
}

