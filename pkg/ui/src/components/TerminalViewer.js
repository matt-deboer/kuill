import React from 'react'
import PropTypes from 'prop-types'
import {grey100, grey300, grey500, grey800, grey900} from 'material-ui/styles/colors'
import {Toolbar, ToolbarGroup} from 'material-ui/Toolbar'
import Menu from 'material-ui/Menu'
import MenuItem from 'material-ui/MenuItem'
import IconExpand from 'material-ui/svg-icons/navigation/more-vert'

import TextField from 'material-ui/TextField'

import IconChecked from 'material-ui/svg-icons/toggle/check-box'
import IconUnchecked from 'material-ui/svg-icons/toggle/check-box-outline-blank'
import IconPlay from 'material-ui/svg-icons/av/play-arrow'

import FlatButton from 'material-ui/FlatButton'
import IconButton from 'material-ui/IconButton'
import Popover from 'material-ui/Popover'
import { connect } from 'react-redux'
import { selectTerminalFor } from '../state/actions/terminal'
import { addError } from '../state/actions/errors'

import XTerm from './xterm/XTerm'
import sizeMe from 'react-sizeme'

const base64 = {
  toString: (b64) => decodeURIComponent(window.escape(window.atob(b64))),
  fromString: (str) => window.btoa(window.unescape(encodeURIComponent(str))),
}

const mapStateToProps = function(store) {
  
  return {
    pods: store.resources.pods,
    resource: store.resources.resource,
    selectedContainer: store.terminal.podContainer,
  }
}

const mapDispatchToProps = function(dispatch, ownProps) {
  return {
    selectTerminalFor: function(podContainer) {
      dispatch(selectTerminalFor(podContainer))
    },
    addError: function(error, severity, message, retryText, retryAction) {
      dispatch(addError(error, severity, message, retryText, retryAction))
    },
  }
}

const checkedIcon = <IconChecked style={{height: 18, width: 18, fill: grey300}}/>
const uncheckedIcon = <IconUnchecked style={{height: 18, width: 18, fill: grey300}}/>
const expandIcon = <IconExpand style={{height: 18, width: 18, marginLeft: 0, marginRight: 0}} />

const styles = {
  label: {
    paddingLeft: 5,
    lineHeight: '24px',
    marginRight: 5,
    fontSize: 13,
    fontWeight: 600,
    color: grey500,
    display: 'inline-block',
    fontFamily: 'Roboto, sans-serif',
  },
  button: {
    height: '24px',
    lineHeight: '24px', 
    textAlign: 'left', 
    color: grey100,
    textTransform: 'none',
    display: 'inline-block',
    margin: 5,
  },
  buttonLabel: {
    textTransform: 'none',
    fontSize: 13,
  },
  popoverMenu: {
    fontSize: 13,
    overflowX: 'hidden',
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: grey800,
  },
  popoverItems: {
    color: grey300,
  }
}

