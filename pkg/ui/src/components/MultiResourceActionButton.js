
import React from 'react'
import FloatingActionButton from 'material-ui/FloatingActionButton'

export default class MultiResourceActionButton extends React.Component {
  
  constructor(props) {
    super(props);
    this.state = {
      disabled: props.disabled,
    }
  }

  setDisabled = (disabled) => {
    this.setState({disabled: disabled})
  }

  render() {
    let { props } = this
    return <FloatingActionButton {...props} disabled={this.state.disabled}>
       {props.children}
      </FloatingActionButton>
  }

}