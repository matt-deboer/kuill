import React from 'react'
import PropTypes from 'prop-types'
import Avatar from 'material-ui/Avatar'
import { List, ListItem } from 'material-ui/List'
import Subheader from 'material-ui/Subheader'
import Divider from 'material-ui/Divider'
import Paper from 'material-ui/Paper'
import { blueA400, white } from 'material-ui/styles/colors'
import { Link } from 'react-router-dom'
import { eventType as eventTypeIcons } from '../icons'
import { linkForResource } from '../../routes'
import * as moment from 'moment'

export default class RecentUpdates extends React.Component {

  static propTypes = {
    recentEvents: PropTypes.array
  }

  render() {
    const styles = {
      subheader: {
        fontSize: 20,
        // backgroundColor: blueA400,
        backgroundColor: 'rgba(21, 61, 128, 0.5)',
        color: white
      },
      listItem: {
        fontSize: 14,
        wordWrap: 'break-word',
        padding: '10px 15px',
      },
      timestamp: {
        paddingTop: 5,
        fontSize: 13,
      },
      link: {
        fontSize: 13,
      }
    }

    let { props } = this

    // {/* leftAvatar={<Avatar icon={eventTypeIcons[event.type]} data-rh={event.type}/>} */}

    return (
      <Paper style={{marginTop: 10}}>
        <Subheader style={styles.subheader}>Recent Updates</Subheader>
        <List style={{maxHeight: 'calc(100vh - 600px)', overflowY: 'scroll'}}>
          {props.recentEvents.map(event =>
            <div key={event.object.metadata.uid}>
              <ListItem
                disabled={true}
                primaryText={event.object.message}
                secondaryText={<div style={{overflow: 'visible', paddingBottom: 20}}>
                  <Link key={'link'} style={styles.link} to={linkForResource(event.key)}>{event.key.replace(/\//g," / ")}</Link>
                  <div key={'age'} style={styles.timestamp}>{`at ${event.object.lastTimestamp} (${toHumanizedAge(event.object.lastTimestamp)} ago)`}</div>
                </div>
                }
                style={styles.listItem}
              />
              <Divider inset={false} />
            </div>
          )}
        </List>
      </Paper>
    )
  }
}

function toHumanizedAge(timestamp) {
  let age = Date.now() - Date.parse(timestamp)
  let humanized = moment.duration(age).humanize()
  return humanized.replace("a few ", "")
}