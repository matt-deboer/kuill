import React from 'react'
import PropTypes from 'prop-types'
import Avatar from 'material-ui/Avatar'
import {List, ListItem} from 'material-ui/List'
import Subheader from 'material-ui/Subheader'
import Divider from 'material-ui/Divider'
import Paper from 'material-ui/Paper'
import IconButton from 'material-ui/IconButton'
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert'
import MenuItem from 'material-ui/MenuItem'
import {grey400, lightBlueA400, white} from 'material-ui/styles/colors'
import {typography} from 'material-ui/styles'
import Wallpaper from 'material-ui/svg-icons/device/wallpaper'
import {Link} from 'react-router-dom'
import { eventType as eventTypeIcons } from '../icons'
import { linkForResource } from '../../routes'

export default class RecentUpdates extends React.Component {

  static propTypes = {
    recentEvents: PropTypes.array
  }

  render() {
    const styles = {
      subheader: {
        fontSize: 24,
        backgroundColor: lightBlueA400,
        color: white
      }
    }

    const iconButtonElement = (
      <IconButton
        touch={true}
        tooltipPosition="bottom-left"
      >
        <MoreVertIcon color={grey400} />
      </IconButton>
    )

    let { props } = this

    return (
      <Paper>
        <Subheader style={styles.subheader}>Recent Updates</Subheader>
        <List style={{maxHeight: 400, overflowY: 'scroll'}}>
          {props.recentEvents.map(event =>
            <div key={event.object.metadata.name}>
              <ListItem
                leftAvatar={<Avatar icon={eventTypeIcons[event.type]} data-rh={event.type}/>}
                primaryText={event.object.message}
                secondaryText={<Link to={linkForResource(event.key)}>{event.key.replace(/\//g," / ")}</Link>}
                style={{wordWrap: 'break-word'}}
              />
              <Divider inset={true} />
            </div>
          )}
        </List>
      </Paper>
    )
  }
}
