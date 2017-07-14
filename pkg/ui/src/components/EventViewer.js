import React from 'react'
import { connect } from 'react-redux'
import {
  Table,
  TableBody,
  TableRow,
  TableRowColumn,
  TableHeader,
  TableHeaderColumn
} from 'material-ui/Table'
import * as moment from 'moment'
import sizeMe from 'react-sizeme'
import { eventType as eventTypeIcons } from './icons'

const mapStateToProps = function(store) {
  return {
    events: store.events.selectedEvents,
  }
}

// use functional component style for representational components
export default connect(mapStateToProps) (
sizeMe({ monitorHeight: true, monitorWidth: true }) (
function EventViewer(props) {

  let availableHeight = window.innerHeight - props.contentTop - 70

  const styles = {
    type: {
      width: 28,
      height: 28,
      padding: 4,
    },
    age: {
      width: 85,
      height: 28,
      padding: 4,
    },
    kind: {
      width: 80,
      height: 28,
      padding: 4
    },
    message: {
      height: 28, 
      padding: 4,
    }
  }

  return (
    <div style={{ padding: 16, height: `${availableHeight}px`}}>
      <Table selectable={false} style={{ border: '0', margin: 15}} height={`${availableHeight-15}px`} wrapperStyle={{overflowX: 'hidden'}}>
        <TableHeader adjustForCheckbox={false} displaySelectAll={false}>
          <TableRow displayBorder={true} style={{height: 28}}>
              <TableHeaderColumn style={styles.age}>Age</TableHeaderColumn>
              <TableHeaderColumn style={styles.type}>Type</TableHeaderColumn>
              <TableHeaderColumn style={styles.kind}>Resource</TableHeaderColumn>
              <TableHeaderColumn style={styles.message}>Message</TableHeaderColumn>
          </TableRow>
        </TableHeader>
        <TableBody displayRowCheckbox={false}>
          {props.events.map((event, index)=>
            <TableRow key={event.object.metadata.uid} displayBorder={true} style={{height: 28}}>
              <TableRowColumn style={styles.age} data-rh={event.object.lastTimestamp}>
                {toHumanizedAge(event.object.lastTimestamp)}
              </TableRowColumn>
              <TableRowColumn style={styles.type} data-rh={event.type}>
                {eventTypeIcons[event.type]}
              </TableRowColumn>
              <TableRowColumn style={styles.kind}>{event.object.involvedObject.kind}</TableRowColumn>
              <TableRowColumn style={styles.message}>
                <span style={styles.message}>{event.object.message}</span>
              </TableRowColumn>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}))

function toHumanizedAge(timestamp) {
  let age = Date.now() - Date.parse(timestamp)
  let humanized = moment.duration(age).humanize()
  return humanized.replace("a few ", "")
}

