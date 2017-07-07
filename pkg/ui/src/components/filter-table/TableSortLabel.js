import React from 'react';
import PropTypes from 'prop-types';
import { TableHeaderColumn } from 'material-ui/Table';
import SortDesc from 'material-ui/svg-icons/navigation/arrow-drop-up';
import SortAsc from 'material-ui/svg-icons/navigation/arrow-drop-down';
import Sortable from 'material-ui/svg-icons/action/swap-vert';
import IconButton from 'material-ui/IconButton';

const orderIcons = {
  '': <Sortable style={{fill: 'rgba(0,0,0,0.25)', height: '20px'}}/>,
  'asc': <SortAsc style={{height: '20px'}}/>,
  'desc': <SortDesc style={{height: '20px'}}/>,
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
    };
  }

  componentWillReceiveProps = (nextProps) => {
    if (nextProps.active !== this.props.active 
    || nextProps.order !== this.props.order
    || nextProps.sortable !== this.sortable) {
      this.state = {
        active: nextProps.active,
        order: nextProps.active ? nextProps.order : '',
      }
    }
  }

  onRequestSort = () => {
    let order = this.props.order 
    if (this.state.active || order === '') {
      order = (this.state.order === 'asc' ? 'desc' : 'asc')
    }
    this.setState({active: true, order: order})
    this.props.onRequestSort(order)
  }

  render() {

    const styles = {
      label: {
        fill: 'inherit',
        color: 'inherit',
        textTransform: 'inherit',
        fontSize: 'inherit'
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
    
    let iconStyle = styles.icon
    if (props.sortable) {
      if (!props.active) {
        iconStyle = {...iconStyle, ...styles.inactiveIcon}
      }
    } else {
      iconStyle = {...styles.icon, ...styles.unsortableIcon}
    }

    return (
      <TableHeaderColumn style={props.style} key={props.key}>
        {props.text}
        <IconButton
          style={styles.button}
          onTouchTap={props.sortable ? this.onRequestSort: function(){}}
          iconStyle={iconStyle}
          >
          {orderIcons[this.state.order]}
        </IconButton>
      </TableHeaderColumn> 
    )
  }
}
