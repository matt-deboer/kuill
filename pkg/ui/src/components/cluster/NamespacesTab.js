
import React from 'react'
import { white } from 'material-ui/styles/colors'
import { viewResource } from '../../state/actions/resources'
import { connect } from 'react-redux'
import ClusterResourceTab from './ClusterResourceTab'
import FilterChip from '../FilterChip'

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
    viewResource: function(resourceKey, view='config') {
      dispatch(viewResource(resourceKey,view))
    },
  } 
}

export default connect(mapStateToProps, mapDispatchToProps) (
class NamespacesTab extends React.Component {

  constructor(props) {
    super(props)

    this.state = {
      quotasByNs: this.getQuotasByNs(props.resources),
    }
    let that = this
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
      {
        id: 'quotas',
        label: 'quotas',
        headerStyle: styles.header,
        style: { ...styles.cell,
          paddingLeft: 20,
        },
        clickDisabled: true,
        render: function(r) {
          return (<div>
            {(that.state.quotasByNs[r.name] || []).map( q =>
              <FilterChip key={q.metadata.name} prefix={'rq'} 
                suffix={q.metadata.name} 
                onTouchTap={that.props.viewResource.bind(that, `ResourceQuota/${q.metadata.namespace}/${q.metadata.name}`, 'config')}
                />)
            }
          </div>)
        }
      },
    ]
  }

  getQuotasByNs = (resources) => {
    let quotasByNs = {}
    Object.entries(resources).filter(([key, resource])=> resource.kind === 'ResourceQuota')
      .forEach(([key, resource]) => {
        let quotas = quotasByNs[resource.metadata.namespace] || []
        quotas.push(resource)
        quotasByNs[resource.metadata.namespace] = quotas
      })
    return quotasByNs
  }

  componentWillReceiveProps = (props) => {
    this.setState({
      quotasByNs: this.getQuotasByNs(props.resources),
    })
  }

  render() {
    return <ClusterResourceTab kind={this.kind} columns={this.columns} editable={true} deletable={true}/>
  }
})