import React from 'react'
import {blueA400} from 'material-ui/styles/colors'

import IconStatusOK from 'material-ui/svg-icons/action/check-circle'
import IconStatusScalingDown from 'material-ui/svg-icons/file/file-download'
import IconStatusScalingUp from 'material-ui/svg-icons/editor/publish'
import IconStatusDisabled from 'material-ui/svg-icons/content/block'
import IconStatusUnknown from 'material-ui/svg-icons/action/help-outline'
import IconStatusWarning from 'material-ui/svg-icons/alert/warning'
import IconStatusError from 'material-ui/svg-icons/content/report'
import IconStatusTimedOut from 'material-ui/svg-icons/action/watch-later'
import IconStatusNone from 'material-ui/svg-icons/action/done'

import IconEventModified from 'material-ui/svg-icons/action/done'
import IconEventAdded from 'material-ui/svg-icons/content/add'
import IconEventDeleted from 'material-ui/svg-icons/content/remove'
import IconEventError from 'material-ui/svg-icons/content/report'
import { grey500 } from 'material-ui/styles/colors'

import './icons.css'

const styles = {
  size: {
    height: 30,
    width: 30,
    display: 'table-cell',
  }
}

export const resourceStatus = {
  // ok: <IconStatusOK style={{...styles.size, color: 'rgba(0, 150, 61, 0.8)'}} />,
  'ok': <IconStatusOK style={{...styles.size, color: blueA400}} data-rh={`status: ok`}/>,
  'scaling up': <div style={{position: 'relative', margin: '2px 0px 2px 4px'}}>
    <IconStatusScalingUp style={{
        width: 21, height: 21, 
        color: 'rgba(0, 0,0, 0.3)', 
        marginTop: 2,
        display: 'table-cell',}} data-rh={`status: scaling up`}/>
    <div className="scaling"/></div>,
  'scaling down': <div style={{position: 'relative', margin: '2px 0px 2px 4px'}}>
    <IconStatusScalingDown style={{
        width: 21, height: 21, 
        color: 'rgba(0, 0,0, 0.3)',
        display: 'table-cell',}} data-rh={`status: scaling down`}/>
    <div className="scaling"/></div>,
  'disabled': <IconStatusDisabled style={{...styles.size, color: 'rgba(0, 0,0, 0.3)'}} data-rh={`status: disabled`}/>,
  'unknown': <IconStatusUnknown style={{...styles.size, color: 'rgba(0, 0,0, 0.3)'}} data-rh={`status: unknown`}/>,
  'warning': <IconStatusWarning style={{
    marginLeft: -1, width: 32, height: 32, color: '#FFC107', display: 'table-cell',}} data-rh={`status: warning`}/>,
  'error': <IconStatusError style={{
    marginLeft: -1, height: 32, width: 32, color: '#F44336', display: 'table-cell',}} data-rh={`status: error`}/>,
  'none': <IconStatusNone style={{...styles.size, color: 'rgba(0, 0,0, 0.3)'}} data-rh={`status: none`}/>,
  'timed out': <IconStatusTimedOut style={{
    marginLeft: -1, width: 32, height: 32, color: '#FFC107', display: 'table-cell',}} data-rh={`status: timed out`}/>,
}

export const eventType = {
  ADDED: <IconEventAdded style={{color: grey500}}/>,
  DELETED: <IconEventDeleted style={{color: grey500}}/>,
  ERROR: <IconEventError style={{color: grey500}}/>,
  MODIFIED: <IconEventModified style={{color: grey500}}/>,
}
