import React from 'react'
import Popover from 'material-ui/Popover'
import Paper from 'material-ui/Paper'
import Subheader from 'material-ui/Subheader'

const styles = {
  popover: {
    border: '1px solid rgba(0,0,0,0.3)',
    backgroundColor: 'rgb(240,240,240)',
  },
  popoverTitle: {
    color: 'rgb(0,0,0)',
    fontWeight: 600,
    borderBottom: '1px solid rgba(0,0,0,0.3)',
    backgroundColor: 'rgba(30, 30, 30, 0.15)',
    fontSize: 13,
    lineHeight: '32px',
    paddingLeft: 16,
    paddingRight: 16,
    marginLeft: -20,
    marginRight: -20,
    marginTop: -20,
    marginBottom: 10,
    width: 'auto',
  }
}

export default class GenericExpander extends React.Component {
  
  static defaultProps = {
    anchorOrigin: {horizontal: 'right', vertical: 'bottom'},
    targetOrigin: {horizontal: 'right', vertical: 'bottom'},
  }

  constructor(props) {
    super(props)
    this.state = {
      annotationsOpen: false,
      annotationText: '',
    }
  }

  handleAnnotationsTouchTap = (event) => {
    // This prevents ghost click.
    event.preventDefault();

    this.setState({
      annotationsOpen: true,
      annotationsAnchorEl: event.currentTarget,
      annotationText: event.currentTarget.dataset.text,
      annotationName: event.currentTarget.dataset.name,
    })
  }

  handleRequestCloseAnnotations = () => {
    this.setState({
      annotationsOpen: false,
      annotationText: '',
      annotationName: '',
    })
  }

  render() {
  
    let { title, contents, open, anchorEl, onRequestClose, anchorOrigin, targetOrigin } = this.props
  
    return (
      <Popover
        open={open}
        anchorEl={anchorEl}
        anchorOrigin={anchorOrigin}
        targetOrigin={targetOrigin}
        onRequestClose={onRequestClose}
        style={styles.popover}
      >
        <Paper style={{
          background: 'transparent',
          padding: 20, 
          fontSize: 13,
          maxWidth: 'calc(100vw - 100px)',
          maxHeight: 'calc(100vh - 275px)',
          overflow: 'hidden',
          }}
          zDepth={3}>
          <Subheader style={styles.popoverTitle}>{title}</Subheader>
          <div style={{
            overflow: 'auto',
            maxHeight: `${window.innerHeight - 300}px`,
          }}>
            {contents}
          </div>
        </Paper>
      </Popover>
    )
  }
}

