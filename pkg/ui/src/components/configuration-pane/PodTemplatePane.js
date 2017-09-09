import React from 'react'
import {Card, CardHeader, CardText} from 'material-ui/Card'
import {grey800} from 'material-ui/styles/colors'
import {
  Table,
  TableBody,
  TableRow,
  TableRowColumn,
} from 'material-ui/Table'
import sizeMe from 'react-sizeme'

import ContainerPanel from './ContainerPanel'
import Volumes from './Volumes'
import yaml from 'js-yaml'
import './PodTemplatePane.css'

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
  },
  valueStyle: {
    fontFamily: 'Open Sans, monospace',
    margin: 0,
    fontSize: 13,
  }
}

export default sizeMe({ monitorHeight: true, monitorWidth: true }) (
class PodTemplatePane extends React.Component {
  
  render() {
  
    let { props } = this
    let { resource } = props

    let {status, spec, metadata } = resource.spec.template

    return (
      <div style={{
        height: `calc(100vh - ${props.contentTop + 30}px)`,
        overflow: 'auto',
        marginRight: 0,
        marginLeft: 0,
        }}
        className="row"
        >
        <div className="col-xs-12 col-sm-12 col-md-12 col-lg-12">
          <Card style={{...styles.cards, paddingRight: 16}}>
            <CardText style={{paddingBottom: 0}}>
            <div className="row">
              <div className="col-xs-12 col-sm-12 col-md-6 col-lg-6">
                <Table style={{
                  border: 'transparent',
                  padding: 16,
                  paddingLeft: 16,
                  tableLayout: 'inherit',
                }} selectable={false} headerStyle={{display: 'none'}}>
                <TableBody displayRowCheckbox={false}>
                  {spec.nodeName && tableRow('Node:', spec.nodeName)}

                  {metadata && metadata.name && tableRow('Name:', metadata.name)}
                  {metadata && metadata.labels && tableRow('Labels:', metadata.labels)}
                  {spec.dnsPolicy && tableRow('DNS Policy:', spec.dnsPolicy)}
                  {spec.restartPolicy && tableRow('Restart Policy:', spec.restartPolicy)}
                  {status && tableRow('Start Time:', status.startTime)}
                </TableBody>
              </Table>
            </div>
            <div className="col-xs-12 col-sm-12 col-md-6 col-lg-6">
              <Table style={{
                border: 'transparent',
                padding: 16,
                paddingLeft: 16,
                tableLayout: 'inherit',
              }} selectable={false} headerStyle={{display: 'none'}}>
                <TableBody displayRowCheckbox={false}>
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
        </div>
        <div className="col-xs-12 col-sm-12 col-md-12 col-lg-12">
            <Card style={{...styles.cards, marginTop: -15}}>
              <CardHeader 
                style={styles.cardHeader}
                title={'containers'}
                titleStyle={styles.cardHeaderTitle}
              />
              <CardText>
                <div className="row" style={{marginLeft: 0, marginRight: 0}}>
                  {resource.spec.template.spec.initContainers && 
                    resource.spec.template.spec.initContainers.map(container => {
                      return <div key={container.name} className="col-xs-12 col-sm-6 col-md-6 col-lg-6" style={{marginBottom: 15, paddingLeft: 0}}>
                        <ContainerPanel key={container.name} container={container} namespace={resource.metadata.namespace} isInit={true}/>
                      </div>
                    })
                  }
                  {resource.spec.template.spec.containers.map(container => {
                    return <div key={container.name} className="col-xs-12 col-sm-6 col-md-6 col-lg-6" style={{marginBottom: 15, paddingLeft: 0}}>
                      <ContainerPanel key={container.name} container={container} namespace={resource.metadata.namespace}/>
                    </div>
                  })}
                </div>
              </CardText>
            </Card>
          </div>
      </div>
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
    rendered = <pre style={styles.valueStyle}>{yaml.safeDump(value)}</pre>
  }
  return rendered
}

