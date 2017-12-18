import React from 'react'
import Dialog from 'material-ui/Dialog'
import FlatButton from 'material-ui/FlatButton'
import RaisedButton from 'material-ui/RaisedButton'
import { grey300, grey800 } from 'material-ui/styles/colors'
import { Link } from 'react-router-dom'

export default class ConfirmationDialog extends React.PureComponent {

  render() {

    let { props } = this
    let { linkGenerator } = props

    if (!props.open) {
      return null
    }

    const actions = [
      <FlatButton
        className={'confirmation cancel'}
        label={props.cancelText || 'Cancel'}
        labelStyle={{color: grey800}}
        onTouchTap={props.onRequestClose}
      />,
      <RaisedButton
        className={'confirmation confirm'}
        label={props.confirmText || 'Yes'}
        primary={true}
        keyboardFocused={true}
        onTouchTap={props.onConfirm}
      />,
    ];

    const links = props.resources.map(r => <div key={r.key}><Link to={linkGenerator.linkForResource(r)}>{r.key.replace(/\//g, ' / ')}</Link></div>)

    return (
      <Dialog
        title={<div>{props.title}</div>}
        titleStyle={{backgroundColor: grey300, color: grey800, padding: 16}}
        bodyStyle={{paddingTop: 16}}
        actions={actions}
        modal={false}
        open={props.open}
        onRequestClose={props.onRequestClose}
        actionsContainerClassName={'confirmation-actions'}
      >
        {props.message}
        {links}
        {props.children}
      </Dialog>
    )
  }
}

