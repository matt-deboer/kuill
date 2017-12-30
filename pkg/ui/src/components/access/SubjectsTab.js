import React from 'react'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'
import { routerActions } from 'react-router-redux'
import queryString from 'query-string'
import FilterBox from '../FilterBox'
import PermissionsPane from '../configuration-pane/PermissionsPane'

const mapStateToProps = function(store) {
  return {
    resources: store.resources.resources,
    autocomplete: store.resources.autocomplete.subjects,
  }
}

const mapDispatchToProps = function(dispatch, ownProps) {
  return {
    setSubject: function(subject, index=-1) {
      
      let { location } = ownProps

      let search = queryString.parse(location.search)
      if (index > -1) {
        delete search.subject
      } else {
        search.subject = subject
      }

      dispatch(routerActions.push({
        pathname: location.pathname,
        search: queryString.stringify(search),
        hash: location.hash,
      }))
    }
  }
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps) (
class SubjectsTab extends React.PureComponent {

  constructor(props) {
    super(props)
    let query = queryString.parse(this.props.location.search)
    this.state = {
      selection: ('subject' in query ? [query.subject] : []),
      subjects: this.filterServiceAccounts(props.autocomplete),
    }
  }

  componentWillReceiveProps = (props) => {
    let query = queryString.parse(props.location.search)
    this.setState({
      subjects: this.filterServiceAccounts(props.autocomplete),
      selection: ('subject' in query ? [query.subject] : []),
    })
  }

  shouldComponentUpdate = (props, state) => {
    let shouldUpdate = (this.state.selection.length !== state.selection.length)
      || (this.state.selection[0] !== state.selection[0])
      || (Object.keys(this.state.subjects).length !== Object.keys(state.subjects).length)
      || (this.props.location.search !== props.location.search)
    return shouldUpdate
  }

  filterServiceAccounts = (subjects) => {
    let filtered = {}
    for (let s in subjects) {
      if (!s.startsWith('ServiceAccount:')) {
        filtered[s] = true
      }
    }
    return filtered
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
        className={'permissions ' + (userName ? 'user' : 'group')}
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
          className={'subjects'}
          addFilter={this.props.setSubject} 
          removeFilter={this.props.setSubject}
          filterNames={this.state.selection}
          autocomplete={this.state.subjects}
          floatingLabelText={'user or group...'}
          maxFilters={1}
          removeFirstOnMax={true}
          />
        
          {permsView}

      </div>
    )
  }
}))
