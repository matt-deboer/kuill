import React from 'react'
import { grey800 } from 'material-ui/styles/colors'
import {
  Table,
  TableBody,
  TableRow,
  TableRowColumn,
} from 'material-ui/Table'
import { Link } from 'react-router-dom'
import GenericExpanderButton from './GenericExpanderButton'
import './ContainerPanel.css'

const rowHeight = 22
const styles = {
  table: {
    backgroundColor: 'transparent',
    // border: '1px solid rgba(0,0,0,0.05)',
    padding: 10,
    paddingLeft: 16,
    tableLayout: 'inherit',
  },
  tableRow: {
    height: rowHeight,
  },
  tableRowKeyCol: {
    padding: 5,
    paddingRight: 10,
    color: grey800,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    height: rowHeight,
    verticalAlign: 'top',
  },
  envRowVal: {
    whiteSpace: 'normal',
    padding: 5,
    paddingLeft: 10,
    height: rowHeight,
    overflow: 'visible',
    // borderLeft: '1px solid rgba(0,0,0,0.05)',
  },
  expander: {
    padding: 0,
    height: 24,
    width: 24,
  },
}

export default class StringArrayExpander extends React.PureComponent {

  renderEnvValue = (env, linkGenerator) => {
    let { namespace } = this.props
    if ('value' in env) {
      return <span className="quoted-string">{env.value}</span>
    } else if ('valueFrom' in env) {
      let valueFrom = env.valueFrom
      if ('secretKeyRef' in valueFrom) {
        return (
        <div>
          <span className="env-ref-type">secretKeyRef</span>&nbsp;:&nbsp; 
          <Link to={linkGenerator.linkForResource(`Secret/${namespace}/${valueFrom.secretKeyRef.name}`)}>
            {valueFrom.secretKeyRef.name}
          </Link> : <span className="env-ref-key">{valueFrom.secretKeyRef.key}</span>
        </div>
        )
      } else if ('configMapKeyRef' in valueFrom) {
        return (
        <div>
          <span className="env-ref-type">configMapKeyRef</span>&nbsp;:&nbsp; 
          <Link to={linkGenerator.linkForResource(`ConfigMap/${namespace}/${valueFrom.configMapKeyRef.name}`)}>
            {valueFrom.configMapKeyRef.name}
          </Link> : <span className="env-ref-key">{valueFrom.configMapKeyRef.key}</span>
        </div>
        )
      } else if ('fieldRef' in valueFrom) {
        return (
        <div>
          <span className="env-ref-type">fieldRef</span>:
          <span className="env-ref-key">{valueFrom.fieldRef.fieldPath}</span>
        </div>
        )
      }
    }
  }

  render() {
  
    let { props } = this
    let { data, title, linkGenerator } = props
    
    return (
        <GenericExpanderButton
          title={title}
          contents={
            <div>
            <Table style={styles.table} selectable={false} headerStyle={{display: 'none'}}>
              <TableBody displayRowCheckbox={false}>
                {data.map((env) =>
                  <TableRow key={env.name} style={styles.tableRow} displayBorder={false}>
                      <TableRowColumn style={styles.tableRowKeyCol}>{env.name}</TableRowColumn>
                      <TableRowColumn style={styles.envRowVal}>{this.renderEnvValue(env, linkGenerator)}</TableRowColumn>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          }/>
      )
  }
}
