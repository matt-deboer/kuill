import React from 'react'
import { connect } from 'react-redux'
import { initializeSession } from '../state/actions/session'
import LoginDialog from '../components/LoginDialog'
import { withRouter } from 'react-router-dom'

const mapStateToProps = function(store) {
  return {
    user: store.session.user,
    sessionInitialized: store.session.initialized,
    isFetching: store.session.isFetching,
  };
}

const mapDispatchToProps = function(dispatch, ownProps) {
  return {
    initializeSession: function(user, loginMethod) {
      dispatch(initializeSession(user, loginMethod))
    }
  }
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps) (
/** 
 * Authenticated is a gate/guard component which assures a current/valid
 * user session; if no such session is found, display a modal login dialog.
 */
class Authenticated extends React.Component {
  
  constructor(props) {
    super(props);
    this.state = {
      credsLink: null,
      loginLinks: [],
    }
    this.inputs = {}
  }

  componentDidMount = () => {
     console.log(`Authenticated::componentDidMount`)
    
    var that = this
    fetch("/auth/login_methods", {
      credentials: 'same-origin'
    }).then(resp => resp.json() 
    ).then(json => {
      var loginLinks = []
      var credsLink = null
      for (var i=0, len=json.login_methods.length; i < len; ++i) {
        var loginMethod = json.login_methods[i]
        if (loginMethod.post_creds) {
          credsLink = loginMethod
        } else {
          // Return to the current page afterward
          loginMethod.url += "?target=" + encodeURIComponent(""+window.location)
          if (loginMethod.url.startsWith("/")) {
            loginMethod.url = window.location.origin + loginMethod.url
          }
          loginLinks.push(loginMethod)
        }
      }
      that.setState({credsLink: credsLink, loginLinks: loginLinks})
    })
   
    if (!this.props.user && !this.fetching) {
      this.fetching = true
      fetch("/auth/user_info", {
        credentials: 'same-origin'
      }).then(resp => {
        if (!resp.ok) {
          this.fetching = false
          return {}
        } else {
          return resp.json() 
        }
      }).then(payload => {
        this.fetching = false
        this.props.initializeSession(payload.user)
      })
    }
  }

  handleLogin = () => {
    var that = this
    fetch(that.state.credsLink.url, {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
      },
      body: "username="+ encodeURIComponent(that.inputs.username.value) + 
        "&password=" + encodeURIComponent(that.inputs.password.value)
    }).then(resp => {
      if (resp.ok) {
        return resp.json().then( json => {
          this.props.initializeSession(json.user)
        })
      } else if (resp.status === 401) {
        this.setState({loginError: "username and/or password mismatch"})
      } else {
        this.setState({loginError: "authentication error occurred"})
        // TODO: set error snackbar...
      }
    })
  }

  updateInputs = (inputs) => {
    for (let input in inputs) {
      this.inputs[input] = inputs[input]
    }
  }

  render() {
    return (
      <div>
        <LoginDialog 
          open={this.props.sessionInitialized && !this.props.user} 
          credsLink={this.state.credsLink} 
          loginLinks={this.state.loginLinks}
          loginError={this.state.loginError}
          handleLogin={this.handleLogin}
          updateInputs={this.updateInputs}
          />

        {this.props.children}
      </div>
    )
  }
}))
