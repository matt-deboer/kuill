import React from 'react'
import PropTypes from 'prop-types'
import { TableHeaderColumn } from 'material-ui/Table'
import SortDesc from 'material-ui/svg-icons/navigation/arrow-drop-up'
import SortAsc from 'material-ui/svg-icons/navigation/arrow-drop-down'
import Sortable from 'material-ui/svg-icons/action/swap-vert'
import Unsortable from 'material-ui/svg-icons/image/lens'
import FlatButton from 'material-ui/FlatButton'

const orderIcons = {
  '': <Sortable style={{fill: 'inherit', height: '20px', width: '20px'}}/>,
  'asc': <SortAsc style={{fill: 'inherit', height: '20px', width: '20px'}}/>,
  'desc': <SortDesc style={{fill: 'inherit', height: '20px', width: '20px'}}/>,
  'unsortable': <Unsortable style={{fill: 'transparent', color: 'transparent', height: '20px', width: '20px'}}/>,
}

export default class TableSortLabel extends React.Component {
  
  static propTypes = {
    text: PropTypes.string.isRequired,
    active: PropTypes.bool,
    order: PropTypes.oneOf(['asc','desc']),
    onRequestSort: PropTypes.func,
    style: PropTypes.object,
    sortable: PropTypes.bool,
  }

  static defaultProps = {
    active: false,
    order: 'asc',
    onRequestSort: function(){},
    style: {},
    sortable: true,
  }

  constructor(props) {
    super(props);
    this.state = {
      active: props.active,
      order: props.active ? props.order : '',
    }
    this.onRequestSort = this.onRequestSort.bind(this)
  }

  componentWillReceiveProps = (nextProps) => {
    if (nextProps.order !== this.props.order
      || nextProps.active !== this.props.active) {
      this.setState({
        active: nextProps.active,
        order: nextProps.active ? nextProps.order : '',
      })
    }
  }

  shouldComponentUpdate = (nextProps, nextState) => {
    let shouldUpdate = (
      this.state.active !== nextState.active
      || this.state.order !== nextState.order
      || this.props.order !== nextProps.order
      || this.props.active !== nextProps.active
    )
    return shouldUpdate
  }

  onRequestSort = () => {
    if (this.props.sortable) {
      let order = this.props.order 
      if (this.state.active || order === '') {
        order = (this.state.order === 'asc' ? 'desc' : 'asc')
      }
      this.props.onRequestSort(order)
      this.setState({active: true, order: order})
    }
  }

  render() {

    const styles = {
      label: {
        fill: 'inherit',
        color: 'inherit',
        textTransform: 'inherit',
        fontSize: 'inherit',
        paddingLeft: 0,
        paddingRight: 0,
        wordWrap: 'break-word',
        whiteSpace: 'normal',
        // display: 'block',
      },
      button: {
        padding: 0,
        margin: 0,
        width: '20px',
        height: '20px',
      },
      icon: {
        height: '20px',
        width: '20px',
        // paddingLeft: 5,
        marginBottom: -5,
      },
      inactiveIcon: {
        fill: 'rgba(0,0,0,0.25)'
      },
      unsortableIcon: {
        fill: 'rgba(0,0,0,0)'
      }
    }

    let { props } = this;
    
    return (
      <TableHeaderColumn style={props.style} key={props.key}>
        <FlatButton
          label={props.text || "&nbsp;"}
          labelPosition={'before'}
          labelStyle={styles.label}
          onTouchTap={this.onRequestSort}
          icon={orderIcons[props.sortable ? this.state.order : 'unsortable']}
          />
      </TableHeaderColumn> 
    )
  }
}
