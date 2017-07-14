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
import { Link } from 'react-router-dom'
import { linkForResource } from '../../routes'
import './PodTemplatePanel.css'

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
    fontStyle: 'italic',
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
class PodTemplatePanel extends React.Component {
  
  constructor(props) {
    super(props)
    this.state = {
      annotationsOpen: false,
      annotationsText: '',
    }
  }

  handleAnnotationsTouchTap = (event) => {
    // This prevents ghost click.
    event.preventDefault();

    this.setState({
      annotationsOpen: true,
      annotationsAnchorEl: event.currentTarget,
      annotationsText: event.currentTarget.dataset.text,
    })
  }

  handleRequestCloseAnnotations = () => {
    this.setState({
      annotationsOpen: false,
      annotationsText: '',
    })
  }

  renderVolume = (vol) => {
    var type, value
    if (!!vol.secret) {
      type = 'Secret'
      let link = linkForResource(`Secret/${this.props.pod.metadata.namespace}/${vol.secret.secretName}`)
      value = <Link to={link}>{vol.secret.secretName}</Link>
    } else if (!!vol.configMap) {
      type = 'ConfigMap'
      let link = linkForResource(`ConfigMap/${this.props.pod.metadata.namespace}/${vol.configMap.name}`)
      value = <Link to={link}>{`${vol.configMap.name}${vol.configMap.optional ? ' (optional)': ''}`}</Link>
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
      <div>
        <span className="volume-name">{vol.name}</span> : <span className="volume-type">{type}</span> : <span className="volume-detail">{value}</span>
      </div>
    )
  }

  render() {
  
    let { props } = this
    let { pod } = props

    let {status, spec } = pod

    return (
      <div className="row" style={{marginLeft: 0, marginRight: 0}}> 
        <div className="col-xs-12 col-sm-12 col-md-6 col-lg-6">
          <Card style={{...styles.cards, paddingRight: 16}}>
            <CardHeader 
              style={styles.cardHeader}
              title={'pod ' + (!!status ? 'details' : 'template')}
              titleStyle={styles.cardHeaderTitle}
            />
            <CardText>
                <Table style={{
                  border: 'transparent',
                  padding: 16,
                  paddingLeft: 16,
                  tableLayout: 'inherit',
                }} selectable={false} headerStyle={{display: 'none'}}>
                <TableBody displayRowCheckbox={false}>
                  {spec.nodeName && tableRow('Node:', spec.nodeName)}

                  {spec.metadata && spec.metadata.labels && tableRow('Labels:',
                    Object.entries(spec.metadata.labels).map(entry => `${entry[0]} = ${entry[1]}`).join(', '))}
                  {spec.metadata && spec.metadata.name && tableRow('Name:',spec.metadata.name)}

                  {status && tableRow('Start Time:', status.startTime)}
                  {status && tableRow('Status:', status.phase)}
                  {status && tableRow('Pod IP:',status.podIP)}
                  {status && tableRow('Host IP:', status.hostIP)}
                  {status && tableRow('Conditions:', (status.conditions ? status.conditions.map(cond => `${cond.type}`).join(', '): ''))}
                  {status && tableRow('QoS Class:', status.qosClass)}
                  {spec.nodeSelector && tableRow('Node-Selectors:', spec.nodeSelector)}
                  {spec.volumes &&
                    <TableRow style={styles.tableRow} displayBorder={false}>
                      <TableRowColumn style={styles.tableRowKeyCol}>Volumes:</TableRowColumn>
                      <TableRowColumn style={styles.tableRowValCol}>
                        <div style={{marginLeft: -50, paddingTop: 35}}>
                          {spec.volumes.map(vol => this.renderVolume(vol))}
                        </div>
                      </TableRowColumn>
                    </TableRow>
                  }
                </TableBody>
              </Table>
            </CardText>
          </Card>
        </div>

        <div className="col-xs-12 col-sm-12 col-md-6 col-lg-6">
          <Card style={{...styles.cards}}>
            <CardHeader 
              style={styles.cardHeader}
              title={'containers'}
              titleStyle={styles.cardHeaderTitle}
            />
            <CardText>
              {pod.spec.containers.map(container => <ContainerPanel key={container.name} container={container}/>)}
            </CardText>
          </Card>
        </div>
        
        {props.children}
      </div>
    )
  }

})

function tableRow(key, val) {
  return <TableRow style={styles.tableRow} displayBorder={false}>
            <TableRowColumn style={styles.tableRowKeyCol}>{key}</TableRowColumn>
            <TableRowColumn style={styles.tableRowValCol}>{val}</TableRowColumn>
        </TableRow>
}

