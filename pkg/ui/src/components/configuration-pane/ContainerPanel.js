import React from 'react'
import {white, grey800} from 'material-ui/styles/colors'
import {
  Table,
  TableBody,
  TableRow,
  TableRowColumn,
} from 'material-ui/Table'
import Subheader from 'material-ui/Subheader'
import StringArrayExpander from './StringArrayExpander'
import EnvironmentExpander from './EnvironmentExpander'
import GenericExpanderButton from './GenericExpanderButton'
import yaml from 'js-yaml'

import './ContainerPanel.css'

const rowHeight = 22
const styles = {
  wrapper: {
    border: '1px solid rgba(0,0,0,0.1)',
    backgroundColor: 'rgba(30, 30, 30, 0.15)',
  },
  subheader: {
    backgroundColor: '#004d99'/*rgb(13, 64, 109)'/*grey500*/,
    color: white,
    width: 'auto',
    margin: '0 -1px 0 -1px',
    lineHeight: '24px',
    fontWeight: 600,
  },
  table: {
    backgroundColor: 'transparent',
    border: 'transparent',
    padding: 16,
    paddingLeft: 16,
    tableLayout: 'inherit',
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
    width: '99%',
    whiteSpace: 'normal',
    padding: 2,
    height: rowHeight,
    overflow: 'visible',
  },
}

export default class ContainerPanel extends React.Component {
 
  render() {
  
    let { props } = this
    let { container, namespace, initIndex } = props
    let initHeader = null
    if (initIndex !== undefined) {
      initHeader = <span className="init-container-index">{initIndex}</span>
    }
    return (
      <div style={styles.wrapper}>

        <Subheader style={styles.subheader}>{container.name}{initHeader}</Subheader>
        <Table 
          wrapperStyle={{padding: 10}}
          style={styles.table} selectable={false} headerStyle={{display: 'none'}}>
          <TableBody displayRowCheckbox={false} style={{padding: 10}}>
            {tableRow('Image:', container.image)}
            {tableRow('Pull Policy:', container.imagePullPolicy)}
            {container.ports &&
              tableRow('Ports:', (container.ports ? container.ports.map(port=>`${port.containerPort}:${port.name}:${port.protocol}`).join(', '): ''))
            }

            {container.command &&
              <TableRow style={styles.tableRow} displayBorder={false}>
                <TableRowColumn style={styles.tableRowKeyCol}>Command:</TableRowColumn>
                <TableRowColumn style={styles.tableRowValCol}><StringArrayExpander data={container.command} title={'command'}/></TableRowColumn>
              </TableRow>
            }

            {container.args &&
              <TableRow style={styles.tableRow} displayBorder={false}>
                <TableRowColumn style={styles.tableRowKeyCol}>Args:</TableRowColumn>
                <TableRowColumn style={styles.tableRowValCol}><StringArrayExpander data={container.args} title={'args'}/></TableRowColumn>
              </TableRow>
            }
              
            {container.env &&
              <TableRow style={styles.tableRow} displayBorder={false}>
                <TableRowColumn style={styles.tableRowKeyCol}>Env:</TableRowColumn>
                <TableRowColumn style={styles.tableRowValCol}><EnvironmentExpander data={container.env} title={'env'} namespace={namespace}/></TableRowColumn>
              </TableRow>
            }

            {container.livenessProbe &&
              <TableRow style={styles.tableRow} displayBorder={false}>
                <TableRowColumn style={styles.tableRowKeyCol}>Liveness Probe:</TableRowColumn>
                <TableRowColumn style={styles.tableRowValCol}>
                  <GenericExpanderButton contents={<pre>{yaml.safeDump(container.livenessProbe)}</pre>} title={'liveness probe'} 
                    anchorOrigin={{horizontal: 'left', vertical: 'bottom'}} targetOrigin={{horizontal: 'left', vertical: 'bottom'}}/>
                </TableRowColumn>
              </TableRow>
            }

            {container.readinessProbe &&
              <TableRow style={styles.tableRow} displayBorder={false}>
                <TableRowColumn style={styles.tableRowKeyCol}>Readiness Probe:</TableRowColumn>
                <TableRowColumn style={styles.tableRowValCol}>
                  <GenericExpanderButton contents={<pre>{yaml.safeDump(container.readinessProbe)}</pre>} title={'readiness probe'} 
                    anchorOrigin={{horizontal: 'left', vertical: 'bottom'}} targetOrigin={{horizontal: 'left', vertical: 'bottom'}}/>
                </TableRowColumn>
              </TableRow>
            }

            {container.volumeMounts && 
              <TableRow style={styles.tableRow} displayBorder={false}>
                <TableRowColumn style={styles.tableRowKeyCol}>Mounts:</TableRowColumn>
                <TableRowColumn style={styles.tableRowValCol}>
                  <div style={{marginLeft: -50, paddingTop: 35}}>
                    {container.volumeMounts.map(mount =>
                    <div key={mount.name}>
                      <span className="mount-name">{mount.mountPath}</span> from <span className="mount-from">{mount.name}</span>
                      <span className={'mount-perms' + (mount.readOnly? ' ro': '')}>{mount.readOnly? '(ro)': ''}</span>
                    </div>
                    )}
                  </div>
                </TableRowColumn>
              </TableRow>
            }
          </TableBody>
        </Table>
    </div>
    )
  }
}

function tableRow(key, val) {
  return <TableRow key={key} style={styles.tableRow} displayBorder={false}>
            <TableRowColumn style={styles.tableRowKeyCol}>{key}</TableRowColumn>
            <TableRowColumn style={styles.tableRowValCol}>{val}</TableRowColumn>
        </TableRow>
}
