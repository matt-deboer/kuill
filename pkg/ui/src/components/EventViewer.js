import React from 'react'
import { connect } from 'react-redux'
import {
  Table,
  TableBody,
  TableRow,
  TableRowColumn,
} from 'material-ui/Table'
import * as moment from 'moment'
import sizeMe from 'react-sizeme'
import IconModified from 'material-ui/svg-icons/action/done'
import IconAdded from 'material-ui/svg-icons/content/add'
import IconDeleted from 'material-ui/svg-icons/content/remove'
import IconError from 'material-ui/svg-icons/content/report'
import { grey500 } from 'material-ui/styles/colors'

const stateIcons = {
  ADDED: <IconAdded style={{color: grey500}}/>,
  DELETED: <IconDeleted style={{color: grey500}}/>,
  ERROR: <IconError style={{color: grey500}}/>,
  MODIFIED: <IconModified style={{color: grey500}}/>,
}

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
    message: {
      whiteSpace: 'normal'
    }
  }

  return (
    <div style={{ padding: 16, height: `${availableHeight}px`}}>
      <Table selectable={false} style={{ border: '0', margin: 15}} height={`${availableHeight-15}px`} wrapperStyle={{overflowX: 'hidden'}}>
        <TableBody displayRowCheckbox={false}>
          {props.events.map((event, index)=>
            <TableRow key={event.object.metadata.uid} displayBorder={true} style={{height: 28}}>
              <TableRowColumn style={{ width: 85, height: 28, padding: 4}} data-rh={event.object.lastTimestamp}>
                {'100 months'/*toHumanizedAge(event.object.lastTimestamp)*/}
              </TableRowColumn>
              <TableRowColumn style={{ width: 28, height: 28, padding: 4}} data-rh={event.type}>
                {stateIcons[event.type]}
              </TableRowColumn>
              <TableRowColumn style={{ width: 80, height: 28, padding: 4}}>{event.object.involvedObject.kind}</TableRowColumn>
              <TableRowColumn style={{ height: 28, padding: 4}}>
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

