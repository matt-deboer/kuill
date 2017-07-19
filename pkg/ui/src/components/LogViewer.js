import React from 'react'
import PropTypes from 'prop-types'
import { grey100, grey300, grey500, grey900, grey800} from 'material-ui/styles/colors'
import {Toolbar, ToolbarGroup} from 'material-ui/Toolbar'
import Menu from 'material-ui/Menu'
import MenuItem from 'material-ui/MenuItem'
import IconExpand from 'material-ui/svg-icons/navigation/more-vert'
import IconChevronRight from 'material-ui/svg-icons/navigation/chevron-right'
import IconChecked from 'material-ui/svg-icons/toggle/check-box'
import IconUnchecked from 'material-ui/svg-icons/toggle/check-box-outline-blank'
import FlatButton from 'material-ui/FlatButton'
import Popover from 'material-ui/Popover'
import { connect } from 'react-redux'
import { selectLogsFor } from '../state/actions/logs'
// import sizeMe from 'react-sizeme'
import XTerm from './xterm/XTerm'
import lcs from 'longest-common-subsequence'
import './LogViewer.scss'


const mapStateToProps = function(store) {
  
  return {
    pods: store.workloads.pods,
    selectedContainers: store.logs.podContainers,
  }
}

const mapDispatchToProps = function(dispatch, ownProps) {
  return {
    selectLogsFor: function(pods, containers) {
      dispatch(selectLogsFor(pods, containers))
    }
  }
}

const checkedIcon = <IconChecked style={{height: 18, width: 18, fill: grey300}}/>
const uncheckedIcon = <IconUnchecked style={{height: 18, width: 18, fill: grey300}}/>

const styles = {
  label: {
    paddingLeft: 16,
    lineHeight: '24px',
    textAlign: 'right',
    marginRight: 5,
    fontSize: 13,
    fontWeight: 600,
    color: grey500,
    display: 'inline-block',
    width: '30%',
  },
  button: {
    height: '24px',
    width: '70%', 
    lineHeight: '24px', 
    textAlign: 'left', 
    color: grey100,
    textTransform: 'none',
    display: 'inline-block',
    marginLeft: 8,
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
export default connect(mapStateToProps, mapDispatchToProps) (
class LogViewer extends React.Component {

  static propTypes = {
    selectedContainers: PropTypes.array,
    pods: PropTypes.object,
  }
  
  static defaultProps = {
    selectedContainers: [],
    pods: {},
  }

  constructor(props) {
    super(props);
    this.state = {
      podsOpen: false,
      containersOpen: false,
      selectedContainers: props.selectedContainers,
    }
    this.logs = props.logs
  }

  handleTouchTap = (type, event) => {
    // This prevents ghost click.
    event.preventDefault();
    let state = {}
    state[`${type}Open`] = true
    state[`${type}Anchor`] = event.currentTarget
    this.setState(state)
  }

  handleMenuSelection = (event, value) => {
    let {props} = this
    if (value.length > 0) {
      props.selectLogsFor(value)
      console.log(`menu changed => ${value}`)
    }
  }

  handleRequestClose = (type) => {
    let state = {}
    state[`${type}Open`] = false
    this.setState(state)
  }

  componentDidUpdate = () => {
    this.term && this.term.fit()
  }

  render () {

    let { props } = this
    return (
      <div>
        <Toolbar style={{height: '36px', padding: 6, backgroundColor: grey900, margin: 0}}>
          {this.renderContainerMenu()}
        </Toolbar>
        <XTerm 
          className={'logs'} 
          style={{
            height: `${window.innerHeight - props.contentTop - 90}px`,
            backgroundColor: grey900,
            padding: 10,
            fontSize: '12px',
          }}
          options={{
            cursorBlink: false,
            scrollback: this.state.maxLines,
            focus: true,
          }}
          onDestroy={()=>{
            // Detach ourselves from the buffer so that it will continue to queue up
            // log messages in its own internal buffer until a new terminal viewer
            // is mounted
            this.logs.onPush = null
            this.term = null
          }}
          ref={(ref) => {
            if (!!ref && !this.term) {
              this.term = ref
              for (let line of this.logs) {
                this.term.writeln(line)
              }
              this.logs.length = 0
              this.logs.onPush = function(e) {
                ref.writeln(e)
                return true
              }
              ref.fit()
            }
          }}
          onInput={this.onInput}
          />
      </div>
    )
  }

  renderContainerMenu = () => {
    
    let { props } = this
    let menuItems = []

    let selected = {}
    let commonPodName = ''
    let containerNames = {}
    for (let c of props.selectedContainers) {
      selected[c] = true
      let parts=c.split('/')
      commonPodName = (commonPodName) ? `${lcs(commonPodName, parts[0])}*` : parts[0]
      containerNames[parts[1]]=true
    }
    let commonName = `${commonPodName}/`
    containerNames = Object.keys(containerNames)
    if (containerNames.length > 1) {
      commonName += `{${containerNames.join(",")}}`
    } else {
      commonName += containerNames[0]
    }

    for (let podName in props.pods) {
      let pod = props.pods[podName]
      if (!!pod) {
        if (pod.spec.initContainers) {
          for (let ic of pod.spec.initContainers) {
            let podContainer = `${podName}/${ic.name}`
            let icon = (podContainer in selected) ? checkedIcon : uncheckedIcon
            menuItems.push(<MenuItem key={podContainer} rightIcon={icon} value={podContainer} primaryText={`${podContainer} (init)`} />)
          }
        }
        for (let c of pod.spec.containers) {
          let podContainer = `${podName}/${c.name}`
          let icon = (podContainer in selected) ? checkedIcon : uncheckedIcon
          menuItems.push(<MenuItem key={podContainer} rightIcon={icon} value={podContainer} primaryText={podContainer} />)
        }
      }
    }

    return (
      <ToolbarGroup style={{width: '100%'}}>
        <span style={styles.label}>following container(s)</span>
        <IconChevronRight style={{height: 22, width: 22, fill: grey500}}/>
        <FlatButton
          fullWidth={false}
          backgroundColor={grey800}
          labelStyle={styles.buttonLabel}
          style={styles.button}
          label={commonName}
          onTouchTap={this.handleTouchTap.bind(this, 'containers')}
          icon={<IconExpand style={{height: 18, width: 18}}/>}
        />
        <Popover
          onRequestClose={this.handleRequestClose.bind(this, 'containers')}
          anchorOrigin={{horizontal: 'left', vertical: 'bottom'}}
          targetOrigin={{horizontal: 'left', vertical: 'top'}}
          open={this.state.containersOpen}
          anchorEl={this.state.containersAnchor}
          style={{
            paddingTop: 0,
            paddingBottom: 0,
            backgroundColor: 'transparent',
          }}
        >
          <Menu 
            multiple={true}
            value={props.selectedContainers}
            selectedMenuItemStyle={{color: grey300}}
            desktop={true} 
            style={styles.popoverMenu}
            menuItemStyle={styles.popoverItems}
            onChange={this.handleMenuSelection}
          >
            {menuItems}
          </Menu>
        </Popover>
      </ToolbarGroup>
    )
  }

})
