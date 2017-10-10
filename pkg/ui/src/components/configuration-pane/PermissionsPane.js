import React from 'react'
import PropTypes from 'prop-types'
import {
  Table,
  TableBody,
  TableRow,
  TableRowColumn,
  TableHeader,
  TableHeaderColumn,
} from 'material-ui/Table'
import sizeMe from 'react-sizeme'

import FilterChip from '../FilterChip'
import { connect } from 'react-redux'
import { linkForResource } from '../../routes'
import { routerActions } from 'react-router-redux'
import './PodTemplatePane.css'

const mapStateToProps = function(store) {
  return {
    resources: store.access.resources,
  }
}

const mapDispatchToProps = function(dispatch, ownProps) {
  return {
    viewResource: function(resource, view='config') {
      dispatch(routerActions.push(linkForResource(resource,view)))
    },
    viewPermissions: function(subject) {
      if (subject.kind === 'ServiceAccount') {
        dispatch(routerActions.push(linkForResource(subject,'config')))
      } else {
        dispatch(routerActions.push(`/access?view=subjects&subject=${subject.kind}:${subject.name}`))
      }
    },
  } 
}

const styles = {
  verbs: {
    width: 60,
    height: 28,
    padding: '4px 4px 4px 15px',
  },
  resources: {
    width: 'auto',
    height: 28,
    padding: '4px 4px 4px 15px',
  },
  namespaces: {
    width: 220,
    height: 28,
    padding: '4px 4px 4px 10px',
  },
  binding: {
    height: 38,
    background: 'rgb(66, 77, 99)',
    left: 0,
    top: 0,
    padding: 10,
    lineHeight: '38px',
    fontSize: 14,
    fontWeight: 500,
  },
  bindingLabel: {
    color: 'rgb(220,220,220)', 
    paddingRight: 10,
    paddingLeft: 10,
    float: 'left',
  },
  wrapper: {
    // padding: 10,
    // border: '1px solid rgba(88,88,88,0.6)',
  },
  noPerms: {
    height: `calc(100vh - 369px)`,
    left: 0,
    right: 0,
    width: '100%',
    marginLeft: 10,
    marginRight: 10,
    marginBottom: 30,
    background: 'rgba(0, 0, 0, 0.05)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    color: 'rgba(0, 0, 0, 0.3)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: `calc(100vh - 369px)`,
  }
}

