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
import GenericExpander from './GenericExpander'

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
  },
  tableRowVal: {
    height: rowHeight,
    padding: 10,
    wordWrap: 'break-word',
    whiteSpace: 'normal',
  },
}

export default class AnnotationsPanel extends React.Component {
  
  constructor(props) {
    super(props)
    this.state = {
      annotationsOpen: false,
      annotationText: '',
    }
  }

  handleAnnotationsTouchTap = (event) => {
    // This prevents ghost click.
    event.preventDefault();

    this.setState({
      annotationsOpen: true,
      annotationsAnchorEl: event.currentTarget,
      annotationText: event.currentTarget.dataset.text,
      annotationName: event.currentTarget.dataset.name,
    })
  }

  handleRequestCloseAnnotations = () => {
    this.setState({
      annotationsOpen: false,
      annotationText: '',
      annotationName: '',
    })
  }

  render() {
  
    let { props } = this
    let rows = []
    if (!props.annotations) {
      rows.push(
          <TableRow key={-1} style={{height: rowHeight}}>
            <TableRowColumn style={{height: rowHeight, textAlign: 'center'}}>{'< none >'}</TableRowColumn>
          </TableRow>)
    } else {
      for (let key in props.annotations) {
        let value = props.annotations[key]
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
                onTouchTap={this.handleAnnotationsTouchTap}
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
    }

    return (
      <div>
        <GenericExpander 
          open={this.state.annotationsOpen}
          anchorEl={this.state.annotationsAnchorEl}
          onRequestClose={this.handleRequestCloseAnnotations}
          title={this.state.annotationName}
          contents={<pre>{safePrettyPrint(this.state.annotationText)}</pre>}
          />
        {/* <Popover
          open={this.state.annotationsOpen}
          anchorEl={this.state.annotationsAnchorEl}
          anchorOrigin={{horizontal: 'right', vertical: 'bottom'}}
          targetOrigin={{horizontal: 'right', vertical: 'bottom'}}
          onRequestClose={this.handleRequestCloseAnnotations}
          style={styles.popover}
        >
          <Paper style={{
            background: 'transparent',
            padding: 20, 
            fontSize: 13,
            maxWidth: 'calc(100vw - 100px)',
            maxHeight: 'calc(100vh - 275px)',
            overflow: 'hidden',
            }}
            zDepth={3}>
            <Subheader style={styles.popoverTitle}>{this.state.annotationName}</Subheader>
            <div style={{
              overflow: 'auto',
              maxHeight: `${window.innerHeight - 300}px`,
            }}>
              <pre>
                {safePrettyPrint(this.state.annotationText)}
              </pre>
            </div>
          </Paper>
        </Popover> */}
        <Card style={styles.cards}>
          <CardHeader 
            style={styles.cardHeader}
            title="annotations"
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
