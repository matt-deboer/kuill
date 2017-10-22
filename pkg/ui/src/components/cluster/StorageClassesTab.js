
import React from 'react'
import { white } from 'material-ui/styles/colors'
import { toHumanizedAge, convertUnits, parseUnits } from '../../converters'
import { routerActions } from 'react-router-redux'
import { connect } from 'react-redux'
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
    resources: store.resources.resources,
  }
}

const mapDispatchToProps = function(dispatch, ownProps) {
  return {
    selectView: function(tab) {
      let { location } = ownProps
      let newSearch = `?view=${tab}`
      console.log(`selectView: pushed new location...`)
      dispatch(routerActions.push({
        pathname: location.pathname,
        search: newSearch,
        hash: location.hash,
      }))
    },
  }
}

export default connect(mapStateToProps, mapDispatchToProps) (
class StorageClassesTab extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      volumesByClass: {},
    }
    this.updateVolumesByClass(props.resources)
    this.kind = 'StorageClass'
    let that = this
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
        id: 'volumes',
        label: 'volumes',
        sortable: true,
        headerStyle: {...styles.header,
          paddingRight: 20,
        },
        style: { ...styles.cell,
          width: '10%',
          textAlign: 'right',
          paddingRight: 30,
        },
        value: function(r) {
          return (that.state.volumesByClass[r.name] || []).length
        },
      },
      {
        id: 'provisioned',
        label: 'provisioned',
        sortable: true,
        headerStyle: {...styles.header,
          paddingRight: 20,
        },
        style: { ...styles.cell,
          width: '20%',
          textAlign: 'right',
          paddingRight: 40,
        },
        value: function(r) {
          let size = 0
          for (let vol of (that.state.volumesByClass[r.name] || [])) {
            let cap = parseUnits(vol.spec.capacity.storage)
            let total = convertUnits(cap[0], cap[1], 'gibibytes')
            size += total
          }
          return `${size} Gi`
        },
      },
      {
        id: 'provisioner',
        label: 'provisioner',
        sortable: true,
        headerStyle: styles.header,
        style: { ...styles.cell,
          width: '25%',
        },
        value: function(r) {
          return r.provisioner
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

  updateVolumesByClass = (resources) => {
    let volumesByClass = {}
    Object.entries(resources).filter(([key, resource])=> resource.kind === 'PersistentVolume')
      .forEach(([key, resource]) => {
        let volumes = volumesByClass[resource.spec.storageClassName] || []
        volumes.push(resource)
        volumesByClass[resource.spec.storageClassName] = volumes
      })
    this.setState({
      volumesByClass: volumesByClass
    })
  }

  componentWillReceiveProps = (props) => {
    this.updateVolumesByClass(props.resources)
  }

  getVolumesForStorageClass = (sc) => {

  }

  render() {
    return <ClusterResourceTab kind={this.kind} columns={this.columns} deletable={true}/>
  }
})