export default sizeMe({ monitorHeight: true, monitorWidth: true }) (
connect(mapStateToProps, mapDispatchToProps) (
class PermissionsPane extends React.Component {
  
  static propTypes = {
    /**
     * The name of a user for which to display permissions
     */
    userName: PropTypes.string,
    /**
     * The name of a group for which to display permissions; ignored when
     * 'userName' is specified
     */
    groupName: PropTypes.string,
    /**
     * A ServiceAccount object for which to display permissions; ignored when
     * either 'userName' or 'groupName' is specified
     */
    serviceAccount: PropTypes.object,
    /**
     * The Y position of the top of this component's content
     */
    contentTop: PropTypes.number,
  }

  static defaultProps = {
  }

  handleTouchTap = () => {

  }

  getPermissions = () => {
    let permissions = []
    let { resources, serviceAccount, userName, groupName, binding, role } = this.props
    let targetSubject = serviceAccount
    if (!!userName) {
      targetSubject = {
        kind: 'User',
        name: userName,
      }
    } else if (!!groupName) {
      targetSubject= {
        kind: 'Group',
        name: groupName,
      }
    }
    if (!!targetSubject) {
      for (let key in resources) {
        let r = resources[key]
        if (bindsToSubject(r, targetSubject)) {
          let perm = {
            binding: {
              namespace: r.metadata.namespace,
              kind: r.kind,
              name: r.metadata.name
            }, 
            role: {
              kind: r.roleRef.kind,
              namespace: r.roleRef.namespace,
              name: r.roleRef.name,
            },
            rules: []
          }
          let roleKey = `${r.roleRef.kind}/${r.roleRef.namespace || '~'}/${r.roleRef.name}`
          let role = resources[roleKey]
          if (role) {
            for (let rule of role.rules) {
              perm.rules.push(convertRule(rule, (r.roleRef.namespace || r.metadata.namespace)))
            }
          }
          permissions.push(perm)
        }
      }
    } else if (!!binding) {
      let perm = {
        role: {
          kind: binding.roleRef.kind,
          namespace: binding.roleRef.namespace,
          name: binding.roleRef.name,
        },
        subjects: binding.subjects,
        rules: []
      }
      let roleKey = `${binding.roleRef.kind}/${binding.roleRef.namespace || '~'}/${binding.roleRef.name}`
      let role = resources[roleKey]
      if (role) {
        for (let rule of role.rules) {
          perm.rules.push(convertRule(rule, (binding.roleRef.namespace || binding.metadata.namespace)))
        }
      }
      permissions.push(perm)

    } else if (!!role) {
      let perm = {rules: []}
      for (let rule of role.rules) {
        perm.rules.push(convertRule(rule, role.metadata.namespace))
      }
      permissions.push(perm)
    }
    return permissions
  }


  renderRules = (rules, height) => {

    let extraProps = {}
    if (!!height) {
      extraProps.height = height
    }

    return (
      <Table selectable={false} style={{ border: '0', margin: 0}}
        wrapperStyle={{overflow: 'hidden', width: 'calc(100vw - 100px)', }}
        {...extraProps}
        >
        <TableHeader adjustForCheckbox={false} displaySelectAll={false}>
          <TableRow displayBorder={true} style={{height: 28}}>
            <TableHeaderColumn style={{...styles.verbs, paddingLeft: 4}}>Verbs</TableHeaderColumn>
            <TableHeaderColumn style={{...styles.resources, paddingLeft: 4}}>Resources</TableHeaderColumn>
            <TableHeaderColumn style={{...styles.namespaces, paddingLeft: 4}}>Namespaces</TableHeaderColumn>
          </TableRow>
        </TableHeader>
        <TableBody displayRowCheckbox={false}>
          {rules.map((rule, ruleIndex) =>
            <TableRow key={`${ruleIndex}`} displayBorder={true} style={{height: 28}}>
              <TableRowColumn style={styles.verbs}>
              {rule.verbs.map(v=><div key={v} >{v}</div>)}
              </TableRowColumn>
              <TableRowColumn style={styles.resources}>
                {rule.resources.map(r=><div key={r}>{r}</div>)}
              </TableRowColumn>
              <TableRowColumn style={styles.namespaces}>
                {rule.namespaces && rule.namespaces.map(ns=><div key={ns}>{ns}</div>)}
              </TableRowColumn>
            </TableRow>
          )}
        </TableBody>
      </Table>
    )
  }

  renderPermissions = (permission, height) => {
    let key = ((permission.binding && permission.binding.name) || 
               (permission.role && permission.role.name) ||
               'empty')
    return (
      <div key={key} style={styles.wrapper}>
        {(permission.binding || permission.role) &&
        <div style={styles.binding}>
          {permission.binding &&
          [<span key={'binding-label'} style={styles.bindingLabel}>binding:</span>,
          <FilterChip key={'binding'} prefix={permission.binding.kind} 
            suffix={(permission.binding.namespace ? permission.binding.namespace + '/' : '') + permission.binding.name } 
            onTouchTap={this.props.viewResource.bind(this, permission.binding, 'config')}
            />
          ]}
          {permission.role && 
          [<span key={'role-label'} style={styles.bindingLabel}>role:</span>,
          <FilterChip key={'role'} prefix={permission.role.kind} 
            suffix={(permission.role.namespace ? permission.role.namespace + '/' : '') + permission.role.name } 
            onTouchTap={this.props.viewResource.bind(this, permission.role, 'config')}
            />
          ]}
          {permission.subjects && 
          [<span key={'subjects-label'} style={styles.bindingLabel}>subjects:</span>,
           ...permission.subjects.map(s=><FilterChip key={`${s.kind}/${s.namespace}/${s.name}`} prefix={s.kind} 
            suffix={(s.namespace ? s.namespace + '/' : '') + s.name } 
            onTouchTap={this.props.viewPermissions.bind(this, s)}
            />)
          ]}
        </div>
        }
        {this.renderRules(permission.rules, height)}
      </div>
    )
  }

  render() {
  
    let { props } = this
    let permissions = this.getPermissions()
    let height = null
    let overflowY = 'auto'
    let rendered = null
    if (permissions.length === 0) {
      rendered = (<div style={styles.noPerms}>{'< none >'}</div>)
    } else {
      if (permissions.length === 1) {
        height = `calc(100vh - ${props.contentTop + 149}px)`
        overflowY = 'hidden'
      }
      rendered = permissions.map(p=>this.renderPermissions(p, height))
    }

    return (
      <div style={{
        overflowX: 'hidden',
        overflowY: overflowY,
        marginRight: 24,
        marginLeft: 24,
        marginTop: 24,
        ...props.style}}
        className="row"
        >
        {rendered}
      </div>
    )
  }

}))

function bindsToSubject(r, subject) {
  if (!!r.subjects) {
    for (let s of r.subjects) {
      if ((s.kind === subject.kind) && 
          ('metadata' in subject ? (s.name === subject.metadata.name) : (s.name === subject.name)) &&
          (!('namespace' in s) || (s.namespace === subject.metadata.namespace))
        ) {
        return true
      }
    }
  }
}

function convertRule(rule, namespace) {
  if ('nonResourceURLs' in rule) {
    return {
      verbs: rule.verbs,
      resources: (rule.nonResourceURLs.length === 1 && rule.nonResourceURLs[0] === '*' ? 
        ['*  ( non-resource URLs )'] : 
        rule.nonResourceURLs),
      namespaces: ['n/a ( non-resource URLs )'],
    }
  } else {
    return {
      verbs: rule.verbs,
      resources: rule.resources,
      apiGroups: rule.apiGroups,
      namespaces: [(namespace || '*')],
    }
  }
}