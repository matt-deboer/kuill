
import React from 'react'
import { white } from 'material-ui/styles/colors'
import * as moment from 'moment'
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