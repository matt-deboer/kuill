import React from 'react'
import {white, grey800} from 'material-ui/styles/colors'
import {
  Table,
  TableBody,
  TableRow,
  TableRowColumn,
} from 'material-ui/Table'
import Subheader from 'material-ui/Subheader'
import { Link } from 'react-router-dom'
import { linkForResource } from '../../routes'
import Popover from 'material-ui/Popover'
import Paper from 'material-ui/Paper'
import IconButton from 'material-ui/IconButton'
import IconMore from 'material-ui/svg-icons/navigation/more-horiz'
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
  bracket: {
    height: rowHeight,
    fontWeight: 600,
    paddingLeft: 0,
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
  tableRowVal: {
    // width: '99%',
    whiteSpace: 'normal',
    padding: 2,
    height: rowHeight,
    overflow: 'visible',
  },
  envRowVal: {
    whiteSpace: 'normal',
    padding: 2,
    height: rowHeight,
    overflow: 'visible',
  },
  expander: {
    padding: 0,
    height: 24,
    width: 24,
  },
  popoverTitle: {
    color: 'rgb(0,0,0)',
    fontWeight: 600,
    borderBottom: '1px solid rgba(0,0,0,0.2)',
    backgroundColor: 'rgba(30, 30, 30, 0.15)',
    fontSize: 13,
    lineHeight: '32px',
    paddingLeft: 16,
    paddingRight: 16,
    marginLeft: -20,
    marginRight: -20,
    marginTop: -20,
    marginBottom: 10,
    width: 'auto',
  }
}

export default class StringArrayExpander extends React.PureComponent {

  constructor(props) {
    super(props)
    this.state = {
      open: false,
    }
  }

  handleTouchTap = (event) => {
    // This prevents ghost click.
    event.preventDefault();

    this.setState({
      open: true,
      anchorEl: event.currentTarget,
    })
  }

  handleRequestClose = () => {
    this.setState({
      open: false,
    })
  }

  renderEnvValue = (env) => {
    let { namespace } = this.props
    if ('value' in env) {
      return <span className="quoted-string">{env.value}</span>
    } else if ('valueFrom' in env) {
      let valueFrom = env.valueFrom
      if ('secretKeyRef' in valueFrom) {
        return (
        <div>
          <span className="env-ref-type">secretKeyRef</span>&nbsp;:&nbsp; 
          <Link to={linkForResource(`Secret/${namespace}/${valueFrom.secretKeyRef.name}`)}>
            {valueFrom.secretKeyRef.name}
          </Link> : <span className="env-ref-key">{valueFrom.secretKeyRef.key}</span>
        </div>
        )
      } else if ('configMapKeyRef' in valueFrom) {
        return (
        <div>
          <span className="env-ref-type">configMapKeyRef</span>&nbsp;:&nbsp; 
          <Link to={linkForResource(`ConfigMap/${namespace}/${valueFrom.configMapKeyRef.name}`)}>
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
    let { data, title } = props
    
    return (
        <div>
          <IconButton style={styles.expander} onTouchTap={this.handleTouchTap}>
            <IconMore />
          </IconButton>

          <Popover
            open={this.state.open}
            anchorEl={this.state.anchorEl}
            anchorOrigin={{horizontal: 'left', vertical: 'top'}}
            targetOrigin={{horizontal: 'left', vertical: 'bottom'}}
            onRequestClose={this.handleRequestClose}
            style={{backgroundColor: 'rgb(240,240,240)'}}
          >
            <Paper style={{
              background: 'transparent',
              padding: 20, 
              fontSize: 13,
              maxWidth: `${window.innerWidth - 200}px`,
              maxHeight: `${window.innerHeight - 300}px`,
              overflow: 'auto',
              }}
              zDepth={2}>
              <Subheader style={styles.popoverTitle}>{title}</Subheader>
              <Table style={styles.table} selectable={false} headerStyle={{display: 'none'}}>
                <TableBody displayRowCheckbox={false}>
                  {data.map((env) =>
                    <TableRow key={env.name} style={styles.tableRow} displayBorder={false}>
                        <TableRowColumn style={styles.tableRowKeyCol}>{env.name}</TableRowColumn>
                        <TableRowColumn style={styles.envRowVal}>{this.renderEnvValue(env)}</TableRowColumn>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Popover>
      </div>
      )
  }
}
