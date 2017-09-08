import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { routerActions } from 'react-router-redux'
import { withRouter } from 'react-router-dom'
import { blueA700, grey100, grey300 } from 'material-ui/styles/colors'
import EditorPage from '../components/EditorPage'
// import { createResource } from '../state/actions/access'
import { requestTemplates } from '../state/actions/templates'
import { requestSwagger } from '../state/actions/apimodels'
import MenuItem from 'material-ui/MenuItem'
import FlatButton from 'material-ui/FlatButton'
import IconExpand from 'material-ui/svg-icons/navigation/more-vert'

import IconApply from 'material-ui/svg-icons/action/get-app'
import RaisedButton from 'material-ui/RaisedButton'
import Popover from 'material-ui/Popover'
import Menu from 'material-ui/Menu'
import * as SwaggerValidator from 'swagger-object-validator'
import { getErrorPosition } from '../utils/yaml-utils'
// import Validator from 'swagger-model-validator'
// import swaggerValidate from 'swagger-validate'
// import AJV from 'ajv'
import KubeKinds from '../kube-kinds'
import yaml from 'js-yaml'

import ace from 'brace'
const { Range } = ace.acequire('ace/range')

const mapStateToProps = function(store) {
  return {
    user: store.session.user,
    editor: store.access.editor,
    templates: store.templates.templatesByGroup.access,
    isFetching: store.access.isFetching,
    // modelsByAPIGroup: store.apimodels.modelsByAPIGroup,
    swagger: store.apimodels.swagger,
  }
}

