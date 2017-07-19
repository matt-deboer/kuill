import React from 'react'
import {Card, CardHeader, CardText} from 'material-ui/Card'
import {
  Table,
  TableBody,
  TableRow,
  TableRowColumn,
} from 'material-ui/Table'
import IconButton from 'material-ui/IconButton'
import IconMore from 'material-ui/svg-icons/navigation/more-horiz'
import Popover from 'material-ui/Popover'
import Paper from 'material-ui/Paper'
import Subheader from 'material-ui/Subheader'

const rowHeight = 28
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
  tableRowKey: {
    height: rowHeight,
    padding: 10,
    wordWrap: 'break-word',
    whiteSpace: 'normal',
    width: '40%',
    borderRight: '1px solid rgba(0,0,0,0.1)',
    // fontSize: '12px',
  },
  tableRowVal: {
    height: rowHeight,
    padding: 10,
    wordWrap: 'break-word',
    whiteSpace: 'normal',
    // fontSize: '12px',
  },
  popover: {
    border: '1px solid rgba(0,0,0,0.3)',
    backgroundColor: 'rgb(240,240,240)',
  },
  popoverTitle: {
    color: 'rgb(0,0,0)',
    fontWeight: 600,
    border: '1px solid rgba(0,0,0,0.3)',
    backgroundColor: 'rgba(30, 30, 30, 0.15)',
    fontSize: 13,
    lineHeight: '32px',
    paddingLeft: 16,
    paddingRight: 16,
    marginLeft: -22,
    marginRight: -22,
    marginTop: -22,
    marginBottom: 10,
    width: 'auto',
  }
}

export default class DataPanel extends React.Component {
  
  constructor(props) {
    super(props)
    this.state = {
      open: false,
      annotationText: '',
    }
  }

  handleTouchTap = (event) => {
    // This prevents ghost click.
    event.preventDefault();

    this.setState({
      open: true,
      anchorEl: event.currentTarget,
      text: event.currentTarget.dataset.text,
      name: event.currentTarget.dataset.name,
    })
  }

  handleRequestClose = () => {
    this.setState({
      open: false,
      annotationText: '',
      annotationName: '',
    })
  }

  render() {
    
    let { props } = this
    let { data, title } = props
    let rows = []
    for (let key in data) {
      let value = data[key]
      let display = value
      if (value.length > 50) {
        display = (
          <div style={{
            textOverflow: 'ellipsis', 
            overflow: 'hidden', 
            height: 'inherit',
            paddingRight: 50,
            position: 'relative',
          }}>
            {value}
            <IconButton 
              style={{position: 'absolute', right: 0, top: 0, padding: 0, height: 24, width: 24}} 
              onTouchTap={this.handleTouchTap}
              data-name={key}
              data-text={value}
              >
              <IconMore />
            </IconButton>
          </div>
        )
      }
      rows.push(
        <TableRow key={key} style={{height: rowHeight}}>
          <TableRowColumn style={styles.tableRowKey}>{key}</TableRowColumn>
          <TableRowColumn style={styles.tableRowVal}>{display}</TableRowColumn>
        </TableRow>)
    }

    return (
      <div>
        <Popover
          open={this.state.open}
          anchorEl={this.state.anchorEl}
          anchorOrigin={{horizontal: 'right', vertical: 'bottom'}}
          targetOrigin={{horizontal: 'right', vertical: 'bottom'}}
          onRequestClose={this.handleRequestClose}
          style={styles.popover}
        >
          <Paper style={{
            background: 'transparent',
            padding: 20, 
            fontSize: 13,
            maxWidth: `${window.innerWidth - 200}px`,
            maxHeight: `${window.innerHeight - 260}px`,
            overflow: 'hidden',
            }}
            zDepth={3}>
            <Subheader style={styles.popoverTitle}>{this.state.name}</Subheader>
            <div style={{
              overflow: 'auto',
              maxHeight: `${window.innerHeight - 300}px`,
            }}>
              <pre>
                {safePrettyPrint(this.state.text)}
              </pre>
            </div>
          </Paper>
        </Popover>
        <Card style={styles.cards}>
          <CardHeader 
            style={styles.cardHeader}
            title={title}
            titleStyle={styles.cardHeaderTitle}
          />
          <CardText>
            <Table style={{
              border: '1px solid rgba(0,0,0,0.1)',
              paddingTop: 0,
              background: 'rgba(0, 0, 0, 0.05)',
            }} selectable={false} headerStyle={{display: 'none'}}>
              <TableBody displayRowCheckbox={false}>
                {rows}
              </TableBody>
            </Table>
          </CardText>
        </Card>
      </div>
    )
  }
}

function safePrettyPrint(value) {
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch (e) {
    return value
  }
}
