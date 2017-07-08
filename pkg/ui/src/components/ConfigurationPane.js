import React from 'react'
import {Card, CardHeader, CardText} from 'material-ui/Card'
import {blueA100, blueA400, grey600, grey800} from 'material-ui/styles/colors'
import {
  Table,
  TableBody,
  TableRow,
  TableRowColumn,
} from 'material-ui/Table'
import KubeKinds from '../kube-kinds'
import sizeMe from 'react-sizeme'
import IconButton from 'material-ui/IconButton'
import IconMore from 'material-ui/svg-icons/navigation/more-horiz'
import Popover from 'material-ui/Popover'
import Paper from 'material-ui/Paper'

const styles = {
  tabs: {
    backgroundColor: grey600,
  },
  tabsInkBar: {
    backgroundColor: blueA400,
    height: 3,
    marginTop: -4,
    borderTop: `1px ${blueA100} solid`,
  },
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

const annotationsTable = {
  template: 'annotationsTable',
  columnStyles: [{padding: 10, wordWrap: 'break-word', whiteSpace: 'normal', width: '40%'},
    {padding: 10, wordWrap: 'break-word', whiteSpace: 'normal'},],
  props: {
    style: {
      border: '1px solid rgba(0,0,0,0.1)',
      paddingTop: 0,
      background: 'rgba(0, 0, 0, 0.05)',
    },
  },
}

const default2ColumnTable = {
  template: 'default2ColumnTable',
  columnStyles: [{
      padding: '2px 10px 2px', 
      color: grey800,
      fontWeight: 600,
      whiteSpace: 'nowrap',
    },{
      width: '99%',
      padding: 2,
    }],
  rowHeight: 22,
  props: {
    style: {
      border: 'transparent',
      padding: 16,
      tableLayout: 'inherit',
    },
  },
  rowProps: {
    displayBorder: false,
  }
}

const containersTable = {
  template: 'containersTable',
  columnStyles: [{
      padding: '2px 10px 2px',
      color: grey800,
      fontWeight: 600,
      whiteSpace: 'nowrap',
      paddingRight: 10,
    },{
      padding: 2,
      width: '99%',
    }],
  rowHeight: 22,
  props: {
    style: {
      border: '1px solid rgba(0,0,0,0.1)',
      padding: '0 16px 0 16px',
      tableLayout: 'inherit',
    },
  },
  rowProps: {
    displayBorder: false,
  }
}

// use functional component style for representational components
export default sizeMe({ monitorHeight: true, monitorWidth: true }) (
class ConfigurationPane extends React.Component {
  
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
    let { resource } = props
    let kind = KubeKinds[props.resourceGroup][resource.kind]
    let { getData } = kind
    let data = (typeof getData === 'function' && getData(resource)) || []
    let cols = []
    
    for (let table of data) {
      cols.push(
        <div key={table.name} className="col-xs-12 col-sm-12 col-md-6 col-lg-6">
          <Card style={{...styles.cards, padding: '0 16px'}}>
            {!!table.name && <CardHeader 
              style={styles.cardHeader}
              title={table.name}
              titleStyle={styles.cardHeaderTitle}
            />}
            <CardText>
              { renderData(table) }
            </CardText>
          </Card>
        </div>
      )
    }
    if (!!resource.metadata.annotations) {
      cols.push(this.renderAnnotations(resource.metadata.annotations))
    }

    return (
      <div className="row" style={{marginLeft: 0, marginRight: 0}}> 
        {cols}
      </div>
    )
  }

  renderAnnotations = (annotations) => {
    if (!!annotations) {
      let entries = []
      for (let key in annotations) {
        let value = annotations[key]
        if (value.length <= 50) {
          entries.push([key, value])
        } else {
          entries.push([key,
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
          ])
        }
      }
      return (
        <div key={'annotations'} className="col-xs-12 col-sm-12 col-md-12 col-lg-12">
          <Popover
            open={this.state.annotationsOpen}
            anchorEl={this.state.annotationsAnchorEl}
            anchorOrigin={{horizontal: 'right', vertical: 'bottom'}}
            targetOrigin={{horizontal: 'right', vertical: 'bottom'}}
            onRequestClose={this.handleRequestCloseAnnotations}
          >
            <Paper style={{
              padding: 20, fontSize: 13,
              maxWidth: `${window.innerWidth - 200}px`,
              maxHeight: `${window.innerHeight - 300}px`,
              overflow: 'scroll',
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
              { renderTable({...annotationsTable, data: entries}) }
            </CardText>
          </Card>
        </div>
      )
    }
  }
})

function safePrettyPrint(value) {
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch (e) {
    return value
  }
}

function renderData(table, depth=0) {
  
  if (!table || (table.constructor !== Array && !table.data)) {
    return table
  } else {
    if (table.constructor === Array) {
      table = {data: table}
    }
    if (table.data.length > 0) {
      if (depth === 1) {
        table = {...containersTable, ...table}
      } else {
        table = {...default2ColumnTable, ...table}
      }
      return renderTable(table, depth)
    } else {
      console.error(`renderData: received table with empty rows: ${JSON.stringify(table)}`)
      return null
    }
  }
}

function renderTable(table, depth=0) {

  if (!table.data) {
    console.error(`received missing data: ${JSON.stringify(table)}`)
    return null
  } else if (table.data.constructor !== Array) {
    console.error(`received non-arrray data: ${JSON.stringify(table)}`)
    return null
  } else if (table.data.length === 0) {
    console.error(`received empty data: ${JSON.stringify(table)}`)
    return null
  }

  let rowHeight = 'rowHeight' in table ? table.rowHeight : 28
  let tableProps = table.props || {}
  tableProps.style = {...tableProps.style, height: rowHeight}
  let tableBodyProps = table.bodyProps || {}
  tableBodyProps.style = {...tableBodyProps.style, height: rowHeight}
  let tableRowProps = table.rowProps || {}
  tableRowProps.style = {...tableRowProps.style, height: rowHeight}
  let tableRowColumnProps = {...(table.rowColumnProps || {}), height: rowHeight}
  tableRowColumnProps.style = {...tableRowColumnProps.style, height: rowHeight}

  return (
    <Table {...tableProps} selectable={false} headerStyle={{display: 'none'}} className={`${table.name || table.template}:depth:${depth}:rows:${table.data.length}`}>
      <TableBody displayRowCheckbox={false} {...tableBodyProps}>
        {table.data.map((row, rowIndex) =>
          <TableRow key={rowIndex} {...tableRowProps}>
            {row.map((cell, cellIndex) => {
                let colStyle = {}
                if (table.columnStyles && table.columnStyles.constructor === Array) {
                  colStyle = cellIndex < table.columnStyles.length ? table.columnStyles[cellIndex] : table.columnStyles[table.columnStyles.length-1]
                } 
                !cell && console.log(`found empty cell:: row: ${JSON.stringify(row)}, idx: ${cellIndex}`)
                return <TableRowColumn key={cellIndex} {...tableRowColumnProps} style={{...tableRowColumnProps.style, ...colStyle}}>
                  <span style={{display: 'none'}} className={`${table.name || table.template}::depth:${depth}::row:${rowIndex}::cell:${cellIndex}`}></span>
                  {renderData(cell, depth+1)}
                  </TableRowColumn>
              }  
            )}
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