const mapDispatchToProps = function(dispatch, ownProps) {
  return {
    cancelEditor: function() {
      dispatch(routerActions.goBack())
    },
    createResource: function(contents) {
      dispatch(ownProps.resourceCreator(contents))
    },
    requestTemplates: function() {
      dispatch(requestTemplates())
    },
    requestSwagger: function() {
      dispatch(requestSwagger())
    },
    resourceGroup: 'access',
  }
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps) (
class NewResource extends React.Component {

  static propTypes = {
    resourceCreator: PropTypes.func.isRequired,
    resourceGroup: PropTypes.string.isRequired,
  }

  static defaultProps = {
    resourceCreator: function(){},
  }

  constructor(props) {
    super(props);

    if (!props.templates && !props.isFetching) {
      props.requestTemplates()
    }

    let templateNames = this.getSortedTemplateNames(props.templates)
    let selectedTemplate = templateNames && templateNames[0]

    this.state = {
      editor: props.editor,
      templateMenuOpen: false,
      variablesMenuOpen: false,
      templateNames: templateNames || [],
      selectedTemplate,
      variables: [],
      errors: [],
      selectedVariable: '',
    }
    this.contents = ''
    if (props.swagger) {
      this.validator = new SwaggerValidator.Handler(props.swagger)
    }
    // this.validator = new Validator()
    // this.validator = new AJV({allErrors: true})
  }

  handleTouchTapTemplates = (event) => {
    // This prevents ghost click.
    event.preventDefault()
    this.setState({
      templateMenuOpen: true,
      templatesAnchorEl: event.currentTarget,
    })
  }

  handleTemplatesMenuSelection = (event, value) => {
    this.setState({
      selectedTemplate: value,
      templateMenuOpen: false,
    })
  }

  selectAllInstancesOfVariable = (variable) => {
    this.editor.focus()
    this.editor.selection.clearSelection()
    this.editor.findAll('${' + variable + '}',{
      backwards: false,
      wrap: true,
      caseSensitive: true,
      wholeWord: false,
      regExp: false,
    })
  }

  handleEditorChange = (contents) => {
    this.contents = contents
  }

  handleSelectionChange = (selection, event) => {

    if (!this.ignoreSelectionChange) {
      let s = selection.toOrientedRange()
      if (s.end.column > s.start.column && s.end.row === s.start.row) {
        let rawText = this.editor.session.getTextRange(s)
        if (!rawText.startsWith('${') && !rawText.endsWith('}')) {
          let range = new Range(
            s.start.row,
            s.start.column -2,
            s.end.row,
            s.end.column + 1)
          let text = this.editor.session.getTextRange(range)
          if (text.startsWith('${') && text.endsWith('}')) {
            this.lastRange = s
            let variable = text.slice(2,-1)
            this.ignoreSelectionChange = true
            this.selectAllInstancesOfVariable(variable)
            this.ignoreSelectionChange = false
          }
        }
      }
    }
  }

  handleCursorChange = (cursor) => {

  }

  handleRequestCloseTemplates = () => {
    this.setState({
      templateMenuOpen: false,
    })
  }

  handleEditorLoaded = (editor) => {
    this.editor = editor
    this.state.selectedVariable && this.selectAllInstancesOfVariable(this.state.selectedVariable)
  }

  handleEditorBlur = () => {

  }

  handleEditorApply = () => {
    this.validate(true).then(errors=> {
      if (errors.length) {
        this.setState({errors: errors})
      } else {
        this.props.createResource(this.contents)
      }
    })
  }

  validate = async (includeVariableRefs) => {
  
    let lines = (this.contents && this.contents.split(/\n/g)) || []
    let errors = []
    if (includeVariableRefs) {
      for (let i=0, len=lines.length; i < len; ++i) {
        let line = lines[i]
        let vars = this.detectVariables(line)
        if (vars.length) {
          errors.push({
            row: i,
            column: 0,
            html: this.getHtmlForTemplateVariableError(vars),
            type: 'error'
          })
        }
      }
    }

    if (this.validator) {
      let resource
      try {
        resource = yaml.safeLoad(this.contents)
        if ('kind' in resource) {
          let kinds = KubeKinds[this.props.resourceGroup]
          let kind = kinds[resource.kind]
          let modelGuess = `io.k8s.apimachinery.pkg.${kind.base.replace(/\//g,'.')}.${resource.kind}`
          
          // TODO: The model version exposed by the swagger spec does not always match
          // the api version exposed--this may be due to exposing multiple versions of
          // the same resource type...
          let actualModel = modelGuess
          let suffix = `.${resource.kind}`
          for (let type in this.props.swagger.definitions) {
            if (type.endsWith(suffix)) {
              actualModel = type
              break
            }
          }
  
          let result = await this.validator.validateModel(resource, actualModel)
          if (result.errors && result.errors.length) {
            for (let error of result.errors) {
              errors.push({
                row: getErrorPosition(lines, error) || 0,
                column: 0,
                html: this.getHtmlForError(error),
                type: 'error',
              })
            }
          }
        }
      } catch (e) {
        errors.push({row: e.mark.line, column: e.mark.column, text: e.reason, type: 'error'})
      }
    }
    return errors
  }

  getHtmlForError = (error) => {
    let path = ""
    let maxTrace = (error.errorType > 0 ? error.trace.length : error.trace.length - 1)
    for (let i=1; i < maxTrace; ++i) {
      let part = error.trace[i]
      if (!!path) {
        path += '.'
      }
      path += part.stepName
      if ('arrayPos' in part) {
        path += `[${part.arrayPos}]`
      }
    }
    if (error.errorType === 0) {
      return <div><span className="error yaml-ref">{error.trace[maxTrace].stepName} </span>is required in<span className="error yaml-ref"> {path} </span></div>
    } else if (error.errorType === 2) {
      return (
        <div>
          <span className="error yaml-ref">{path} </span>
          is of the wrong type; expected 
          <span className="error type-ref"> {error.typeShouldBe} </span>
          but found<span className="error type-ref"> {error.typeIs}</span>
        </div>
      )
    } else {
      return <div><span className="error yaml-ref">{path}</span> is not expected for this resource kind</div>
    }
  }

  getHtmlForTemplateVariableError = (vars) => {
    if (vars.length === 1) {
      return (
        <div>
          <span>template variable </span>
          <span className="error variable-ref">${vars[0]}</span>
          <span> needs a value</span>
        </div>
      )
    } else {
      return (
        <div>
          <span>template variables </span>
          {vars.map((v, index) => {
            let joiner = null
            if (index > 0) {
              joiner = <span>, </span>
            }
            return (joiner, <span className="error variable-ref">${v}</span>)
          })}
          <span> need values</span>
        </div>
      )
    }
  }

  getSortedTemplateNames = (templates) => {
    if (!!templates) {
      let templateNames = []
      for (let key in templates) {
        templateNames.push(key)
      }
      templateNames.sort(String.localeCompare)
      return templateNames
    }
  }

  detectVariables = (contents) => {
    let variables = {}
    let varPattern = /\${([A-Za-z0-9_-]+)}/g;
    let m = varPattern.exec(contents)
    while (m) {
      variables[m[1]] = true
      m = varPattern.exec(contents)
    }
    return Object.keys(variables)
  }

  onApplyTemplate = () => {
    let contents = this.props.templates[this.state.selectedTemplate]
    let variables = this.detectVariables(contents)
    this.contents = contents
    this.setState({
      variables: variables,
      selectedVariable: variables[0],
    })
  }

  componentWillReceiveProps = (props) => {
    if (!props.swagger) {
      props.requestSwagger()
    } else if (!this.validator) {
      this.validator = new SwaggerValidator.Handler(props.swagger)
    }

    if (!props.templates && !props.isFetching) {
      props.requestTemplates()
    } else if (props.templates) {
      let templateNames = this.getSortedTemplateNames(props.templates)
      let selectedTemplate = this.state.selectedTemplate || (templateNames && templateNames[0])
      this.setState({
        templateNames: (templateNames || []),
        selectedTemplate,
      })
    }
  }

  render() {

    const styles = {
      label: {
        paddingLeft: 4,
        lineHeight: '24px',
        marginRight: 5,
        fontSize: 14,
        fontWeight: 600,
        display: 'inline-block',
      },
      button: {
        minWidth: 160,
        textAlign: 'left', 
        textTransform: 'none',
        display: 'inline-block',
        marginLeft: 8,
      },
      applyButton: {
        textTransform: 'none',
        display: 'inline-block',
        marginLeft: 8,
      },
      buttonLabel: {
        textTransform: 'none',
        fontSize: 14,
        fontWeight: 600,
      },
      popoverMenu: {
        fontSize: 14,
        overflowX: 'hidden',
        paddingTop: 0,
        paddingBottom: 0,
      },
      popoverItems: {
        // color: grey300,
      }
    }

    let { templateNames, selectedTemplate } = this.state

    let menuItems = []
    for (let key of templateNames) {
      menuItems.push(<MenuItem key={key} value={key} primaryText={key}/>)
    }

    let title = (
      <div>
        <span style={styles.label}>template</span>
        <FlatButton
          fullWidth={false}
          labelStyle={styles.buttonLabel}
          style={styles.button}
          label={selectedTemplate}
          backgroundColor={grey300}
          onTouchTap={this.handleTouchTapTemplates.bind(this)}
          icon={<IconExpand style={{height: 18, width: 18}}/>}
        />
        <Popover
          onRequestClose={this.handleRequestCloseTemplates}
          anchorOrigin={{horizontal: 'left', vertical: 'bottom'}}
          targetOrigin={{horizontal: 'left', vertical: 'top'}}
          open={this.state.templateMenuOpen}
          anchorEl={this.state.templatesAnchorEl}
        >
          <Menu 
            multiple={false}
            value={selectedTemplate}
            desktop={true}
            selectedMenuItemStyle={{
              color: blueA700,
              fontWeight: 600,
              backgroundColor: grey100,
            }}
            style={styles.popoverMenu}
            onChange={this.handleTemplatesMenuSelection.bind(this)}
          >
            {menuItems}
          </Menu>
        </Popover>

        <RaisedButton
          label="Replace"
          icon={<IconApply/>}
          style={styles.applyButton}
          backgroundColor={grey100}
          onTouchTap={this.onApplyTemplate.bind(this)}
        />

      </div>
    )

    let additionalActions = []

    return (
      <EditorPage 
        open={!!this.props.user}
        errors={this.state.errors}
        onChange={this.handleEditorChange}
        onEditorApply={this.handleEditorApply.bind(this)}
        onEditorCancel={this.props.cancelEditor}
        onSelectionChange={this.handleSelectionChange.bind(this)}
        onCursorChange={this.handleCursorChange.bind(this)}
        onBlur={this.handleEditorBlur}
        additionalActions={additionalActions}
        title={title}
        titleStyle={{width: '100%', justifyContent: 'flex-start'}}
        contents={this.contents}
        onEditorLoaded={this.handleEditorLoaded}
      />
    )
  }
}))