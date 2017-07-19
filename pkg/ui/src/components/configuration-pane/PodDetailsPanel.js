import React from 'react'
import {Card, CardText} from 'material-ui/Card'
import {grey800} from 'material-ui/styles/colors'
import {
  Table,
  TableBody,
  TableRow,
  TableRowColumn,
} from 'material-ui/Table'
import sizeMe from 'react-sizeme'
import Volumes from './Volumes'
import './PodDetailsPanel.css'
import yaml from 'js-yaml'

const rowHeight = 22
const styles = {
  cards: {
    margin: 10,
    boxShadow: 'none',
  },
  cardHeader: {
    borderBottom: '1px solid rgba(0,0,0,0.1)',
    padding: '0 0 5px 0',
    margin: '0 16px',
  },
  cardHeaderTitle: {
    color: 'rgba(0,0,0,0.4)',
    fontWeight: 600,
    // fontStyle: 'italic',
    fontSize: '18px',
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
  }
}

export default sizeMe({ monitorHeight: true, monitorWidth: true }) (
class PodDetailsPanel extends React.Component {

  render() {
  
    let { props } = this
    let { resource } = props

    let {status, spec } = resource

    return (
      <Card style={{...styles.cards, paddingRight: 16}}>
        <CardText>
        <div className="row">
          <div className="col-xs-12 col-sm-6 col-md-6 col-lg-6">
            <Table style={{
              border: 'transparent',
              padding: 16,
              paddingLeft: 16,
              tableLayout: 'inherit',
            }} selectable={false} headerStyle={{display: 'none'}}>
            <TableBody displayRowCheckbox={false}>
              {tableRow('Status:', status.phase)}
              {tableRow('Start Time:', status.startTime)}
              {tableRow('Pod IP:',status.podIP)}
              {tableRow('Host IP:', status.hostIP)}
              {tableRow('Conditions:', (status.conditions ? status.conditions.map(cond => `${cond.type}`).join(', '): ''))}
              {tableRow('QoS Class:', status.qosClass)}
            </TableBody>
          </Table>
        </div>
        <div className="col-xs-12 col-sm-6 col-md-6 col-lg-6">
          <Table style={{
            border: 'transparent',
            padding: 16,
            paddingLeft: 16,
            tableLayout: 'inherit',
          }} selectable={false} headerStyle={{display: 'none'}}>
            <TableBody displayRowCheckbox={false}>
              {spec.nodeName && tableRow('Node:', spec.nodeName)}
              {spec.dnsPolicy && tableRow('DNS Policy:', spec.dnsPolicy)}
              {spec.restartPolicy && tableRow('Restart Policy:', spec.restartPolicy)}
              {spec.nodeSelector && tableRow('Node-Selectors:', spec.nodeSelector)}
              {spec.volumes &&
                <TableRow style={styles.tableRow} displayBorder={false}>
                  <TableRowColumn style={styles.tableRowKeyCol}>Volumes:</TableRowColumn>
                  <TableRowColumn style={styles.tableRowValCol}><Volumes volumes={spec.volumes} namespace={resource.metadata.namespace}/></TableRowColumn>
                </TableRow>
              }
            </TableBody>
          </Table>
          </div>
        </div>
        </CardText>
      </Card>
    )
  }

})

function tableRow(key, val) {
  return <TableRow style={styles.tableRow} displayBorder={false}>
            <TableRowColumn style={styles.tableRowKeyCol}>{key}</TableRowColumn>
            <TableRowColumn style={styles.tableRowValCol}>{renderValue(val)}</TableRowColumn>
        </TableRow>
}

function renderValue(value) {
  let rendered = value
  if (typeof value === 'object') {
    rendered = yaml.safeDump(value)
  }
  return <pre style={{margin: 0, fontSize: 13}}>{rendered}</pre>
}
