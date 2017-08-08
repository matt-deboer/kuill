import React from 'react'
import ReactDOM from 'react-dom'
import Dialog from 'material-ui/Dialog'
import FlatButton from 'material-ui/FlatButton'
import RaisedButton from 'material-ui/RaisedButton'
import TextField from 'material-ui/TextField'
import { grey300, grey800, red900 } from 'material-ui/styles/colors'
import { Link } from 'react-router-dom'
import { linkForResource } from '../routes'

export default class WorkloadCountsPanel extends React.PureComponent {

  render() {

    let { props } = this
    let { resources } = props

    const styles ={
      counts: {
        height: 40,
        width: '100%',
        fontSize: 13,
        background: 'rgb(66,77,99)',
        color: 'rgb(240,240,240)',
        margin: '0 -1rem',
        padding: '10px 1rem',
      },
      countItem: {
        display: 'inline-block',
        paddingRight: 15,
      },
      count: {
        fontWeight: 600,
        paddingLeft: 4,
      }
    }

    let countsByKind = {}
    for (let r in resources) {
      let resource = resources[r]
      if (!resource.isFiltered) {
        countsByKind[resource.kind] = (countsByKind[resource.kind] || 0) + 1
      }
    }
    let counts = []
    for (let n in countsByKind) {
      let name = n
      if (n.endsWith('ss')) {
        name += 'es'
      } else if (!n.endsWith('s')) {
        name += 's'
      }
      let count = countsByKind[n]
      counts.push({name: name, value: count})
    }
    counts.sort((a,b)=>a.name.localeCompare(b.name))

    return (
      <div style={styles.counts}>
        {counts.map((count)=>
          <div style={styles.countItem}>{count.name}:<span style={styles.count}>{count.value}</span></div>  
        )}
      </div> 
    )
  }
}
