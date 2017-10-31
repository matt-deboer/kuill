import React from 'react'
import {Card, CardHeader, CardText} from 'material-ui/Card'
import {blueA100, blueA400, grey600} from 'material-ui/styles/colors'
import ResourceDetails from './ResourceDetails'
import sizeMe from 'react-sizeme'
import AnnotationsPanel from './AnnotationsPanel'
import DataPanel from './DataPanel'
import BasicDetailsPanel from './BasicDetailsPanel'
import PodDetailsPanel from './PodDetailsPanel'
import ContainerPanel from './ContainerPanel'
import PermissionsPane from './PermissionsPane'

const styles = {
  tabs: {
    backgroundColor: grey600,
  },
  tabsInkBar: {
    backgroundColor: blueA400,
    height: 3,
    marginTop: -4,
    borderTop: `1px ${blueA100} solid`,
  },
  cards: {
    margin: 10,
    boxShadow: 'none',
  },
  cardHeader: {
    borderBottom: '1px solid rgba(0,0,0,0.1)',
    padding: '0 0 5px 0',
    margin: '0 16px',
  },
  cardHeaderTitle: {
    color: 'rgba(0,0,0,0.4)',
    fontWeight: 600,
    fontSize: '18px',
  }
}

// use functional component style for representational components
export default sizeMe({ monitorHeight: true, monitorWidth: true }) (
class ConfigurationPane extends React.Component {
  
  constructor(props) {
    super(props)
    this.state = {
      annotationsOpen: false,
      annotationsText: '',
    }
  }

  handleAnnotationsTouchTap = (event) => {
    // This prevents ghost click.
    event.preventDefault();

    this.setState({
      annotationsOpen: true,
      annotationsAnchorEl: event.currentTarget,
      annotationsText: event.currentTarget.dataset.text,
    })
  }

  handleRequestCloseAnnotations = () => {
    this.setState({
      annotationsOpen: false,
      annotationsText: '',
    })
  }

  render() {
  
    let { props } = this
    let { resource, linkGenerator } = props
    let kind = ResourceDetails[resource.kind] || ResourceDetails['default']
    let { getData } = kind
    let data = (typeof getData === 'function' && getData(resource, linkGenerator)) || []

    let contents = null
    if (resource.kind === 'Pod') {
      contents = (
        <div className="row" style={{marginLeft: 0, marginRight: 0}}> 
          <div className="col-xs-12 col-sm-12 col-md-12 col-lg-12">
            <PodDetailsPanel resource={resource} linkGenerator={linkGenerator}/>
          </div>
          <div className="col-xs-12 col-sm-12 col-md-12 col-lg-12">
            <Card style={{...styles.cards}}>
              <CardHeader 
                style={styles.cardHeader}
                title={'containers'}
                titleStyle={styles.cardHeaderTitle}
              />
              <CardText>
                <div className="row" style={{marginLeft: 0, marginRight: 0, marginBottom: 10}}>
                  {resource.spec.containers.map((container, index) => {
                    return <div key={container.name} className="col-xs-12 col-sm-6 col-md-6 col-lg-4" style={{marginBottom: 15, paddingLeft: 0}}>
                      <ContainerPanel container={container} 
                        namespace={resource.metadata.namespace}
                        status={resource.status.containerStatuses[index]}
                        />
                    </div>
                  })}
                </div>
              </CardText>
            </Card>
          </div>
          <div className="col-xs-12 col-sm-12 col-md-12 col-lg-12">
            <AnnotationsPanel annotations={resource.metadata.annotations} />
          </div>
        </div>
      )
    } else {

      contents = (
        <div className="row" style={{marginLeft: 0, marginRight: 0}}> 
          <div className="col-xs-12 col-sm-12 col-md-12 col-lg-12">
              <BasicDetailsPanel data={data}/>
          </div>

          {resource.data &&
            <div className="col-xs-12 col-sm-12 col-md-12 col-lg-12">
              <DataPanel data={resource.data} decodeBase64={(resource.kind === 'Secret')} title={'data'}/>
            </div>
          }

          {resource.kind.endsWith('Role') &&
          <div className="col-xs-12 col-sm-12 col-md-12 col-lg-12" style={{marginTop: -50, marginBottom: 0}}>
            <Card style={{...styles.cards}}>
              <CardHeader 
                style={styles.cardHeader}
                title={'permissions'}
                titleStyle={styles.cardHeaderTitle}
              />
              <CardText>
                  <PermissionsPane style={{marginLeft: 0, marginRight: 0, marginTop: 0}} role={resource} />
              </CardText>
            </Card>
          </div>
          }

          {resource.kind.endsWith('RoleBinding') &&
          <div className="col-xs-12 col-sm-12 col-md-12 col-lg-12" style={{marginTop: -50, marginBottom: 0}}>
            <Card style={{...styles.cards}}>
              <CardHeader 
                style={styles.cardHeader}
                title={'permissions'}
                titleStyle={styles.cardHeaderTitle}
              />
              <CardText>
                  <PermissionsPane style={{marginLeft: 0, marginRight: 0, marginTop: 0}} binding={resource} />
              </CardText>
            </Card>
          </div>
          }

          <div className="col-xs-12 col-sm-12 col-md-12 col-lg-12">
            <AnnotationsPanel annotations={resource.metadata.annotations} />
          </div>
        </div>
      )
    }
    return <div className={'configuration-pane'} style={{
      height: `calc(100vh - ${props.contentTop + 30}px)`,
      overflow: 'auto',
    }}>{contents}</div>
  }

})
