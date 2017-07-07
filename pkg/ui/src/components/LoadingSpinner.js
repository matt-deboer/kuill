import React from 'react'
import sizeMe from 'react-sizeme'

import RefreshIndicator from 'material-ui/RefreshIndicator'

const spinnerStatusLoading = 'loading'
const spinnerStatusHidden = 'hide'

export default sizeMe({ monitorHeight: true, monitorWidth: true }) (
class LoadingSpinner extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: false,
    }
    this.showAfterDelay()
  }

  showAfterDelay = () => {
    if (this.props.loading && !this.state.loading) {
      window.setTimeout(() => {
        if (this.props.loading) {
          this.setState({loading: true})
        } 
      }, 250)
    }
  }

  componentWillReceiveProps = (props) => {
    if (!props.loading && this.state.loading) {
      // Hide immediately
      this.setState({loading: false})
    }
  }

  componentDidUpdate = () => {
    this.showAfterDelay()
  }

  render() {
    let { loading } = this.state

    const styles = {
      overlay: {
        opacity: (loading ? 1 : 0), 
        backgroundColor: 'rgba(0, 0, 0, 0.54)',
        position: 'fixed',
        height: '100%',
        width: '100%',
        top: 0,
        left: 0,
        WebkitTapHighlightColor: 'rgba(0, 0, 0, 0)',
        willChange: 'opacity',
        transform: 'translateZ(0px)',
        transition: 'left 0ms cubic-bezier(0.23, 1, 0.32, 1) 0ms, opacity 400ms cubic-bezier(0.23, 1, 0.32, 1) 0ms',
        zIndex: loading ? 1400 : 0,
        display: loading ? 'inline-block' : 'none',
      },
      spinner: {
        zIndex: 1500,
      }
    }

    return (
      <div style={styles.overlay}>
        <RefreshIndicator
          className={'loading_indicator'}
          size={100}
          left={Math.floor((window.innerWidth) / 2)}
          top={Math.floor(window.innerHeight / 2)}
          status={loading ? spinnerStatusLoading : spinnerStatusHidden}
          style={styles.spinner}
        />
      </div>
    )
  }
})
