
import React from 'react'
import { white } from 'material-ui/styles/colors'
import { viewResource } from '../../state/actions/resources'
import { connect } from 'react-redux'
import { toHumanizedAge } from '../../converters'
import FilterChip from '../FilterChip'
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

const mapStateToProps = function(store) {
  return {
    linkGenerator: store.session.linkGenerator,
  }
}

const mapDispatchToProps = function(dispatch, ownProps) {
  return {
    viewResource: function(resourceKey, view='config') {
      dispatch(viewResource(resourceKey,view))
    },
  } 
}

export default connect(mapStateToProps, mapDispatchToProps) (
class PersistentVolumesTab extends React.Component {

  constructor(props) {
    super(props)

    let that = this
    this.kind = 'PersistentVolume'
    this.columns = [
      {
        id: 'name',
        label: 'name',
        sortable: true,
        headerStyle: styles.header,
        style: { ...styles.cell,
          paddingLeft: '30%',
        },
        value: function(r) {
          return r.metadata.name
        },
      },
      {
        id: 'capacity',
        label: 'capacity',
        sortable: true,
        headerStyle: styles.header,
        style: { ...styles.cell,
          width: '8%',
        },
        value: function(r) {
          return r.spec.capacity.storage
        },
      },
      {
        id: 'access_modes',
        label: 'access modes',
        sortable: true,
        headerStyle: styles.header,
        style: { ...styles.cell,
          width: '10%',
        },
        value: function(r) {
          return r.spec.accessModes.map(m=>m.replace(/[a-z]+/g,'')).join(', ')
        },
      },
      {
        id: 'reclaim_policy',
        label: 'reclaim policy',
        sortable: true,
        headerStyle: styles.header,
        style: { ...styles.cell,
          width: '8%',
        },
        value: function(r) {
          return r.spec.persistentVolumeReclaimPolicy
        },
      },
      {
        id: 'status',
        label: 'status',
        sortable: true,
        headerStyle: styles.header,
        style: { ...styles.cell,
          width: '5%',
        },
        value: function(r) {
          return r.status.phase
        },
      },
      {
        id: 'claim',
        label: 'claim',
        sortable: true,
        headerStyle: styles.header,
        style: { ...styles.cell,
          width: '20%',
        },
        value: function(r) {
          let ref = r.spec.claimRef
          if (ref) {
            return `${ref.kind}/${ref.namespace}/${ref.name}`
          }
        },
        clickDisabled: true,
        render: function(r) {
          let ref = r.spec.claimRef
          if (ref) {
            return (<FilterChip key={'binding'} prefix={'pvc'} 
            suffix={`${ref.namespace}/${ref.name}`} 
            onTouchTap={that.props.viewResource.bind(that, `${ref.kind}/${ref.namespace}/${ref.name}`, 'config')}
            />)
          }
        }
      },
      {
        id: 'storage_class',
        label: 'storage class',
        sortable: true,
        headerStyle: styles.header,
        style: { ...styles.cell,
          width: '15%',
        },
        value: function(r) {
          return r.spec.storageClassName
        },
        clickDisabled: true,
        render: function(r) {
          let sc = r.spec.storageClassName
          if (sc) {
            return (<FilterChip key={'storage-class'} prefix={'sc'} 
            suffix={`${sc}`} 
            onTouchTap={that.props.viewResource.bind(that, `StorageClass/~/${sc}`, 'config')}
            />)
          }
        }
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
    return <ClusterResourceTab kind={this.kind} columns={this.columns} />
  }
})