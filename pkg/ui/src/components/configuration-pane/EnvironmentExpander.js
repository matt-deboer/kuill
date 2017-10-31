import React from 'react'
import { grey800 } from 'material-ui/styles/colors'
import {
  Table,
  TableBody,
  TableRow,
  TableRowColumn,
} from 'material-ui/Table'
import Checkbox from 'material-ui/Checkbox'
import { Link } from 'react-router-dom'
import { connect } from 'react-redux'
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
  checkbox: {
    width: 120,
    marginLeft: 15,
    position: 'absolute',
    right: 0,
    top: 5,
  },
  checkboxLabel: {
    marginLeft: -10,
    color: grey800,
    width: '100%',
  },
  checkboxIcon: {
    color: grey800,
    fill: grey800,
  },
}

const mapStateToProps = function(store) {
  return {
    resources: store.resources.resources,
    linkGenerator: store.session.linkGenerator,
  }
}

export default connect(mapStateToProps) (
class StringArrayExpander extends React.PureComponent {

  constructor(props) {
    super(props)
    this.state = {
      resolveRefs: true,
    }
  }

  toggleResolveRefs = () => {
    this.setState({
      resolveRefs: !this.state.resolveRefs,
    })
  }

  renderEnvValue = (env, linkGenerator, resources, resolve) => {
    let { namespace } = this.props
    if ('value' in env) {
      return <span className="quoted-string">{env.value}</span>
    } else if ('valueFrom' in env) {
      let valueFrom = env.valueFrom
      if ('secretKeyRef' in valueFrom) {
        let refKey = `Secret/${namespace}/${valueFrom.secretKeyRef.name}`
        if (resolve && !!resources[refKey]) {
          let ref = resources[refKey]
          return <span className="quoted-string">{ref.data.key}</span>
        } else {
          return (
            <div>
              <span className="env-ref-type">secretKeyRef</span>&nbsp;:&nbsp; 
              <Link to={linkGenerator.linkForResource(refKey)}>
                {valueFrom.secretKeyRef.name}
              </Link> : <span className="env-ref-key">{valueFrom.secretKeyRef.key}</span>
            </div>
          )
        }
      } else if ('configMapKeyRef' in valueFrom) {
        let refKey = `ConfigMap/${namespace}/${valueFrom.configMapKeyRef.name}`
        if (resolve && !!resources[refKey]) {
          let ref = resources[refKey]
          return <span className="quoted-string">{ref.data.key}</span>
        } else {
          return (
            <div>
              <span className="env-ref-type">configMapKeyRef</span>&nbsp;:&nbsp; 
              <Link to={linkGenerator.linkForResource(refKey)}>
                {valueFrom.configMapKeyRef.name}
              </Link> : <span className="env-ref-key">{valueFrom.configMapKeyRef.key}</span>
            </div>
          )
        }
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
    let { data, title, linkGenerator, resources } = props
    
    return (
        <GenericExpanderButton
          title={<div>
            {title}<Checkbox
              className={`resolve-env-refs-check`}
              label="resolve refs"
              checked={this.state.resolveRefs}
              onCheck={this.toggleResolveRefs}
              style={styles.checkbox}
              labelStyle={styles.checkboxLabel}
              iconStyle={styles.checkboxIcon}
            />
          </div>}
          contents={
            <div>
            <Table style={styles.table} selectable={false} headerStyle={{display: 'none'}}>
              <TableBody displayRowCheckbox={false}>
                {data.map((env) =>
                  <TableRow key={env.name} style={styles.tableRow} displayBorder={false}>
                      <TableRowColumn style={styles.tableRowKeyCol}>{env.name}</TableRowColumn>
                      <TableRowColumn style={styles.envRowVal}>
                        {this.renderEnvValue(env, linkGenerator, resources, this.state.resolveRefs)}
                      </TableRowColumn>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          }/>
      )
  }
})
