
import React from 'react'
import { white } from 'material-ui/styles/colors'
import { toHumanizedAge } from '../../converters'
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

export default class ThirdPartyResourcesTab extends React.Component {

  constructor(props) {
    super(props)

    this.kind = 'ThirdPartyResource'
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
        id: 'versions',
        label: 'versions',
        sortable: true,
        headerStyle: styles.header,
        style: { ...styles.cell,
          width: 150,
        },
        value: function(r) {
          return r.versions.map(v=>v.name).join(', ')
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
          return toHumanizedAge(age)
        }
      },
    ]
  }

  render() {
    return <ClusterResourceTab kind={this.kind} columns={this.columns} deletable={true}/>
  }
}