import React from 'react'
import PropTypes from 'prop-types'
import { List, ListItem } from 'material-ui/List'
import Subheader from 'material-ui/Subheader'
import Divider from 'material-ui/Divider'
import Paper from 'material-ui/Paper'
import IconStatusOK from 'material-ui/svg-icons/action/check-circle'

import { grey500, grey600, grey800, white, red900, blueA400 } from 'material-ui/styles/colors'
import { Link } from 'react-router-dom'
import { connect } from 'react-redux'
import { resourceStatus as resourceStatusIcons } from '../icons'
import { linkForResource } from '../../routes'
import { eventsForResource } from '../../utils/resource-utils'
import { toHumanizedAge } from '../../converters'
import { Tabs, Tab } from 'material-ui/Tabs'
import HelpText from '../../i18n/help-text'
import './ResourceProblems.css'

const mapStateToProps = function(store) {
  return {
    workloadProblems: store.workloads.problemResources,
    clusterProblems: store.cluster.problemResources,
    events: store.events.events,
    selectedNamespaces: store.usersettings.selectedNamespaces,
  }
}

export default connect(mapStateToProps) (
class ResourceProblems extends React.PureComponent {

  static propTypes = {
    workloadProblems: PropTypes.object.isRequired,
    clusterProblems: PropTypes.object.isRequired,
    events: PropTypes.object.isRequired,
    selectedNamespaces: PropTypes.object.isRequired,
  }

  constructor(props) {
    super(props);
    let problems = this.collectProblems(props)
    this.state = {
      problems: problems,
      selectedTab: ('workload' in problems ? 'workload': 'cluster'),
    }
    this.handleChangeTab = this.handleChangeTab.bind(this)
  }

  collectProblems = (props) => {
    
    let { workloadProblems, clusterProblems, events, selectedNamespaces } = props
    
    let namespacesFiltered = (Object.keys(selectedNamespaces).length > 0)
    let problemsByWorkload = []
    for (let key in workloadProblems) {
      let resource = workloadProblems[key]
      if (!namespacesFiltered || (resource.metadata.namespace in selectedNamespaces)) {
        let selectedEvents = eventsForResource(events, resource).filter(e => {
          return e.object.type === 'Warning' || e.object.type === 'Error'
        })
        if (selectedEvents.length > 0) {
          problemsByWorkload.push({resource: resource, events: selectedEvents})
        }
      }
    }

    let problemsByCluster = []
    for (let key in clusterProblems) {
      let resource = clusterProblems[key]
      let selectedEvents = eventsForResource(events, resource).filter(e => {
        return (e.object.type === 'Warning' || e.object.type === 'Error' || e.object.reason === 'NodeNotReady')
      })
      if (selectedEvents.length > 0) {
        problemsByCluster.push({resource: resource, events: selectedEvents})
      } else {
        if (resource.status && resource.status.conditions.constructor === Array) {
          resource.status.conditions.forEach((cond) => {
            if (cond.type === 'Ready' && cond.status !== 'True') {
              // simulate an event to mark unready status
              problemsByCluster.push({resource: resource, events: [
                {
                  object: {
                    type: cond.reason,
                    metadata: {
                      uid: resource.metadata.uid,
                    },
                    message: cond.message,
                    lastTimestamp: cond.lastTransitionTime,
                  },
                },
              ]})
            }
          })
        }
      }
    }
    let problems = {}
    if (problemsByWorkload.length > 0) {
      problems.workload = problemsByWorkload
    }
    if (problemsByCluster.length > 0) {
      problems.cluster = problemsByCluster
    }
    return problems
  }

  componentWillReceiveProps = (nextProps) => {
    let problems = this.collectProblems(nextProps)
    let selectedTab = this.state.selectedTab
    if (!(this.state.selectedTab in problems)) {
      selectedTab = ('workload' in problems ? 'workload': 'cluster')
    }
    this.setState({problems: problems, selectedTab: selectedTab})
  }

  handleChangeTab = (value) => {
    if (value in this.state.problems) {
      this.setState({
        selectedTab: value,
      })
    }
  }

  render() {
    let problemsByWorkload = this.state.problems.workload || []
    let problemsByCluster = this.state.problems.cluster || []

    const styles = {
      wrapper: {
        marginTop: 0,
        backgroundColor: 'rgb(80,80,80)',
        border: '1px solid rgba(0,0,0,0.5)',
      },
      subheader: {
        fontSize: 18,
        backgroundColor: (problemsByWorkload.length > 0  || problemsByCluster.length > 0 ? red900 : grey500),
        color: white,
        borderBottom: '1px solid rgba(0,0,0,0.5)',
        lineHeight: '30px',
      },
      secondary: {
        overflow: 'visible',
        paddingBottom: 0,
        height: 'inherit',
        whitespace: 'normal'
      },
      message: {
        overflow: 'visible',
        whiteSpace: 'normal',
        paddingBottom: 10,
        color: 'rgb(240,240,240)',
      },
      type: {
        fontWeight: 600,
      },
      allOk: {
        height: '100%',
        color: 'rgb(180,180,180)',
      },
      allOkIcon: {
        display: 'inline-block',
        color: 'rgba(41, 121, 255, 0.8)',
        height: '100%',
        width: 96,
        stroke: 'rgba(0,0,0,0.8)',
        strokeWidth: '0.3',
      },
      allOkText: {
        width: '100%',
        paddingTop: 15,
        position: 'absolute',
        top: 0,
      },
      listContents: {
        position: 'relative',
        verticalAlign: 'middle',
        textAlign: 'center',
        padding: '8px 0',
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
      icon: {
        padding: '0 8px 0 0',
        display: 'inline-block',
      },
      link: {
        fontSize: 12,
        color: 'rgb(94, 154, 255)',
        lineHeight: '30px',
        display: 'inline-flex',
        height: 30,
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        width: 'calc(100% - 10px)',
      },
      divider: {
        backgroundColor: 'rgba(224, 224, 224, 0.2)',
      },
      tabs: {
        backgroundColor: grey600,
        height: 30,
      },
      tabsInkBar: {
        backgroundColor: blueA400,
        height: 3,
        marginTop: -3,
        // borderTop: `1px ${blueA100} solid`,
      },
      tabStyle: {
        textTransform: 'none',
      },
      tabDisabledStyle: {
        textTransform: 'none',
        pointerEvents: 'none',
        color: grey800,
      }
    }

    let contents
    if (problemsByWorkload.length === 0 && problemsByCluster.length === 0) {
      contents = (
        <div className={'list-contents'} style={styles.listContents}>
          <div style={styles.allOk}>
            <IconStatusOK style={styles.allOkIcon}/>
            <div style={styles.allOkText}>( none )</div>
          </div>
        </div>
      )
    } else {
      contents = (
        <Tabs
          value={this.state.selectedTab}
          onChange={this.handleChangeTab}
          tabItemContainerStyle={styles.tabs}
          inkBarStyle={styles.tabsInkBar}
          style={{paddingBottom: 16}}
          className={'list-contents'}
        >
          <Tab className="tab" label={`Workloads (${problemsByWorkload.length})`} value="workload" style={problemsByWorkload.length === 0 ? styles.tabDisabledStyle : styles.tabStyle}>
            <List>
              {problemsByWorkload.map(r =>
                <div key={r.resource.key}>
                  <ListItem
                    disabled={true}
                    primaryText={<Link to={linkForResource(r.resource)} style={styles.link}>
                        <div style={styles.icon}>{resourceStatusIcons[r.resource.statusSummary]}</div>
                        {r.resource.key.replace(/\//g," / ")}
                      </Link>
                    }
                    secondaryText={
                      <div style={styles.secondary}>
                        {r.events.map(e => <div key={e.object.metadata.uid} style={styles.message}>
                          <span style={styles.type}>{e.object.type}: </span>{e.object.message}
                          <div key={'age'} style={styles.timestamp}>{`at ${e.object.lastTimestamp} (${toHumanizedAge(e.object.lastTimestamp)} ago)`}</div>
                        </div>)}
                      </div>  
                    }
                    style={styles.listItem}
                  />
                  <Divider inset={false} style={styles.divider}/>
                </div>
              )}
            </List>
          </Tab>
          <Tab className="tab" label={`Cluster (${problemsByCluster.length})`} value="cluster" style={problemsByCluster.length === 0 ? styles.tabDisabledStyle : styles.tabStyle}>
            <List>
              {problemsByCluster.map(r =>
                <div key={r.resource.key}>
                  <ListItem
                    disabled={true}
                    primaryText={<Link to={linkForResource(r.resource)} style={styles.link}>
                        <div style={styles.icon}>{resourceStatusIcons[r.resource.statusSummary]}</div>
                        {r.resource.key.replace(/\//g," / ")}
                      </Link>
                    }
                    secondaryText={
                      <div style={styles.secondary}>
                        {r.events.map(e => <div key={e.object.metadata.uid} style={styles.message}>
                          <span style={styles.type}>{e.object.type}: </span>{e.object.message}
                          <div key={'age'} style={styles.timestamp}>{`at ${e.object.lastTimestamp} (${toHumanizedAge(e.object.lastTimestamp)} ago)`}</div>
                        </div>)}
                      </div>  
                    }
                    style={styles.listItem}
                  />
                  <Divider inset={false} style={styles.divider}/>
                </div>
              )}
            </List>
          </Tab>  
        </Tabs>
      )
    }

    return (
      <Paper style={styles.wrapper}>
        <HelpText 
          style={{position: 'absolute', top: 7, right: 25}} 
          locale={'en'} 
          textId={'ResourceProblems'}
          iconStyle={{color: 'rgba(220,220,220,0.5)'}}/>
        <Subheader style={styles.subheader}>Problems</Subheader>
        {contents}
      </Paper>
    )
  }
})
