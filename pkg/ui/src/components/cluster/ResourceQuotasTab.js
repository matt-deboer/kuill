
import React from 'react'
import FloatingActionButton from 'material-ui/FloatingActionButton'
import {blueA400, grey500, grey600, blueA100, white } from 'material-ui/styles/colors'
import { routerActions } from 'react-router-redux'
import { connect } from 'react-redux'
import { addFilter, removeFilter, removeResource } from '../../state/actions/cluster'
import sizeMe from 'react-sizeme'
import FilterTable from '../filter-table/FilterTable'
import * as moment from 'moment'

import ChipInput from 'material-ui-chip-input'
import Chip from 'material-ui/Chip'
import { withRouter } from 'react-router-dom'
import { linkForResource } from '../../routes'
import IconLogs from 'material-ui/svg-icons/action/receipt'
import IconShell from 'material-ui/svg-icons/hardware/computer'
import IconEdit from 'material-ui/svg-icons/editor/mode-edit'

import Popover from 'material-ui/Popover'
import Paper from 'material-ui/Paper'

import { arraysEqual } from '../../comparators'
import { resourceStatus as resourceStatusIcons } from '../icons'
import { compareStatuses } from '../../utils/resource-utils'
import { hostnameLabel } from '../../utils/filter-utils'
import KubeKinds from '../../kube-kinds'
import './ClusterResourceTab.css'

import Perf from 'react-addons-perf'
import ClusterResourceTab from './ClusterResourceTab'

const styles = {
  cell: {
    paddingLeft: 2,
    paddingRight: 2,
  },
  header: {
    fontWeight: 600,
    fontSize: '13px',
    color: white,
    fill: white,
  },
}

export default class StorageClassesTab extends React.Component {

  constructor(props) {
    super(props)

    this.kind = 'ResourceQuota'
    this.columns = [
      {
        id: 'name',
        label: 'name',
        sortable: true,
        headerStyle: styles.header,
        style: { ...styles.cell,
          paddingLeft: 20,
        },
        value: function(r) {
          return r.metadata.name
        },
      },
      {
        id: 'namespace',
        label: 'namespace',
        sortable: true,
        headerStyle: styles.header,
        style: { ...styles.cell,
          width: 240,
        },
        value: function(r) {
          return r.metadata.namespace
        },
      },
      {
        id: 'age',
        label: 'age',
        sortable: true,
        headerStyle: styles.header,
        style: { ...styles.cell,
          width: 90,
        },
        value: function(r) {
          return r.metadata.creationTimestamp
        },
        render: function(r) {
          let age = Date.now() - Date.parse(r.metadata.creationTimestamp)
          return moment.duration(age).humanize()
        }
      },
    ]
  }

  render() {
    return <ClusterResourceTab kind={this.kind} columns={this.columns} editable={true} deletable={true}/>
  }
}