import React from 'react'
import {white, grey800} from 'material-ui/styles/colors'
import {
  Table,
  TableBody,
  TableRow,
  TableRowColumn,
} from 'material-ui/Table'
import Subheader from 'material-ui/Subheader'
import './ContainerPanel.css'

const rowHeight = 22
const styles = {
  wrapper: {
    border: '1px solid rgba(0,0,0,0.1)'
  },
  subheader: {
    backgroundColor: '#004d99'/*rgb(13, 64, 109)'/*grey500*/,
    color: white,
    lineHeight: '24px',
  },
  tableRow: {
    height: rowHeight,
  },
  tableRowKeyCol: {
    padding: '2px 10px 2px 0',
    color: grey800,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    paddingRight: 10,
    height: rowHeight,
    verticalAlign: 'top',
  },
  tableRowValCol: {
    // width: '99%',
    whiteSpace: 'normal',
    padding: 2,
    height: rowHeight,
    overflow: 'visible',
  }
}

export default class ContainerPanel extends React.Component {

  render() {
  
    
    let { props } = this
    let { container } = props

    return (
      <div style={styles.wrapper}>
        <Subheader style={styles.subheader}>{container.name}</Subheader>
        <Table 
          wrapperStyle={{padding: 10}}
          style={{
            border: 'transparent',
            padding: 16,
            paddingLeft: 16,
            tableLayout: 'inherit',
          }} selectable={false} headerStyle={{display: 'none'}}>
          <TableBody displayRowCheckbox={false} style={{padding: 10}}>
            {tableRow('Image:', container.image)}
            {tableRow('Pull Policy:', container.imagePullPolicy)}
            {tableRow('Ports:', (container.ports ? container.ports.map(port=>`${port.containerPort}:${port.name}:${port.protocol}`).join(', '): ''))}
            {tableRow('Image:', container.image)}
            <TableRow style={styles.tableRow} displayBorder={false}>
              <TableRowColumn style={styles.tableRowKeyCol}>Mounts:</TableRowColumn>
              <TableRowColumn style={styles.tableRowValCol}>
                <div style={{marginLeft: -50, paddingTop: 35}}>
                  {container.volumeMounts.map(mount =>
                  <div>
                    <span className="mount-name">{mount.mountPath}</span> from <span className="mount-from">{mount.name}</span>
                    <span className={'mount-perms' + (mount.readOnly? ' ro': '')}>{mount.readOnly? '(ro)': ''}</span>
                  </div>
                  )}
                </div>
              </TableRowColumn>
            </TableRow>
          </TableBody>
        </Table>
    </div>
    )
  }
}

function tableRow(key, val) {
  return <TableRow style={styles.tableRow} displayBorder={false}>
            <TableRowColumn style={styles.tableRowKeyCol}>{key}</TableRowColumn>
            <TableRowColumn style={styles.tableRowValCol}>{val}</TableRowColumn>
        </TableRow>
}
