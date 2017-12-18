import React from 'react'
import PropTypes from 'prop-types'
import IconExpand from 'material-ui/svg-icons/navigation/more-vert'
import IconEdit from 'material-ui/svg-icons/editor/mode-edit'
import IconView from 'material-ui/svg-icons/image/crop-free'
import IconDelete from 'material-ui/svg-icons/action/delete'
import IconScale from 'material-ui/svg-icons/communication/import-export'
import IconSuspend from 'material-ui/svg-icons/content/block'
import RaisedButton from 'material-ui/RaisedButton'
import Popover from 'material-ui/Popover'
import Menu from 'material-ui/Menu'
import MenuItem from 'material-ui/MenuItem'

const orderedActions = ['suspend', 'scale', 'edit', 'get', 'delete']

const actionIcons = {
  suspend: <IconSuspend/>,
  scale: <IconScale/>,
  edit: <IconEdit/>,
  get: <IconView/>,
  delete: <IconDelete/>,
}

export default class ResourceInfoActionsMenu extends React.PureComponent {

  static propTypes = {
    handlers: PropTypes.object,
    access: PropTypes.object,
  }

  static defaultProps = {
    handlers: {},
    access: {},
  }

  constructor(props) {
    super(props)
    this.state = {
      open: false,
    }
  }

  handleActionsTouchTap = (event) => {
    // This prevents ghost click.
    event.preventDefault()
    this.setState({
      open: true,
      anchor: event.currentTarget,
    })
  }

  handleActionsRequestClose = () => {
    this.setState({
      open: false,
      anchor: null,
    })
  }

  render() {

    let { access, handlers } = this.props
    
    if (!access) {
      return null
    }

    let actions = []
    let that = this
    for (let action of orderedActions) {
      if (access[action]) {
        let primaryText = action[0].toUpperCase() + action.substr(1)
        let handler = handlers[action]
        if (action === 'get') {
          if (access['edit']) {
            continue
          } else {
            primaryText = 'View YAML'
            handler = handlers.edit
          }
        }

        actions.push(
          <MenuItem key={action} primaryText={primaryText}
            id={`resource-info-action:${action}`}
            className={`resource-info-action menu-item ${action}`}
            onTouchTap={() => {
              that.setState({
                open: false,
              })
              handler()
            }}
            leftIcon={actionIcons[action]}
            />
        )
      }
    }

    if (!actions) {
      return null
    }

    return (
      <div> 
        <RaisedButton
          id={'resource-info-action'}
          label="Actions"
          labelPosition="before"
          onTouchTap={this.handleActionsTouchTap}
          icon={<IconExpand/>}
          style={{position: 'absolute', right: 20, top: 20}}
          primary={true}
        />
        <Popover
          open={this.state.open}
          anchorEl={this.state.anchor}
          onRequestClose={this.handleActionsRequestClose}
          anchorOrigin={{horizontal: 'right', vertical: 'bottom'}}
          targetOrigin={{horizontal: 'right', vertical: 'top'}}
        >
          <Menu id={'resource-info-action-items'} className={'resource-info-action-items'} desktop={true}>
            {actions}
          </Menu>
        </Popover>

      </div>
    )
  }
}
