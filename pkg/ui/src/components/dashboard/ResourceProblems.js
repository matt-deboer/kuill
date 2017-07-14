import React from 'react'
import PropTypes from 'prop-types'
import { List, ListItem } from 'material-ui/List'
import Subheader from 'material-ui/Subheader'
import Divider from 'material-ui/Divider'
import Paper from 'material-ui/Paper'
import { grey500, white, red900 } from 'material-ui/styles/colors'
import { Link } from 'react-router-dom'
import { resourceStatus as resourceStatusIcons } from '../icons'
import { linkForResource } from '../../routes'
import { eventsForResource } from '../../resource-utils'
import * as moment from 'moment'

export default class ResourceProblems extends React.Component {

  static propTypes = {
    propblemResources: PropTypes.array,
    events: PropTypes.object,
  }

  render() {
    let { problemResources, events } = this.props
    
    let resources = []
    for (let key in problemResources) {
      let resource = problemResources[key]
      let selectedEvents = eventsForResource(events, resource).filter(e => {
        return e.object.type === 'Warning' || e.object.type === 'Error'
      })
      if (selectedEvents.length > 0) {
        resources.push({resource: resource, events: selectedEvents})
      }
    }

    const styles = {
      subheader: {
        fontSize: 24,
        backgroundColor: (resources.length > 0 ? red900 : grey500),
        color: white
      },
      secondary: {
        overflow: 'visible',
        paddingBottom: 20,
        height: 'inherit',
        whitespace: 'normal'
      },
      message: {
        overflow: 'visible',
        whiteSpace: 'normal',
        paddingBottom: 10,
      },
      type: {
        fontWeight: 600,
      }
    }

    return (
      <Paper>
        <Subheader style={styles.subheader}>Problems</Subheader>
        <List style={{maxHeight: 400, overflowY: 'scroll'}}>
          {resources.map(r =>
            <div key={r.resource.key}>
              <ListItem
                disabled={true}
                leftIcon={<div style={{padding: '0 8px'}}>{resourceStatusIcons[r.resource.statusSummary]}</div>}
                primaryText={<Link to={linkForResource(r.resource)}>{r.resource.key.replace(/\//g," / ")}</Link>}
                secondaryText={
                  <div style={styles.secondary}>
                    {r.events.map(e => <div key={e.object.metadata.uid} style={styles.message}>
                      <span style={styles.type}>{e.object.type}: </span>{e.object.message}
                      <br/><span style={styles.type}> at: </span>{e.object.lastTimestamp} ({toHumanizedAge(e.object.lastTimestamp)} ago)
                    </div>)}
                  </div>  
                }
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

function toHumanizedAge(timestamp) {
  let age = Date.now() - Date.parse(timestamp)
  let humanized = moment.duration(age).humanize()
  return humanized.replace("a few ", "")
}