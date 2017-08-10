import React from 'react'
import {blueA400, blueA100 } from 'material-ui/styles/colors'
import ChipInput from 'material-ui-chip-input'
import Chip from 'material-ui/Chip'


export default class FilterBox extends React.PureComponent {

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
    filterNames.push(filter)

    this.setState({
      filterNames: filterNames
    })

    setTimeout( () => { this.props.addFilter(filter) }, 0)
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
      dataSource={props.possibleFilters}
      floatingLabelText={'select by filters...'}
      defaultValue={['namespace:default']}
      menuProps={{
        desktop: true,
      }}
      chipRenderer={({ value, isFocused, isDisabled, handleClick, handleRequestDelete }, key) => {
        
        var labelText = value;
        var parts=value.split(":")
        if (parts.length === 2) {
          labelText=<span style={{fontWeight: 700}}><span style={{color: blueA400, paddingRight: 3}}>{parts[0]}:</span>{parts[1]}</span>
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