// use functional component style for representational components
export default sizeMe({ monitorWidth: true, monitorHeight: true }) (
connect(mapStateToProps, mapDispatchToProps) (
class TerminalViewer extends React.Component {

  static propTypes = {
    selectedContainer: PropTypes.string,
    pods: PropTypes.object,
  }
  
  static defaultProps = {
    selectedContainer: '',
    pods: {},
  }

  constructor(props) {
    super(props);
    
    this.state = {
      podsOpen: false,
      containerOpen: false,
      maxLines: props.maxLines || 1500,
      terminalOpen: false,
    }

    this.openTerminal = this.openTerminal.bind(this)
  }

  openTerminal = () => {
    let { props } = this
    if (props.selectedContainer !== this.state.selectedContainer) {
      this.destroy()

      let namespace = props.resource.metadata.namespace
      let loc = window.location
      let scheme = (loc.protocol === 'https:' ? 'wss' : 'ws')

      let [ selectedPod, selectedContainer ] = props.selectedContainer.split('/')

      let url = `${scheme}://${loc.host}`
      url += `/proxy/api/v1/namespaces/${namespace}/pods/${selectedPod}`
      url += `/exec?container=${selectedContainer}`
      url += `&tty=1&stdout=1&stderr=1&stdin=1`

      let commandString = this.commandInput.input.value || '/bin/sh'
      var command = props.command
      if (!command) {
        command = [ "/bin/sh", "-i", "-c", `TERM=xterm-256color ${commandString}` ]
      }
      if (typeof (command) === "string") {
        command = [ command ]
      }
      for (let arg of command) {
        url += "&command=" + encodeURIComponent(arg)
      }

      let addError = this.props.addError
      let openTerminal = this.openTerminal

      this.socket = new WebSocket(url, 'base64.channel.k8s.io')
      this.socket.onerror = function (e) {
        console.log(e)
        addError(e,'error',`WebSocket error occurred attempting to connect to terminal for ${props.selectedContainer}`,
          'Try Again', () => { 
            openTerminal() 
          })
      }
      this.socket.onclose = this.closeTerminal
      this.socket.onmessage = this.onEvent
      this.props = props
      console.log(`TerminalViewer: opened terminal to ${selectedPod}/${selectedContainer}`)
      this.socket.onopen = () => {
        this.setState({
          selectedContainer: props.selectedContainer,
          terminalOpen: true,
        })
      }
      this.socket.onclose = () => {
        this.setState({
          selectedContainer: null,
          terminalOpen: false,
        })
      }
    }
  }

  onSize = (size) => {
    this.term && this.term.fit()
    console.log(`TerminalViewer:onSize: ${JSON.stringify(size)}`)
  }

  onEvent = (event) => {
    // @see https://github.com/kubernetes/kubernetes/pull/13885
    var data = event.data.slice(1)
    var channel = event.data[0]
    switch(channel) {
      case '1': 
      case '2': 
      case '3': // side-channel errors
          
        let line = base64.toString(data)

        if (!!this.term) {
          if (!!this.tempBuffer) {
            this.term.write(this.tempBuffer)
            this.tempBuffer = null
          }
          // TODO: if channel === 3, display in different color/style
          this.term.write(line)
        } else {
          console.log(`TerminalViewer: writing line to temp buffer`)
          this.tempBuffer = (this.tempBuffer || '') + line
        }
        break
      default:
    }
  }

  onInput = (data) => {
    let { socket } = this
    if (socket && socket.readyState === 1) {
      socket.send(`0${base64.fromString(data)}`)
    } else {
      console.log(`TerminalViewer: socket is not ready; discarted: '${data}'`)
    }
  }

  destroy = () => {
    if (this.socket) {
      this.socket.close()
      this.socket.onerror = this.socket.onmessage = null
      console.log(`TerminalViewer for ${this.props.selectedContainer} destroyed`)
    }
  }

  closeTerminal = () => {
    this.destroy()
    this.setState({terminalOpen: false})
  }

  handleTouchTap = (type, event) => {
    // This prevents ghost click.
    event.preventDefault()
    let state = {}
    state[`${type}Open`] = true
    state[`${type}Anchor`] = event.currentTarget
    this.setState(state)
  }

  handleMenuSelection = (event, value) => {
    this.props.selectTerminalFor(value)
    console.log(`TerminalViewer: menu changed => ${value}`)
  }

  handleRequestClose = (type) => {
    let state = {}
    state[`${type}Open`] = false
    this.setState(state)
  }

  handleExec = (open) => {
    if (open) {
      !this.state.terminalOpen && this.openTerminal()
    } else {
      this.closeTerminal()
    }
  }

  componentDidUpdate = () => {
    this.state.terminalOpen 
      && !!this.socket 
      && this.socket.readyState === 1
      && !!this.term
      && this.term.focus()
    this.term && this.term.fit()
  }

  render () {

    let { props } = this

    return (
      <div style={{overflow: 'hidden', paddingBottom: 10, backgroundColor: grey900}}>
        <Toolbar style={{height: '36px', padding: 6, backgroundColor: grey900, margin: 0}}>
          <ToolbarGroup>
            <span style={styles.label}>container:</span>
            <FlatButton

              fullWidth={false}
              backgroundColor={grey800}
              labelStyle={styles.buttonLabel}
              style={styles.button}
              label={props.selectedContainer}
              onTouchTap={this.handleTouchTap.bind(this, 'container')}
              icon={expandIcon}
            />
            <Popover
              onRequestClose={this.handleRequestClose.bind(this, 'container')}
              anchorOrigin={{horizontal: 'left', vertical: 'bottom'}}
              targetOrigin={{horizontal: 'left', vertical: 'top'}}
              open={this.state.containerOpen}
              anchorEl={this.state.containerAnchor}
              style={{
                paddingTop: 0,
                paddingBottom: 0,
                backgroundColor: 'transparent',
              }}
            >
              <Menu 
                multiple={false}
                value={props.selectedContainer}
                selectedMenuItemStyle={{color: grey300}}
                desktop={true} 
                style={styles.popoverMenu}
                menuItemStyle={styles.popoverItems}
                onChange={this.handleMenuSelection}
              >
                {this.renderContainerMenuItems()}
              </Menu>
            </Popover>
            <span style={styles.label}>command:</span>
            <div style={{backgroundColor: grey800, width: 'auto', padding: '0 5px'}}>
              <TextField
                id={'command'}
                style={{height: 24, marginTop: 0, width: '100%'}}
                inputStyle={{color: grey100, fontSize: 15,}}
                ref={(ref) => { this.commandInput=ref }}
                defaultValue={'/bin/sh'}
                underlineStyle={{bottom: 2, borderWidth: 0}}
                underlineFocusStyle={{bottom: 2, borderWidth: 2}}
              />
            </div>
          </ToolbarGroup>
        </Toolbar>
        <div style={{
            position: 'absolute', 
            height: `${window.innerHeight - props.contentTop - 90 + 25}px`,
            width: '100%',
            display: this.state.terminalOpen ? 'none' : 'inline-block',
          }}>
          <IconButton
            className={'terminal-start'}
            hoveredStyle={{backgroundColor: grey300, fill: grey800}}
            iconStyle={{width: '20%', height: '20%'}}
            style={{
              backgroundColor: 'rgb(158, 158, 158)',
              margin: '0 auto', 
              height: `${window.innerHeight - props.contentTop - 90 + 25}px`,
              width: '100%'}}
            onTouchTap={this.handleExec.bind(this, !this.state.terminalOpen)}
          >
            <IconPlay/>
          </IconButton>
        </div>
        <XTerm  
          style={{
            height: `${window.innerHeight - props.contentTop - 100}px`,
            backgroundColor: (this.state.terminalOpen ? grey900 : grey500),
            padding: '10px 10px 15px 10px',
            fontSize: '12px',
          }}
          className={'terminal'}
          pasteOnCtrlV={true}
          enabled={this.state.terminalOpen}
          options={{
            cursorBlink: true,
            scrollback: this.state.maxLines,
            focus: true,
          }}
          ref={(ref) => {
            if (!!ref && !this.term) {
              this.term = ref
              if (!!this.tempBuffer) {
                console.log(`writing '${this.tempBuffer}' to term`)
                this.term.write(this.tempBuffer)
                this.tempBuffer = null
              }
              ref.fit()
              this.state.terminalOpen && this.socket.readyState === 1 && this.term.focus()
            }
          }}
          onInput={this.onInput}
          />
      </div>
    )
  }

  renderContainerMenuItems = () => {
    
    let { props } = this
    let menuItems = []

    for (let podName in props.pods) {
      let pod = props.pods[podName]
      if (!!pod) {
        if (pod.spec.initContainers) {
          for (let ic of pod.spec.initContainers) {
            let containerName = `${podName}/${ic.name}`
            let icon = (containerName === props.selectedContainer ? checkedIcon : uncheckedIcon)
            menuItems.push(<MenuItem key={containerName} rightIcon={icon} value={containerName} primaryText={`${containerName} (init)`} />)
          }
        }
        for (let c of pod.spec.containers) {
          let containerName = `${podName}/${c.name}`
          let icon = (containerName === props.selectedContainer ? checkedIcon : uncheckedIcon)
          menuItems.push(<MenuItem key={containerName} rightIcon={icon} value={containerName} primaryText={containerName} />)
        }
      }
    }
    return menuItems
  }

}))
