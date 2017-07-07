import React from 'react'
import AppBar from 'material-ui/AppBar'
import {Toolbar, ToolbarGroup, ToolbarSeparator} from 'material-ui/Toolbar'
import MenuItem from 'material-ui/MenuItem'
import DropDownMenu from 'material-ui/DropDownMenu'
import {grey200, grey500, grey800, grey900, blueA200, red800} from 'material-ui/styles/colors'
import {spacing, typography} from 'material-ui/styles'
import {Link} from 'react-router-dom'
import { connect } from 'react-redux'
import Avatar from 'react-avatar'
import IconError from 'material-ui/svg-icons/content/report'
import {Card, CardActions, CardHeader, CardText} from 'material-ui/Card'
import FlatButton from 'material-ui/FlatButton'

const mapStateToProps = function(store) {
  return {
    user: store.session.user,
    errors: store.errors.errors,
  }
}
export default connect(mapStateToProps) (
class ErrorBar extends React.Component {

  // constructor(props) {
  //   super(props)
  // }

  handleChange = (event, index, value) => this.setState({value})

  render() {

    const styles = {
      appBar: {
        position: 'fixed',
        top: 57,
        // overflow: 'hidden',
        // maxHeight: 57,
        width: '100%',
        paddingLeft: 15,
        paddingRight: 15,
        backgroundColor: red800,
      },
      dropdownMenu: {
        overflowX: 'hidden',
        paddingTop: 0,
        paddingBottom: 0,
        backgroundColor: grey900,
      },
      dropdownMenuItems: {
        fontSize: 18,
        padding: 8,
        color: grey200,
        fontWeight: 600,
      },
      dropdownSelectedItem: {
        fontSize: 18,
        padding: 8,
        color: '#326DE6',
        fontWeight: 600,
      },
      menu: {
        backgroundColor: 'transparent',
        color: grey200,
        fontSize: 18,
        fontWeight: 600,
      },
      menuButton: {
        marginLeft: 0
      },
      iconsRightContainer: {
        marginLeft: 20
      },
      logo: {
        cursor: 'pointer',
        fontSize: 22,
        color: typography.textFullWhite,
        lineHeight: `${spacing.desktopKeylineIncrement}px`,
        backgroundColor: grey800,
        backgroundImage: 'url(' + require('../images/kubernetes-logo.svg') + ')',
        backgroundSize: '36px 36px',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'left center',
        paddingLeft: 50,
        height: 56,
        overflow: 'none',
      },
      chip: {
        // display: 'inline-block'
      },
      avatar: {
        marginLeft: -20,
        marginRight: 10,
      },
    }

    let { props } = this

    let errorCards = []
    for (let err of props.errors) {
      errorCards.push(
        <Card key={err.id}>
          <CardHeader
            title={err.message}
          />
          {!!err.retry &&
            <CardActions>
              <FlatButton label={err.retry.text} onTouchTap={err.retry.action} />
            </CardActions>
          }
        </Card>
      )
    }

    return (
      <Card style={styles.appBar}>
        <CardHeader
          avatar={<IconError style={{width: 48, height: 48, color: 'rgba(0,0,0,0.25)'}}/>}
          title="Without Avatar"
          actAsExpander={true}
          showExpandableButton={true}
        />
        <CardText expandable={true}>
          {errorCards}
        </CardText>
      </Card>
    )
  }
})
