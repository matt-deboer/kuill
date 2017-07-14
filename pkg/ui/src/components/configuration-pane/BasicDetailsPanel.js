import React from 'react'
import {grey800} from 'material-ui/styles/colors'
import {
  Table,
  TableBody,
  TableRow,
  TableRowColumn,
} from 'material-ui/Table'

export default class BasicDetailsPanel extends React.Component {

  render() {
  
    let { props } = this
    let { data } = props
    let rowHeight = 22

    return (
      <Table style={{
          border: 'transparent',
          padding: 16,
          paddingLeft: 16,
          tableLayout: 'inherit',
        }} selectable={false} headerStyle={{display: 'none'}}>
        <TableBody displayRowCheckbox={false}>
          {data.map((row, rowIndex) =>
            <TableRow key={rowIndex} style={{height: rowHeight}} displayBorder={false}>
              <TableRowColumn style={{
                padding: '2px 10px 2px 0',
                color: grey800,
                fontWeight: 600,
                whiteSpace: 'normal',
                verticalAlign: 'top',
                paddingRight: 10,
                height: rowHeight,
                maxWidth: '100px',
              }}>
                {row[0]}
              </TableRowColumn>
              <TableRowColumn style={{
                width: '99%',
                padding: 2,
                height: rowHeight,
                overflow: 'visible',
                whiteSpace: 'normal',
              }}>
                {row[1]}
              </TableRowColumn>
            </TableRow>
          )}
        </TableBody>
      </Table>
    )
  }
}
