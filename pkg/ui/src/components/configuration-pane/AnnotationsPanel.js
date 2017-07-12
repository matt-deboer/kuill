import React from 'react'
import {Card, CardHeader, CardText} from 'material-ui/Card'
import {blueA100, blueA400, grey600, grey800} from 'material-ui/styles/colors'
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
  }
}

export default class AnnotationsPanel extends React.Component {
  
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

  render() {
  
    let { props } = this
    let rowHeight = 28

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
                data-text={value}
                >
                <IconMore />
              </IconButton>
            </div>
          )
        }
        rows.push(
          <TableRow key={key} style={{height: rowHeight}}>
            <TableRowColumn style={{
              height: rowHeight,
              padding: 10,
              wordWrap: 'break-word',
              whiteSpace: 'normal',
              width: '40%',
              borderRight: '1px solid rgba(0,0,0,0.1)'
            }}>{key}</TableRowColumn>
            <TableRowColumn style={{height: rowHeight, padding: 10, wordWrap: 'break-word', whiteSpace: 'normal'}}>{display}</TableRowColumn>
          </TableRow>)
      }
    }
    // annotations.sort((a,b) => a[0].localeCompare(b[0]))

    return (
      <div>
        <Popover
          open={this.state.annotationsOpen}
          anchorEl={this.state.annotationsAnchorEl}
          anchorOrigin={{horizontal: 'right', vertical: 'bottom'}}
          targetOrigin={{horizontal: 'right', vertical: 'bottom'}}
          onRequestClose={this.handleRequestCloseAnnotations}
          style={{backgroundColor: 'rgb(240,240,240)'}}
        >
          <Paper style={{
            background: 'transparent',
            padding: 20, 
            fontSize: 13,
            maxWidth: `${window.innerWidth - 200}px`,
            maxHeight: `${window.innerHeight - 300}px`,
            overflow: 'auto',
            }}>
            <pre>
              {safePrettyPrint(this.state.annotationsText)}
            </pre>
          </Paper>
        </Popover>
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
