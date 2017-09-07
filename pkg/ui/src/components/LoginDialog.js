import React from 'react'
import TextField from 'material-ui/TextField'
import Dialog from 'material-ui/Dialog'
import RaisedButton from 'material-ui/RaisedButton'
import LockIcon from 'material-ui/svg-icons/action/lock'
import Avatar from 'material-ui/Avatar'
import { blueA400 } from 'material-ui/styles/colors'
// import Divider from 'material-ui/Divider'
import Paper from 'material-ui/Paper'
// import ReactCSSTransitionGroup from 'react-addons-css-transition-group'
import './LoginDialog.css'

const styles = {
  loginBtn: {
    position: 'relative',
    float: 'right',
  },
  overlay: {
    backgroundImage: `url(${require('../images/kubernetes-logo.svg')})`,
    backgroundRepeat: 'no-repeat',
    backgroundColor: '#326ce5',
    backgroundPosition: 'center center',
    backgroundSize: '150%',
  },
  icon: {
    background: 'transparent',
    width: 28,
    height: 28,
    borderRadius: 0,
  }, 
  backgroundRight: {
    backgroundColor: '#326ce5',
    position: 'fixed',
    top: 0,
    right: 0,
    width: '70%',
    height: '100%',
    zIndex: 2000,
  }

}

function getIcon(loginMethod) {
  if (!!loginMethod.icon) {
    return <Avatar src={loginMethod.icon} style={styles.icon}/>
  } 
  switch (loginMethod.type) {
    case 'oidc':
      return <Avatar src={require('../images/oidc.png')} style={styles.icon}/>
    case 'pwfile':
      return <Avatar src={require('../images/pwfile.svg')} style={styles.icon}/>
    case 'saml':
      return <Avatar src={require('../images/saml.png')} style={styles.icon}/>
    default:
      console.error(`LoginDialog::getIcon: unexpected loginMethod: ${JSON.stringify(loginMethod)}`)
  }
}

export default function LoginDialog(props) {

  let login = null
  if (props.open) {

    let credsLink = ''
    if (props.credsLink) {
      credsLink = (
      <div>
        {props.loginLinks.length > 0 && <div style={{paddingTop: 20, paddingBottom: 20}}>or</div>}
        
        <Paper style={{padding: 10, marginTop: 10, overflow: 'hidden'}}>
          <div style={{
            display: 'table',
            }}>{getIcon(props.credsLink)}<span style={{paddingLeft: 20, verticalAlign: 'middle', display: 'table-cell'}}>Login with {props.credsLink.desc || props.credsLink.name}</span></div>
          <TextField
            ref={(ref) => { props.updateInputs({username: (ref && ref.input)}); }}
            errorText={props.loginError}
            onKeyPress={(e) => (e.key === 'Enter') && props.handleLogin()}
            hintText="Username" floatingLabelText="Username" fullWidth={true} />
          <TextField
            ref={(ref) => { props.updateInputs({password: (ref && ref.input)}); }}
            errorText={props.loginError}
            onKeyPress={(e) => (e.key === 'Enter') && props.handleLogin()}
            hintText="Password" floatingLabelText="Password" fullWidth={true} type="password" />
          <RaisedButton 
            label="Login"
            primary={true}
            style={styles.loginBtn}
            onTouchTap={props.handleLogin}
            />
          </Paper>
      </div>)
    }

    login = (
      <div key={'login-dialog'} className={'login-background'} >

        <Dialog className="login" title={
            <div className="title">
              <div>Authentication Required</div>
              <div style={{
                position: 'absolute',
                top: 10,
                right: 20,
              }}><LockIcon style={{
                width: 48,
                height: 48,
              }}/></div>
            </div>
          }
          titleStyle={{
            color: 'rgba(180,180,180)',
            borderBottom: `4px solid ${blueA400}`, 
            background: 'rgb(66,66,66)',
            fill: 'rgba(180,180,180)',
          }}
          modal={true}
          open={props.open}
          contentStyle={{
            maxWidth: 350,
          }}
          bodyStyle={{
            //backgroundColor: 'rgba(20, 49, 127, 0.15)',
            backgroundColor: 'rgba(0,0,0,0.2)',
            padding: 24,
          }}
          >
          <form>
            <div style={styles.buttonsDiv}>
            {
              props.loginLinks.map(loginMethod => 
                <RaisedButton
                  key={loginMethod.id}
                  href={loginMethod.url}
                  onTouchTap={() => console.log(`clicked ${loginMethod.id}`)}
                  primary={true}
                  fullWidth={true}
                  icon={getIcon(loginMethod)}
                  style={{marginBottom: 10}}
                  labelStyle={{
                    textTransform: 'none',
                    fontSize: 15,
                  }}
                  label={`login with ${loginMethod.desc || loginMethod.name}`}
                />)
            }
            </div>
            {credsLink}
          </form>
        </Dialog>
      </div>
    )
  }

  return login
}
