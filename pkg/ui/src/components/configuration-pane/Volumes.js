import React from 'react'
import { Link } from 'react-router-dom'
import { linkForResource } from '../../routes'

export default class Volumes extends React.PureComponent {
  
  renderVolume = (vol) => {
    var type, value
    let ns = this.props.namespace
    if (!!vol.secret) {
      type = 'Secret'
      let link = linkForResource(`${type}/${ns}/${vol.secret.secretName}`)
      value = <Link to={link}>{vol.secret.secretName}</Link>
    } else if (!!vol.configMap) {
      type = 'ConfigMap'
      let link = linkForResource(`${type}/${ns}/${vol.configMap.name}`)
      value = <Link to={link}>{`${vol.configMap.name}${vol.configMap.optional ? ' (optional)': ''}`}</Link>
    } else if (!!vol.persistentVolumeClaim) {
      type = 'PersistentVolumeClaim'
      let link = linkForResource(`${type}/${ns}/${vol.persistentVolumeClaim.claimName}`)
      value = <Link to={link}>{`${vol.persistentVolumeClaim.claimName}`}</Link>
    } else if (!!vol.hostPath) {
      type = 'hostPath'
      value = vol.hostPath.path
    } else {
      for (let key in vol) {
        if (key !== 'name') {
          type = key
          break
        }  
      }
      let parts = []
      for (let k in vol[type]) {
        let v = vol[type][k]
        parts.push(`${k}=${v}`)
      }
      value = `{ ${parts.join(', ')} }`
    }
    return (
      <div key={vol.name}>
        <span className="volume-name">{vol.name}</span> : <span className="volume-type">{type}</span> : <span className="volume-detail">{value}</span>
      </div>
    )
  }

  render() {
  
    let { props } = this
    let { volumes } = props

    return (
      <div style={{marginLeft: -50, paddingTop: 35}}>
        {volumes.map(vol => this.renderVolume(vol))}
      </div>      
    )
  }
}

