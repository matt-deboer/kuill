import React from 'react'
import PropTypes from 'prop-types'
import { List, ListItem } from 'material-ui/List'
import Subheader from 'material-ui/Subheader'
import Divider from 'material-ui/Divider'
import Paper from 'material-ui/Paper'
import { white } from 'material-ui/styles/colors'
import { Link } from 'react-router-dom'
import queryString from 'query-string'
import { connect } from 'react-redux'
import KubeKinds from '../../kube-kinds'
import { linkForResourceKind } from '../../routes'

const mapStateToProps = function(store) {
  return {
    selectedNamespaces: store.usersettings.selectedNamespaces,
    workloadResources: store.workloads.resources,
    clusterResources: store.cluster.resources,
  }
}

const mapDispatchToProps = function(dispatch, ownProps) {
  return {
  }
}

export default connect(mapStateToProps, mapDispatchToProps) (
class ResourceCounts extends React.PureComponent {

  static propTypes = {
    selectedNamespaces: PropTypes.object,
    workloadResources: PropTypes.object,
    clusterResources: PropTypes.object,
  }

  render() {

    let { clusterResources, workloadResources, selectedNamespaces } = this.props

    const styles = {
      wrapper: {
        marginTop: 0,
        backgroundColor: 'rgb(80,80,80)',
        border: '1px solid rgba(0,0,0,0.5)',
      },
      subheader: {
        fontSize: 18,
        color: white,
        backgroundColor: 'rgba(41, 121, 255, 0.8)',
        borderBottom: '1px solid rgba(0,0,0,0.5)',
        lineHeight: '30px',
      },
      secondary: {
        overflow: 'visible',
        paddingBottom: 20,
        height: 'inherit',
        whitespace: 'normal'
      },
      message: {
        overflow: 'visible',
        whiteSpace: 'normal',
        paddingBottom: 10,
      },
      type: {
        fontWeight: 600,
      },
      item: {
        wordWrap: 'break-word',
        padding: 8,
        color: 'rgb(240,240,240)',
        fontSize: 14,
      },
      count: {
        float: 'right',
        paddingRight: 15,
      },
      divider: {
        backgroundColor: 'rgba(224, 224, 224, 0.2)',
      },
      link: {
        color: 'rgb(240, 240, 240)',
      }
    }

    let countsByKind = {}
    let namespacesFiltered = (Object.keys(selectedNamespaces).length > 0)
    for (let key in workloadResources) {
      let resource = workloadResources[key]
      if (!namespacesFiltered || resource.metadata.namespace in selectedNamespaces) {
        countsByKind[resource.kind] = (countsByKind[resource.kind] || 0) + 1
      }
    }
    if (!namespacesFiltered) {
      for (let key in clusterResources) {
        let resource = clusterResources[key]
        countsByKind[resource.kind] = (countsByKind[resource.kind] || 0) + 1
      }
    }

    let items = []
    for (let kind in countsByKind) {
      if (kind === 'Endpoints' || kind === 'ReplicaSet') {
        continue
      }
      let name = kind
      if (!(name.endsWith('s'))) {
        name += 's'
      } else if (name.endsWith('ss')) {
        name += 'es'
      }
      let link = linkForResourceKind(kind)

      items.push(
        <div key={kind}>
          <ListItem
            disabled={true}
            leftIcon={null}
            primaryText={<div>
              <Link to={link} style={styles.link}>{name}</Link>
              <span style={styles.count}>{countsByKind[kind]}</span>
            </div>
            }
            style={styles.item}
          />
          <Divider inset={false} style={styles.divider}/>
        </div>
      )
    }

    return (
      <Paper style={styles.wrapper}>
        <Subheader style={styles.subheader}>Resource Counts</Subheader>
        <List className={'list-contents'}>
          {items}
        </List>
      </Paper>
    )
  }
})
