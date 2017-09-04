import React from 'react'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom' 
import queryString from 'query-string'
import FilterBox from '../FilterBox'
import PermissionsPane from '../configuration-pane/PermissionsPane'

const mapStateToProps = function(store) {
  return {
    resources: store.access.resources,
    subjects: store.access.subjects,
  }
}

const mapDispatchToProps = function(dispatch) {
  return {
  }
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps) (
class SubjectsTab extends React.PureComponent {

  constructor(props) {
    super(props)
    let query = queryString.parse(this.props.location.search)
    this.state = {
      selection: ('subject' in query ? [query.subject] : []),
      subjects: props.subjects.filter(e=> !e.startsWith('ServiceAccount:')),
    }
  }

  addSubject = (subject) => {
    if (this.state.selection.length === 0) {
      // let selection = this.state.selection.slice(0)
      // selection.push(subject)
      this.setState({
        selection: [subject],
      })
    }
  }

  removeSubject = (subject, index) => {
    // let selection = this.state.selection.slice(0)
    // selection.splice(index, 1)
    this.setState({
      selection: [],
    })
  }

  componentWillReceiveProps = (props) => {
    let query = queryString.parse(this.props.location.search)
    this.setState({
      subjects: props.subjects.filter(e=> !e.startsWith('ServiceAccount:')),
      selection: ('subject' in query ? [query.subject] : []),
    })
  }

  render() {

    const styles = {
      wrapper: {
        height: 'calc(100vh - 190px)',
        padding: 15,
        background: 'white',
      },
      permissions: {
        margin: 10,
      },
      noPerms: {
        height: `calc(100vh - 280px)`,
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        color: 'rgb(220,220,220)',
        fontSize: 40,
        textAlign: 'center',
        lineHeight: 'calc(100vh - 280px)',
        background: 'rgb(180, 180, 180)',
      }
    }

    let { props } = this
    let userName, groupName
    
    if (this.state.selection.length > 0) {
      let subj = this.state.selection[0]
      if (subj.startsWith('User:')) {
        userName = subj.substr(5)
      } else if (subj.startsWith('Group:')) {
        groupName = subj.substr(6)
      }
    }

    let permsView
    if (userName || groupName) {
      permsView = (<PermissionsPane
        resources={props.resources}
        userName={userName}
        groupName={groupName}
        style={styles.permissions}
        contentTop={props.contentTop + 48 + 78}
      />)
    } else {
      permsView = (
        <div style={styles.noPerms}>no user or group selected</div>
      )
    }

    return (
      <div style={styles.wrapper}>
        
        <FilterBox
          addFilter={this.addSubject} 
          removeFilter={this.removeSubject}
          filterNames={this.state.selection}
          possibleFilters={this.state.subjects}
          floatingLabelText={'user or group...'}
          maxFilters={1}
          removeFirstOnMax={true}
          />
        
          {permsView}

      </div>
    )
  }
}))
