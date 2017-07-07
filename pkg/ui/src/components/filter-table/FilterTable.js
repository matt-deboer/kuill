import React from 'react'
import PropTypes from 'prop-types'
import {Table, TableBody, TableHeader, TableRow, TableRowColumn} from 'material-ui/Table'
import TableSortLabel from './TableSortLabel'
import className from 'classnames'
import './FilterTable.css'

export default class FilterTable extends TableHeader {
  
  static propTypes = {
    width: PropTypes.string,
    height: PropTypes.string,
    columns: PropTypes.array.isRequired,
    data: PropTypes.array.isRequired,
    idColumn: PropTypes.string,
    showRowHover: PropTypes.bool,
    displayRowCheckbox: PropTypes.bool,
    displaySelectAll: PropTypes.bool,
    multiSelectable: PropTypes.bool,
    adjustForCheckbox: PropTypes.bool,
    initialOrder: PropTypes.oneOf(['asc','desc']),
    initialOrderBy: PropTypes.string,
    onRequestSort: PropTypes.func,
    fixedHeader: PropTypes.bool,
    onRenderCell: PropTypes.func,
    onCellClick: PropTypes.func,
    stripedRows: PropTypes.bool,
    /**
     * Returns an object where keys are the idColumn values for the selected rows
     */
    onRowSelection: PropTypes.func,
    /**
     * An object of idColumn keys for the rows that should be selected; values are ignored
     */
    selectedIds: PropTypes.object,
    hoveredRow: PropTypes.number,
  }

  static defaultProps = {
    width: '100%',
    height: 'auto',
    idColumn: 'id',
    selectedIds: [],
    showRowHover: true,
    displayRowCheckbox: true,
    displaySelectAll: true,
    adjustForCheckbox: false,
    onRequestSort: defaultSort,
    fixedHeader: true,
    onRenderCell: function(column, row) {return row[column.id]},
    onCellClick: function(){},
    onRowSelection: function(){},
    hoveredRow: -1,
  }

  constructor(props) {
    super(props)
    this.state = this.propsToState(props)
  }

  propsToState = (props) => {
    let columnIndexbyId = {}
    for (let i=0, len=props.columns.length; i < len; ++i) {
      columnIndexbyId[props.columns[i][props.idColumn]] = i
    }
    this.columnIndexbyId = columnIndexbyId
    let orderBy = (this.state && this.state.orderBy) || props.initialOrderBy
    let order = (this.state && this.state.order) || props.initialOrder
    let data = props.data.slice(0)
    if (orderBy && order) {
      props.onRequestSort(props.columns[columnIndexbyId[orderBy]], order, data)
    }
    if (this.selection) {
      for (let selected of this.selection) {
        data[selected].__selected = true
      }
    }
    
    return {
      orderBy: orderBy,
      order: order,
      data: data,
      selection: this.selection || [],
    }
  }

  componentWillReceiveProps = (props) => {
    this.setState(this.propsToState(props))
  }

  createSortHandler = (columnId) => (order) => {
    this.setState({orderBy: columnId, order: order})
    this.props.onRequestSort(this.props.columns[this.columnIndexbyId[columnId]], order, this.state.data)
  }

  handleRowSelection = (selection) => {
    this.tableBody.setState({ selectedRows: selection })
    let dataSelection = {}
    if (selection.length > 0) {
      for (let index of selection) {
        let id = this.state.data[index][this.props.idColumn]
        dataSelection[id]=true
      }
    }
    this.props.onRowSelection(dataSelection)
    // TODO: need to immediately select the actual row to avoid lag
  }

  render = () => {

    const styles = {
      cell: {
        fill: 'rgba(0,0,0,0.5)'
      }
    }

    let { props } = this;

    return (
      <Table 
        className={className('filter-table', props.className)}
        fixedHeader={props.fixedHeader}
        height={props.height}
        multiSelectable={props.multiSelectable}
        onRowSelection={this.handleRowSelection.bind(this)}
        onCellClick={(row, col) => {
          if (col >= 0) {
            props.onCellClick(row, col, this.state.data[row], this.props.columns[col])
          }
        }}
        >
        <TableHeader displaySelectAll={props.displaySelectAll} adjustForCheckbox={props.adjustForCheckbox}>
          <TableRow>{
            props.columns.map(col => 
              <TableSortLabel
                key={col.id}
                text={col.label}
                style={{...col.style, ...col.headerStyle}}
                onRequestSort={this.createSortHandler(col.id)}
                active={this.state.orderBy === col.id}
                sortable={!!col.sortable}
                />
            )
          }</TableRow>
        </TableHeader>
        <TableBody 
          displayRowCheckbox={props.displayRowCheckbox}
          showRowHover={props.showRowHover}
          stripedRows={!!props.stripedRows}
          ref={(tableBody) => { this.tableBody = tableBody }}
          >
          {
            this.state.data.map((row, rowIndex) => 
              <TableRow key={row[props.idColumn]} hovered={props.hoveredRow === rowIndex} selected={row[props.idColumn] in props.selectedIds}>
                {props.columns.map(col =>
                  <TableRowColumn key={col.id} style={{...styles.cell, ...col.style, ...col.cellStyle}} className={col.className}>
                    {props.onRenderCell(col,row)}
                  </TableRowColumn>
                )}
              </TableRow>
            )
          }
        </TableBody>
      </Table>
    )
  }
} 

function defaultSortNumeric(column, direction) {
  return function(a, b) {
    if (a[column] === b[column]) {
      return (a._pos - b._pos)
    }
    return direction * (parseFloat(a[column]) - parseFloat(b[column]))
  }
}

function defaultSortString(column, direction) {
  return function(a, b) {
    if (a[column] === b[column]) {
      return (a._pos - b._pos)
    }
    return direction * ((a[column] > b[column]) - (a[column] < b[column]))
  }
}

function defaultSort(column, order, data) {
  let direction = ( order === 'desc' ? -1 : 1 )
  let comparator = column.isNumeric ? 
    defaultSortNumeric(column.id, direction) : 
    defaultSortString(column.id, direction)
  // record _pos for stable sort
  let pos = 0
  for (let row of data) {
    row._pos = ++pos
  }
  data.sort(comparator)
}
