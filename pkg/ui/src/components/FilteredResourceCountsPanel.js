import React from 'react'

export default class FilteredResourceCountsPanel extends React.PureComponent {

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
      <div style={{...styles.counts, ...props.style}}>
        {counts.map((count)=>
          <div key={count.name} style={styles.countItem}>{count.name}:<span style={styles.count}>{count.value}</span></div>  
        )}
      </div> 
    )
  }
}
