

import React from 'react'
import { grey200, grey300, white } from 'material-ui/styles/colors'
import IconButton from 'material-ui/IconButton'
import IconLogs from 'material-ui/svg-icons/action/receipt'
import IconTerminal from 'material-ui/svg-icons/hardware/computer'
import IconEdit from 'material-ui/svg-icons/editor/mode-edit'
import IconView from 'material-ui/svg-icons/image/crop-free'
import IconDelete from 'material-ui/svg-icons/action/delete'
import IconDetach from 'material-ui/svg-icons/image/filter-none'
import IconScale from 'material-ui/svg-icons/communication/import-export'
import IconSuspend from 'material-ui/svg-icons/content/block'
import { connect } from 'react-redux'
import Popover from 'material-ui/Popover'

const orderedActions = ['logs', 'terminal', 'suspend', 'scale', 'detach', 'edit', 'get', 'delete']

const actionIcons = {
  logs: <IconLogs/>,
  terminal: <IconTerminal/>,
  suspend: <IconSuspend/>, 
  scale: <IconScale/>, 
  edit: <IconEdit/>, 
  get: <IconView/>,
  delete: <IconDelete/>,
  detach: <IconDetach/>,
}

const mapStateToProps = function(store) {
  return {
    accessEvaluator: store.session.accessEvaluator,
  }
}

export default connect(mapStateToProps) (
class RowActionMenu extends React.PureComponent {

  render() {

    const styles = {
      popover: {
        marginTop: 8,
        marginLeft: 70,
        marginRight: 0,
        paddingLeft: 15,
        paddingRight: 15,
        paddingTop: 6,
        paddingBottom: 6,
        backgroundColor: '#BBB',
        border: '1px solid #000',
        borderRadius: '3px',
        boxShadow: 'rgba(0, 0, 0, 0.16) 0px 3px 10px, rgba(0, 0, 0, 0.23) 0px 3px 10px',
        display: 'flex',
      },
      actionContainer: {
        position: 'relative',
        display: 'inline-block',
        float: 'left',
      },
      actionLabel: {
        position: 'absolute',
        bottom: 0,
        textAlign: 'center',
        width: '100%',
        color: white,
        fontSize: 10,
        zIndex: 100,
        pointerEvents: 'none',
      },
      actionButton: {
        backgroundColor: 'transparent',
        marginTop: 4,
        marginBottom: 4,
        color: grey200,
        fontSize: 18,
        fontWeight: 600,
      },
      actionButtonLabel: {
        textTransform: 'none',
        color: grey300,
      },
      actionIcon: {
        color: white,
        marginTop: -4,
      },
      actionHoverStyle: {
        backgroundColor: '#999',
      },
    }

    let { props } = this
    let { access, handlers, anchorEl, open } = props
    
    if (!access) {
      return null
    }

    let actions = []
    for (let action of orderedActions) {
      if (access[action]) {
        
        let text = action
        let handler = handlers[action]
        if (action === 'get') {
          if (access['edit']) {
            continue
          } else {
            text = 'yaml'
            handler = handlers.edit
          }
        }
        
        let closeAndHandle = () => {
          handlers.close && handlers.close()
          handler()
        }

        actions.push(
          <div style={styles.actionContainer} key={action}>
            <div style={styles.actionLabel}>{text}</div>
            <IconButton
              className={`row-action ${action}`}
              onTouchTap={closeAndHandle}
              style={styles.actionButton}
              hoveredStyle={styles.actionHoverStyle}
              iconStyle={styles.actionIcon}
            >
              {actionIcons[action]}
            </IconButton>
          </div>
        )
      }
    }
    
    return (
      <Popover
        className="actions-popover"
        style={styles.popover}
        open={open}
        anchorEl={anchorEl}
        onRequestClose={handlers.close}
        zDepth={0}
        anchorOrigin={{horizontal: 'right', vertical: 'bottom'}}
        targetOrigin={{horizontal: 'left', vertical: 'bottom'}}
      >
        {actions}
      </Popover>
    )
  }
})




  