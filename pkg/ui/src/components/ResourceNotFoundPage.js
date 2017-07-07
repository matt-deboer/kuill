import React from 'react'
import PropTypes from 'prop-types'
import {blueA400, grey200, grey600, grey700, redA700} from 'material-ui/styles/colors'
import { connect } from 'react-redux'
import { routerActions } from 'react-router-redux'
import {Card, CardHeader, CardText} from 'material-ui/Card'
import FilterChip from './FilterChip'
import { withRouter } from 'react-router-dom'
import RaisedButton from 'material-ui/RaisedButton'
import KubeKinds from '../kube-kinds'
import KindAbbreviation from './KindAbbreviation'
import IconAdd from 'material-ui/svg-icons/content/add'
import IconError from 'material-ui/svg-icons/alert/error'
import Avatar from 'material-ui/Avatar'
import Chip from 'material-ui/Chip'

const mapStateToProps = function(store) {
  return {}
}

const mapDispatchToProps = function(dispatch, ownProps) {
  return {
    createResource: function(namespace, kind, name) {
      dispatch(routerActions.push(`/workloads/new?kind=${kind}&namespace=${namespace}&name=${name}`))
    },
  }
}

const styles = {
  cards: {
    margin: 10,
    boxShadow: 'none',
  },
  cardHeader: {
    borderBottom: '1px solid rgba(0,0,0,0.1)',
  },
  cardHeaderTitle: {
    color: 'rgba(0,0,0,0.4)',
    fontWeight: 600,
    fontStyle: 'italic',
    fontSize: '18px',
  }
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps) (
class ResourceNotFoundPage extends React.Component {

  static propTypes = {
    kind: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    namespace: PropTypes.string.isRequired,
    resourceGroup: PropTypes.string.isRequired,
  }

  constructor(props) {
    super(props);
    this.kubeKind = KubeKinds[props.resourceGroup][props.kind]
  }

  render() {

    let { resourceGroup, kind, namespace, name } = this.props

    return (
      <div>
        <Card className="resource-info" style={{margin: 5}} >
          <CardHeader
            title={<div>{name}<Chip backgroundColor={redA700} labelColor={grey200} style={{display: 'inline-block', margin: '4px 4px 4px 20px'}}>
              does not exist
            </Chip></div>}
            subtitle={
              <div style={{padding: 20}}>
                <div>
                  <FilterChip prefixStyle={{fontStyle: 'italic', color: grey700}} prefix={'namespace'} suffix={namespace} />
                  <FilterChip prefixStyle={{fontStyle: 'italic', color: grey700}} prefix={'kind'} suffix={kind} />
                </div>
              </div>
            }
            avatar={<KindAbbreviation text={this.kubeKind.abbrev} color={this.kubeKind.color}/>}
            titleStyle={{fontSize: '24px', fontWeight: 600, paddingLeft: 10}}
          >
            <RaisedButton
              label="Create it"
              labelPosition="before"
              onTouchTap={this.props.createResource}
              icon={<IconAdd/>}
              style={{position: 'absolute', right: 20, top: 20}}
              primary={true}
            />
          </CardHeader>
          <CardText style={{
              borderTop: `4px solid ${blueA400}`, 
              height: `${window.innerHeight - 275}px`,
              backgroundColor: grey700,
              color: grey600,
              fontWeight: 600,
              textShadow: `rgb(158, 158, 158) -1px -1px 0px, rgb(158, 158, 158) 1px -1px 0px, rgb(158, 158, 158) -1px 1px 0px, rgb(158, 158, 158) 1px 1px 0px`,
              fontSize: '30vw',
              lineHeight: `${window.innerHeight - 260}px`,
              textAlign: 'center',
              marginBottom: -8,
            }}>404<span style={{fontSize: '20vw'}}>'d!!</span>
          </CardText>
        </Card>
      </div>
    )
  }
}))
