import React from 'react'
import PropTypes from 'prop-types'
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'
import Header from '../components/Header'
import ThemeDefault from '../theme-default'
import Authenticated from './Authenticated'
import { withRouter } from 'react-router-dom'
import { connect } from 'react-redux'
import { menu } from '../routes'
import { requestKinds } from '../state/actions/apimodels'
import ReactHint from 'react-hint'
import 'react-hint/css/index.css'

const mapStateToProps = function(store) {
  return {
    kinds: store.apimodels.kinds,
  }
}

const mapDispatchToProps = function(dispatch, ownProps) {
  return {
    requestKinds: function() {
      dispatch(requestKinds())
    },
  }
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps) (
class App extends React.Component {

  static propTypes = {
    children: PropTypes.element,
    width: PropTypes.number
  }

  constructor(props) {
    super(props);
    this.state = {
      navDrawerOpen: true,
    }
    props.requestKinds()
  }

  handleChangeRequestNavDrawer() {
    this.setState({
      navDrawerOpen: !this.state.navDrawerOpen
    })
  }

  render() {

    const styles = {
      container: {
        margin: '80px 15px 20px 15px',
        overflowX: 'hidden',
        overflowY: 'hidden',
        padding: '0 10px 0 10px',
      },
      loginBtn: {
        float: 'right'
      },
    }

    return (
      <div>
        <MuiThemeProvider muiTheme={ThemeDefault}>
          <Authenticated>
              <ReactHint/>
              <Header menu={menu} location={this.props.location}/>
              <div style={styles.container}>
                {this.props.children}
              </div>
          </Authenticated>
        </MuiThemeProvider>
      </div>
    )
  }
}))
