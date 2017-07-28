import React from 'react'
import PropTypes from 'prop-types'
import {Table, TableBody, TableHeader, TableRow, TableRowColumn} from 'material-ui/Table'
import TableSortLabel from './TableSortLabel'
import className from 'classnames'
import './FilterTable.css'

export default class FilterTable extends React.PureComponent {
  
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
    deselectOnClickaway: PropTypes.bool,
    /**
     * Returns an object where keys are the idColumn values for the selected rows
     */
    onRowSelection: PropTypes.func,
    /**
     * An object of idColumn keys for the rows that should be selected; values are ignored
     */
    selectedIds: PropTypes.object,
    hoveredRow: PropTypes.number,
    getCellValue: PropTypes.func,
    /**
     * An optional value that can be used to control when the table should update;
     * the table will re-render whenever this value has changed.
     */
    revision: PropTypes.string,
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
    deselectOnClickaway: false,
    fixedHeader: true,
    onRenderCell: function(column, row) {return row[column]},
    getCellValue: function(column, row) {return row[column]},
    onCellClick: function(){},
    onRowSelection: function(){},
    hoveredRow: -1,
    revision: 1,
  }

  constructor(props) {
    super(props)
    this.state = this.propsToState(props)
    this.comparators = this.buildComparators(props.columns, props.idColumn, props.getCellValue)
  }

  propsToState = (props) => {
    console.time('filter-table:propsToState')
    let columnIndexbyId = {}
    for (let i=0, len=props.columns.length; i < len; ++i) {
      columnIndexbyId[props.columns[i][props.idColumn]] = i
    }
    this.columnIndexbyId = columnIndexbyId
    let orderBy = (this.state && this.state.orderBy) || props.initialOrderBy
    let order = (this.state && this.state.order) || props.initialOrder
    let data = props.data.slice(0)
    let sort = props.onRequestSort || this.defaultSort
    if (orderBy && order) {
      sort(props.columns[columnIndexbyId[orderBy]], order, data)
    }
    if (this.selection) {
      for (let selected of this.selection) {
        data[selected].__selected = true
      }
    }
    console.timeEnd('filter-table:propsToState')
    return {
      orderBy: orderBy,
      order: order,
      data: data,
      selection: this.selection || [],
    }
  }

  propsChanged = (nextProps) => {
    return nextProps.revision !== this.props.revision 
      || nextProps.width !== this.props.width
      || nextProps.height !== this.props.height
      || nextProps.idColumn !== this.props.idColumn
      || nextProps.showRowHover !== this.props.showRowHover
      || nextProps.displayRowCheckbox !== this.props.displayRowCheckbox
      || nextProps.displaySelectAll !== this.props.displaySelectAll
      || nextProps.multiSelectable !== this.props.multiSelectable
      || nextProps.adjustForCheckbox !== this.props.adjustForCheckbox
      || nextProps.initialOrder !== this.props.initialOrder
      || nextProps.initialOrderBy !== this.props.initialOrderBy
      || nextProps.fixedHeader !== this.props.fixedHeader
      || nextProps.stripedRows !== this.props.stripedRows
      || nextProps.selectedIds !== this.props.selectedIds
      || nextProps.hoveredRow !== this.props.hoveredRow
      || nextProps.data.length !== this.props.data.length
      || nextProps.deselectOnClickaway !== this.props.deselectOnClickaway
  }

  stateChanged = (nextState) => {
    return nextState.orderBy !== this.state.orderBy
      || nextState.order !== this.state.order 
      || nextState.selection.length !== this.state.selection.length
  }

  componentWillReceiveProps = (nextProps) => {

    if (this.propsChanged(nextProps)) {
      this.setState(this.propsToState(nextProps))
    }
  }

  createSortHandler = (columnId) => {
    let sort = this.props.onRequestSort || this.defaultSort.bind(this)
    return (order) => {
      console.time('filter-table:sort:setState')
      console.timeEnd('filter-table:sort:setState')
      console.time('filter-table:sort')
      sort(this.props.columns[this.columnIndexbyId[columnId]], order, this.state.data)
      this.setState({orderBy: columnId, order: order})
      console.timeEnd('filter-table:sort')
    }
  }

  shouldComponentUpdate = (nextProps, nextState) => {
    return this.propsChanged(nextProps) || this.stateChanged(nextState)
  }

  handleRowSelection = (selection) => {
    this.tableBody.setState({ selectedRows: selection })
    let dataSelection = {}
    if (selection === 'all') {
      for (let row of this.state.data) {
        let id = this.props.getCellValue(this.props.idColumn,row)
        dataSelection[id]=true
      }
    } else if (selection.constructor === Array && selection.length > 0) {
      for (let index of selection) {
        let id = this.props.getCellValue(this.props.idColumn,this.state.data[index])
        dataSelection[id]=true
      }
    }
    this.props.onRowSelection(dataSelection)
    // TODO: need to immediately select the actual row to avoid lag
  }

  handleCellClick = (row, col) => {
    if (col >= 0) {
      this.props.onCellClick(row, col, this.state.data[row], this.props.columns[col])
    }
  }

  render = () => {

    const styles = {
      cell: {
        fill: 'rgba(0,0,0,0.5)'
      }
    }

    let { props } = this;
    console.log(`(re) rendering filter-table`)

    let headerColumns = 
        props.columns.map(col => 
          <TableSortLabel
            key={col.id}
            text={col.label}
            style={{...col.style, ...col.headerStyle}}
            onRequestSort={this.createSortHandler(col.id)}
            active={this.state.orderBy === col.id}
            sortable={!!col.sortable}
            iconStyle={props.iconStyle}
            iconInactiveStyle={props.iconInactiveStyle}
        />)

    let dataRows =
        this.state.data.map((row, rowIndex) => {
          let id = props.getCellValue(props.idColumn, row)
          return (
            <TableRow key={id} 
              hovered={props.hoveredRow === rowIndex} 
              selected={id in props.selectedIds}
              className={(props.hoveredRow === rowIndex ? 'hovered' : '')}
              >
                {props.columns.map(col =>
                  <TableRowColumn key={col.id} style={{...styles.cell, ...col.style, ...col.cellStyle}} className={col.className}>
                    {props.onRenderCell(col.id,row)}
                  </TableRowColumn>
                )}
            </TableRow>
          )
        })

    return (
      <Table 
        style={{...props.style}}
        wrapperStyle={{...props.wrapperStyle}}
        headerStyle={{...props.headerStyle, width: props.width}}
        bodyStyle={{...props.bodyStyle, width: props.width}}
        className={className('filter-table', props.className)}
        fixedHeader={props.fixedHeader}
        height={props.height}
        multiSelectable={props.multiSelectable}
        onRowSelection={this.handleRowSelection.bind(this)}
        onCellClick={this.handleCellClick}
        >
        <TableHeader displaySelectAll={props.displaySelectAll && props.displayRowCheckbox} adjustForCheckbox={props.adjustForCheckbox && props.displayRowCheckbox} style={{...props.headerStyle, width: 'inherit'}}>
          <TableRow>{headerColumns}</TableRow>
        </TableHeader>
        <TableBody 
          displayRowCheckbox={props.displayRowCheckbox}
          showRowHover={props.showRowHover}
          stripedRows={!!props.stripedRows}
          ref={(tableBody) => { this.tableBody = tableBody }}
          style={{width: 'inherit'}}
          deselectOnClickaway={props.deselectOnClickaway}
          >
          {dataRows}
        </TableBody>
      </Table>
    )
  }

  /**
   * The default sorting algorithm
   * 
   * @param {*} column 
   * @param {*} order 
   * @param {*} data 
   */
  defaultSort = (column, order, data) => {
    data.sort(this.comparators[column.id][(order || 'asc')])
  }

  buildComparators = (columns, idColumn, getCellValue) => {
    let comparators = {}
    for (let column of columns) {
      let comparator = {}
      if (!column.comparator) {
        comparator['asc'] = column.isNumeric ? 
          defaultSortNumeric(column.id, 1, idColumn, getCellValue) : 
          defaultSortString(column.id, 1, idColumn, getCellValue)
        comparator['desc'] = column.isNumeric ? 
          defaultSortNumeric(column.id, -1, idColumn, getCellValue) : 
          defaultSortString(column.id, -1, idColumn, getCellValue)
      } else {
        comparator['asc'] = function(rowA, rowB) {
          return column.comparator(
            getCellValue(column.id, rowA),
            getCellValue(column.id, rowB)
          )
        }
        comparator['desc'] = reverseComparator(comparator['asc'])
      }
      comparators[column.id] = comparator
    }
    return comparators
  }

}

function defaultSortNumeric(column, direction, idColumn, getCellValue) {
  return function(a, b) {
    let aVal = getCellValue(column, a)
    let bVal = getCellValue(column, b)
    if ( aVal === bVal ) {
      return (getCellValue(idColumn, a) - getCellValue(idColumn, b))
    }
    return direction * (parseFloat(aVal) - parseFloat(bVal))
  }
}

function defaultSortString(column, direction, idColumn, getCellValue) {
  return function(a, b) {
    let aVal = getCellValue(column, a)
    let bVal = getCellValue(column, b)
    if ( aVal === bVal ) {
      return (getCellValue(idColumn, a) - getCellValue(idColumn, b))
    }
    return direction * aVal.localeCompare(bVal)
  }
}

function reverseComparator(comparator) {
  return function(a, b) {
    return -1 * comparator(a,b)
  }
}

