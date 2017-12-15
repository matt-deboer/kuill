import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'
import { white, blueA700, grey100, grey300, grey700, grey800 } from 'material-ui/styles/colors'
import EditorPage from '../components/EditorPage'
import { requestTemplates } from '../state/actions/templates'
import { requestSwagger } from '../state/actions/apimodels'
import { requestResources } from '../state/actions/resources'
import { tryGoBack } from '../state/actions/location'
import MenuItem from 'material-ui/MenuItem'
import FlatButton from 'material-ui/FlatButton'
import IconExpand from 'material-ui/svg-icons/navigation/more-vert'
import IconApply from 'material-ui/svg-icons/action/get-app'
import RaisedButton from 'material-ui/RaisedButton'
import Popover from 'material-ui/Popover'
import Menu from 'material-ui/Menu'

import ace from 'brace'
const { Range } = ace.acequire('ace/range')

const mapStateToProps = function(store) {
  return {
    user: store.session.user,
    templatesByGroup: store.templates.templatesByGroup,
    isFetching: store.templates.isFetching,
    swagger: store.apimodels.swagger,
    previousLocation: store.location.previous,
    currentLocation: store.location.current,
  }
}

const mapDispatchToProps = function(dispatch, ownProps) {
  return {
    cancelEditor: function() {
      dispatch(tryGoBack())
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
    requestResources: function() {
      dispatch(requestResources())
    },
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

    props.requestTemplates()
    props.requestSwagger()
    props.requestResources()

    let templateNames = this.getSortedTemplateNames(props.templatesByGroup[props.resourceGroup])
    let selectedTemplate = templateNames && templateNames[0]

    this.state = {
      templateMenuOpen: false,
      variablesMenuOpen: false,
      templateNames: templateNames || [],
      selectedTemplate,
      variables: [],
      errors: [],
      selectedVariable: '',
    }
    this.contents = ''
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
    if (this.state.selectedVariable) {
      this.selectAllInstancesOfVariable(this.state.selectedVariable)
      this.setState({
        selectedVariable: null,
      })
    }
  }

  handleEditorBlur = () => {
    
  }

  handleEditorApply = () => {
    this.props.createResource(this.contents)
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
    let contents = this.props.templatesByGroup[this.props.resourceGroup][this.state.selectedTemplate]
    this.editor && this.editor.setValue(contents)
    let variables = this.detectVariables(contents)
    this.contents = contents
    this.setState({
      variables: variables,
      selectedVariable: variables[0],
    })
  }

  componentWillReceiveProps = (props) => {
    
    if (!props.templatesByGroup && !props.isFetching) {
      props.requestTemplates()
    } else if (props.templatesByGroup) {
      let templateNames = this.getSortedTemplateNames(props.templatesByGroup[props.resourceGroup])
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
        // fontWeight: 600,
        display: 'inline-block',
        color: white,
      },
      button: {
        minWidth: 160,
        textAlign: 'left', 
        textTransform: 'none',
        display: 'inline-block',
        marginLeft: 8,
        color: grey300,
      },
      applyButton: {
        textTransform: 'none',
        display: 'inline-block',
        marginLeft: 8,
        color: white,
      },
      buttonLabel: {
        textTransform: 'none',
        fontSize: 14,
        fontWeight: 600,
        color: grey300,
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
          hoverColor={grey700}
          backgroundColor={grey800}
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
          icon={<IconApply style={{fill: grey300}}/>}
          style={styles.applyButton}
          labelColor={grey300}
          backgroundColor={grey800}
          onTouchTap={this.onApplyTemplate.bind(this)}
        />

      </div>
    )

    let additionalActions = []

    return (
        <EditorPage 
          open={!!this.props.user}
          mode={'edit'}
          resourceGroup={this.props.resourceGroup}
          detectVariables={this.detectVariables}
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
          ref={(ref) => {
            if (!!ref) {
              this.editorPage = ref
            }
          }}
        />
    )
  }
}))