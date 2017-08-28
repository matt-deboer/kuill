import React from 'react'
import PropTypes from 'prop-types'
import { List, ListItem } from 'material-ui/List'
import Subheader from 'material-ui/Subheader'
import Divider from 'material-ui/Divider'
import Paper from 'material-ui/Paper'
import { white } from 'material-ui/styles/colors'
import { Link } from 'react-router-dom'
import { linkForResource } from '../../routes'
import { toHumanizedAge } from '../../converters'
import { connect } from 'react-redux'
import HelpText from '../../i18n/help-text'

const mapStateToProps = function(store) {
  return {
    recentEvents: store.events.recentEvents,
    selectedNamespaces: store.usersettings.selectedNamespaces,
  }
}

const mapDispatchToProps = function(dispatch, ownProps) {
  return {
  }
}

export default connect(mapStateToProps, mapDispatchToProps) (
class RecentUpdates extends React.Component {

  static propTypes = {
    recentEvents: PropTypes.array
  }

  render() {
    const styles = {
      wrapper: {
        marginTop: 0,
        backgroundColor: 'rgb(80,80,80)',
        border: '1px solid rgba(0,0,0,0.5)',
      },
      subheader: {
        fontSize: 18,
        backgroundColor: 'rgba(41, 98, 255, 0.5)',
        color: white,
        borderBottom: '1px solid rgba(0,0,0,0.5)',
        lineHeight: '30px',
      },
      listItem: {
        fontSize: 14,
        wordWrap: 'break-word',
        padding: '10px 15px',
        color: 'rgb(240,240,240)',
      },
      timestamp: {
        paddingTop: 5,
        fontSize: 13,
        color: 'rgb(180,180,180)',
      },
      link: {
        fontSize: 12,
        color: 'rgb(94, 154, 255)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        width: 'calc(100% - 10px)',
      },
      divider: {
        backgroundColor: 'rgba(224, 224, 224, 0.2)',
      }
    }

    let { props } = this
    let { selectedNamespaces } = props

    let namespacesFiltered = (Object.keys(selectedNamespaces).length > 0)
    let recentEvents
    if (!namespacesFiltered) {
      recentEvents = props.recentEvents
    } else {
      recentEvents = []
      for (let event of props.recentEvents) {
        if (event.object.metadata.namespace in selectedNamespaces) {
          recentEvents.push(event)
        }
      }
    }


    // {/* leftAvatar={<Avatar icon={eventTypeIcons[event.type]} data-rh={event.type}/>} */}

    return (
      <Paper style={styles.wrapper}>
        <HelpText style={{position: 'absolute', top: 7, right: 25}} locale={'en'} textId={'RecentUpdates'} orientation={'left'} />
        <Subheader style={styles.subheader}>Recent Updates</Subheader>
        <List className={'list-contents'}>
          {recentEvents.map(event =>
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
              <Divider inset={false} style={styles.divider}/>
            </div>
          )}
        </List>
      </Paper>
    )
  }
})
