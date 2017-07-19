import React from 'react'
import IconButton from 'material-ui/IconButton'
import IconMore from 'material-ui/svg-icons/navigation/more-horiz'
import GenericExpander from './GenericExpander'

const styles = {
  button: {
    // position: 'absolute',
    // right: 0,
    // top: 0,
    padding: 0,
    height: 24,
    width: 24
  }
}

export default class AnnotationsPanel extends React.Component {
  
  constructor(props) {
    super(props)
    this.state = {
      open: false,
    }
  }

  handleTouchTap = (event) => {
    // This prevents ghost click.
    event.preventDefault();

    this.setState({
      open: true,
      anchorEl: event.currentTarget,
    })
  }

  handleRequestClose = () => {
    this.setState({
      open: false,
    })
  }

  render() {
  
    let { title, contents, anchorOrigin, targetOrigin } = this.props

    return (
      <div>
        <GenericExpander 
          open={this.state.open} anchorEl={this.state.anchorEl} onRequestClose={this.handleRequestClose} title={title} contents={contents} 
          anchorOrigin={anchorOrigin} targetOrigin={targetOrigin}
          />
        <IconButton onTouchTap={this.handleTouchTap} style={styles.button}><IconMore /></IconButton>
      </div>
    )
  }
}
