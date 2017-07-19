import React from 'react'
import { grey800 } from 'material-ui/styles/colors'
import { Card, CardText } from 'material-ui/Card'
import {
  Table,
  TableBody,
  TableRow,
  TableRowColumn,
} from 'material-ui/Table'
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
    fontSize: '18px',
  },
  tableRowKey: {
    padding: '2px 10px 2px 0',
    color: grey800,
    fontWeight: 600,
    whiteSpace: 'normal',
    verticalAlign: 'top',
    paddingRight: 10,
    height: rowHeight,
    minWidth: '120px',
  },
  tableRowCol: {
    width: '99%',
    padding: 2,
    height: rowHeight,
    wordWrap: 'break-word',
    textOverflow: 'inherit',
    overflow: 'visible',
    whiteSpace: 'normal',
  }
}

export default class BasicDetailsPanel extends React.Component {

  renderValue = (value) => {
    let rendered = value
    if (!value.props && typeof value === 'object') {
      rendered = 
        <pre style={{margin: 0, fontSize: 13, fontFamily: 'Roboto, sans-serif'}}>{yaml.safeDump(value)}</pre>
    }
    // return <pre style={{margin: 0, fontSize: 13}}>{rendered}</pre>
    return rendered
  }

  render() {
  
    let { props } = this
    let { data } = props

    let dataGroups = []
    if (data.length > 6) {
      let half = Math.ceil(data.length / 2)
      dataGroups.push(data.slice(0,half))
      dataGroups.push(data.slice(half+1))
    } else {
      dataGroups.push(data)
    }

    let rows = []
    let index = 0
    for (let d of dataGroups) {
      rows.push(
        <div key={index++} className="col-xs-12 col-sm-6 col-md-6 col-lg-6">
          <Table style={{
              border: 'transparent',
              padding: 16,
              paddingLeft: 0,
              tableLayout: 'inherit',
            }} selectable={false} headerStyle={{display: 'none'}}>
            <TableBody displayRowCheckbox={false}>
              {d.map((row, rowIndex) =>
                <TableRow key={rowIndex} style={{height: rowHeight}} displayBorder={false}>
                  <TableRowColumn style={styles.tableRowKey}>
                    {row[0]}
                  </TableRowColumn>
                  <TableRowColumn style={styles.tableRowCol}>
                    {this.renderValue(row[1])}
                  </TableRowColumn>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )
    }

    return (
      <Card style={{...styles.cards, paddingRight: 16, paddingLeft: 0}}>
        <CardText style={{paddingLeft: 0}}>
          <div className="row" style={{marginLeft: 0, marginRight: 0}}>
            {rows}
          </div>
        </CardText>
      </Card>
    )
  }
}
