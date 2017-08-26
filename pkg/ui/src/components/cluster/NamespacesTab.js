
import React from 'react'
import { white } from 'material-ui/styles/colors'
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

export default class NamespacesTab extends React.Component {

  constructor(props) {
    super(props)

    this.kind = 'Namespace'
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
    ]
  }

  render() {
    return <ClusterResourceTab kind={this.kind} columns={this.columns} editable={true} deletable={true}/>
  }
}