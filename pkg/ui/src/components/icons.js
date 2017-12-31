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
  },
  small: {
    height: 20,
    width: 20,
    display: 'table-cell',
  }
}

export const containerStatus = {
  // ok: <IconStatusOK style={{...styles.size, color: 'rgba(0, 150, 61, 0.8)'}} />,
  'ok': <IconStatusOK style={{...styles.small, color: 'rgba(250,250,250,0.8)'}} className={'status ok'} data-rh={`status: ok`}/>,
  'scaling up': <div style={{position: 'relative', margin: '2px 0px 2px 4px'}} className={'status scaling-up'} data-rh={`status: scaling up`}>
    <IconStatusScalingUp style={{
        width: 14, height: 14, 
        color: 'rgba(250,250,250,0.8)', 
        marginTop: 2,
        display: 'table-cell',}} />
    <div className="scaling small"/></div>,
  'scaling down': <div style={{position: 'relative', margin: '2px 0px 2px 4px'}}className={'status scaling-down'} data-rh={`status: scaling down`}>
    <IconStatusScalingDown style={{
        width: 14, height: 14, 
        color: 'rgba(250,250,250,0.8)',
        display: 'table-cell',}} />
    <div className="scaling down small"/></div>,
  'disabled': <IconStatusDisabled style={{...styles.small, color: 'rgba(250,250,250,0.6)'}} className={'status disabled'} data-rh={`status: disabled`}/>,
  'unknown': <IconStatusUnknown style={{...styles.small, color: 'rgba(250,250,250,0.6)'}} className={'status unknown'} data-rh={`status: unknown`}/>,
  'warning': <IconStatusWarning style={{
    marginLeft: -1, width: 21, height: 21, color: '#FFC107', display: 'table-cell',}} className={'status warning'} data-rh={`status: warning`}/>,
  'error': <IconStatusError style={{
    marginLeft: -1, height: 21, width: 21, color: '#F44336', display: 'table-cell',}} className={'status error'} data-rh={`status: error`}/>,
  'none': <IconStatusNone style={{...styles.small, color: 'rgba(0, 0,0, 0.3)'}} className={'status none'} data-rh={`status: none`}/>,
  'complete': <IconStatusNone style={{...styles.small, color: 'rgba(0, 0,0, 0.3)'}} className={'status complete'} data-rh={`status: complete`}/>,
  'timed out': <IconStatusTimedOut style={{
    marginLeft: -1, width: 21, height: 21, color: '#FFC107', display: 'table-cell',}} className={'status timed-out'} data-rh={`status: timed out`}/>,
}

export const resourceStatus = {
  // ok: <IconStatusOK style={{...styles.size, color: 'rgba(0, 150, 61, 0.8)'}} />,
  'ok': <IconStatusOK style={{...styles.size, color: blueA400}} className={'status ok'} data-rh={`status: ok`}/>,
  'scaling up': <div style={{position: 'relative', margin: '2px 0px 2px 4px'}} className={'status scaling-up'} data-rh={`status: scaling up`}>
    <IconStatusScalingUp style={{
        width: 21, height: 21, 
        color: 'rgba(0, 0,0, 0.3)', 
        marginTop: 2,
        display: 'table-cell',}} />
    <div className="scaling"/></div>,
  'scaling down': <div style={{position: 'relative', margin: '2px 0px 2px 4px'}} className={'status scaling-down'} data-rh={`status: scaling down`}>
    <IconStatusScalingDown style={{
        width: 21, height: 21, 
        color: 'rgba(0, 0,0, 0.3)',
        display: 'table-cell',}} />
    <div className="scaling down"/></div>,
  'disabled': <IconStatusDisabled style={{...styles.size, color: 'rgba(0, 0,0, 0.3)'}} className={'status disabled'} data-rh={`status: disabled`}/>,
  'unknown': <IconStatusUnknown style={{...styles.size, color: 'rgba(0, 0,0, 0.3)'}} className={'status unknown'} data-rh={`status: unknown`}/>,
  'warning': <IconStatusWarning style={{
    marginLeft: -1, width: 32, height: 32, color: '#FFC107', display: 'table-cell',}} className={'status warning'} data-rh={`status: warning`}/>,
  'error': <IconStatusError style={{
    marginLeft: -1, height: 32, width: 32, color: '#F44336', display: 'table-cell',}} className={'status error'} data-rh={`status: error`}/>,
  'none': <IconStatusNone style={{...styles.size, color: 'rgba(0, 0,0, 0.3)'}} className={'status none'} data-rh={`status: none`}/>,
  'complete': <IconStatusNone style={{...styles.size, color: 'rgba(0, 0,0, 0.3)'}} className={'status complete'} data-rh={`status: complete`}/>,
  'timed out': <IconStatusTimedOut style={{
    marginLeft: -1, width: 32, height: 32, color: '#FFC107', display: 'table-cell',}} className={'status timed-out'} data-rh={`status: timed out`}/>,
}

export const eventType = {
  ADDED: <IconEventAdded style={{color: grey500}}/>,
  DELETED: <IconEventDeleted style={{color: grey500}}/>,
  ERROR: <IconEventError style={{color: grey500}}/>,
  MODIFIED: <IconEventModified style={{color: grey500}}/>,
}
