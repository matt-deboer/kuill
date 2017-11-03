import React from 'react'
import PropTypes from 'prop-types'
import {blueA400, blueA100 } from 'material-ui/styles/colors'
import ChipInput from 'material-ui-chip-input'
import { normalizeFilter } from '../utils/filter-utils'
import Chip from 'material-ui/Chip'
import './FilterBox.css'

export default class FilterBox extends React.PureComponent {

  static propTypes = {
    /**
     * The maximum number of filters to be allowed
     */
    maxFilters: PropTypes.number,
    /**
     * Whether to remove the first filter and add the new one
     * to the end of the list when the maximum filters has been
     * reached; if false, new filters will not be added on 
     * reaching max
     */
    removeFirstOnMax: PropTypes.bool,
    /**
     * The text to be displayed in the floating label
     */
    floatingLabelText: PropTypes.string,
    /**
     * The names of the filters which are the current value
     * of the set
     */
    filterNames: PropTypes.array.isRequired,
    /**
     * The list of possible filters, used for auto-complete
     */
    autocomplete: PropTypes.object,
    /**
     * function(name) called when a filter is added
     */
    addFilter: PropTypes.func,
    /**
     * function(name, index) called when a filter is removed
     */
    removeFilter: PropTypes.func,
  }

  static defaultProps = {
    maxFilters: Number.MAX_SAFE_INTEGER,
    floatingLabelText: 'select by filters...',
    addFilter: function() {},
    removeFilter: function() {},
    autocomplete: {},
    removeFirstOnMax: false,
  }

  constructor(props) {
    super(props);
    this.state = {
      filterNames: props.filterNames,
    }
  }

  componentWillReceiveProps = (nextProps) => {
    if (nextProps.filterNames.length !== this.state.filterNames.length) {
      this.setState({filterNames: nextProps.filterNames})
    }
  }

  handleAddFilter = (filter) => {

    let filterNames = this.state.filterNames.slice(0)
    while (this.props.removeFirstOnMax && filterNames.length >= this.props.maxFilters) {
      let removed = filterNames.splice(0, 1)
      this.props.removeFilter(removed, 0)
    }

    if (filterNames.length < this.props.maxFilters) {
      filterNames.push(normalizeFilter(filter))

      this.setState({
        filterNames: filterNames,
      })

      setTimeout( () => { this.props.addFilter(filter) }, 0)
    }
  }

  handleRemoveFilter = (filter, index) => {
    let filterNames = this.state.filterNames.slice(0)
    delete filterNames[index]
    this.setState({
      filterNames: filterNames
    })
    
    setTimeout( () => { this.props.removeFilter(filter, index) }, 0)
  }

  render() {

    let { props } = this

    return (<ChipInput
      value={this.state.filterNames}
      onRequestAdd={this.handleAddFilter}
      onRequestDelete={this.handleRemoveFilter}
      name={'filters'}
      dataSource={Object.keys(props.autocomplete)}
      floatingLabelText={props.floatingLabelText}
      defaultValue={['namespace:default']}
      menuProps={{
        desktop: true,
      }}
      chipRenderer={({ value, isFocused, isDisabled, handleClick, handleRequestDelete }, key) => {
        
        var labelText = value;
        var parts=value.split(":")
        if (parts.length >= 2) {
          let prefix = parts[0]
          let suffix = parts.slice(1).join(":")
          labelText=<span style={{fontWeight: 700}}><span style={{color: blueA400, paddingRight: 3}}>{prefix}:</span>{suffix}</span>
        } else if (parts.length === 1) {
          labelText=<span style={{fontWeight: 700}}><span style={{color: blueA400, paddingRight: 3}}>*:</span>{parts[0]}</span>
        } 
        return (
          <Chip
            key={key}
            style={{
              margin: '8px 8px 0 0',
              padding: 0,
              float: 'left', 
              pointerEvents: isDisabled ? 'none' : undefined 
            }}
            labelStyle={{'lineHeight': '30px'}}
            backgroundColor={isFocused ? blueA100 : null}
            onTouchTap={handleClick}
            onRequestDelete={handleRequestDelete}
            className={'filter'}
            id={`filter-${value}`}
          >
          {labelText}
          </Chip>
        )}
      }
      underlineShow={true}
      fullWidth={true}
    />)
  }
}
