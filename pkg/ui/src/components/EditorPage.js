import React from 'react'
import PropTypes from 'prop-types'

import FlatButton from 'material-ui/FlatButton'
import RaisedButton from 'material-ui/RaisedButton'
import Dialog from 'material-ui/Dialog'
import { routerActions } from 'react-router-redux'
import { connect } from 'react-redux'
import { grey500 } from 'material-ui/styles/colors'

import { requestSwagger } from '../state/actions/apimodels'
import ManifestValidator from '../utils/ManifestValidator'

import AceEditor from 'react-ace'
import 'brace/mode/yaml'
import 'brace/mode/json'
import 'brace/theme/iplastic'
import 'brace/ext/language_tools'
import ace from 'brace'
import './EditorTheme'
import './EditorPage.css'

const langTools = ace.acequire('ace/ext/language_tools')

var completer = {
  getCompletions: function(editor, session, pos, prefix, callback) {
    callback(null, [])
  }
}
langTools.addCompleter(completer);

const mapStateToProps = function(store) {
  return {
    swagger: store.apimodels.swagger,
  }
}

const mapDispatchToProps = function(dispatch, ownProps) {
  return {
    activateEditor: function() {
      let { location } = ownProps
      dispatch(routerActions.push({
        pathname: location.pathname,
        search: '?view=edit',
        hash: location.hash,
      }))
    },
    requestSwagger: function() {
      dispatch(requestSwagger())
    },
  }
}

const styles = {
  dialogOverlay: {
    background: 'rgba(0,0,0,0.3)'
  }
}

// use functional component style for representational components
export default connect(mapStateToProps, mapDispatchToProps) (
class EditorPage extends React.Component {

  static propTypes = {
    /**
     * the initial contents of the editor; use the 'setContents' method
     * to change the contents of an already-initialized editor
     */
    contents: PropTypes.string,
  }

  static defaultProps = {
    contents: '',
  }

  constructor(props) {
    super(props)
    this.updateErrorTooltips = this.updateErrorTooltips.bind(this)
    this.displayErrors = this.displayErrors.bind(this)
    props.requestSwagger()
    this.state = {
      errors: []
    }
  }

  componentDidMount = () => {
    if (this.props.open && this.props.location) {
      this.props.activateEditor()
    }
    this.contents = this.props.contents
  }

  setContents = (contents) => {
    this.contents = contents
    this.editor.setValue(contents)
  }

  componentDidUpdate = () => {
    // if (!this.props.open) {
      // this.props.deactivateEditor()
    // }
  }

  componentWillReceiveProps = (props) => {
    if (props.swagger && !this.validator) {
      this.validator = new ManifestValidator(props.swagger, props.resourceGroup, props.detectVariables, props.resource)
    }
    
    if (!this.contents) {
      this.contents = props.contents
    }
    this.displayErrors()
  }

  validateOnChange = () => {
    this.validator && this.validator.validate(this.contents).then(errors=> {
      this.setState({errors: errors})
    })
  }

  displayErrors = () => {
    if (this.editor && this.contents) {
      this.editor.getSession().setAnnotations(this.state.errors)
      if (this.state.errors.length) {
        window.setTimeout(this.updateErrorTooltips, 0)
      }
    }
  }

  updateErrorTooltips = () => {
    let errorsByRow = {}
    for (let e of this.state.errors) {
      let i = `${e.row+1}`
      errorsByRow[i] = errorsByRow[e.row] || []
      errorsByRow[i].push(e.text)
    }
    let errDivs = document.getElementsByClassName('ace_gutter-cell ace_error')
    for (let div of errDivs) {
      div.dataset.rh = `#errors-for-row-${div.innerText}`
      div.dataset.rhAt = 'top'
      div.dataset.rhCls = 'error'
    }
  }

  onSelectionChange = (selection, event) => {
    this.props.onSelectionChange && this.props.onSelectionChange(selection, event)
  }

  onCursorChange = (cursor) => {
    this.props.onCursorChange && this.props.onCursorChange(cursor)
  }

  onChange = (contents) => {
    this.contents = contents
    this.validateOnChange()
    this.props.onChange && this.props.onChange(contents)
  }

  onEditorLoaded = (editor) => {
    this.props.onEditorLoaded && this.props.onEditorLoaded(editor)
  }

  applyChanges = () => {
    this.validator && this.validator.validate(this.contents, true)
    .then(errors=> {
      if (errors.length) {
        this.setState({errors: errors})
      } else {
        this.props.onEditorApply(this.contents)
      }
    })
  }

  render() {
    let { props } = this
    let additionalActions = props.additionalActions || []
    const actions = [
      ...additionalActions,
      <FlatButton
        label="Cancel"
        labelStyle={{color: 'rgb(220,220,220)'}}
        hoverColor={grey500}
        onTouchTap={props.onEditorCancel}
      />,
      <RaisedButton
        label="Apply"
        primary={true}
        onTouchTap={this.applyChanges.bind(this)}
      />,
    ]

    let errorsByRow = {}
    for (let e of this.state.errors) {
      let i = `${e.row+1}`
      errorsByRow[i] = errorsByRow[e.row] || []
      errorsByRow[i].push(e.html || e.text)
    }
    let errorTexts = []
    for (let row in errorsByRow) {
      errorTexts.push(
        <div id={`errors-for-row-${row}`} key={`errors-for-row-${row}`} style={{display: 'none'}}>
          {errorsByRow[row]}
        </div>)
    }  

    return (
      <Dialog
        className={'editor-dialog'}
        contentClassName={'editor-dialog-content'}
        actions={actions}
        title={props.title}
        titleStyle={props.titleStyle || {}}
        modal={true}
        overlayStyle={styles.dialogOverlay}
        open={props.open}
        contentStyle={{width: '90%', maxWidth: 'none', }}
        actionsContainerStyle={{padding: 25}}
      >
        {errorTexts}
        
        <AceEditor
          mode={"yaml"}
          theme={"kubernetes"}
          name={"kubernetes-editor"}
          onChange={this.onChange.bind(this)}
          onSelectionChange={this.onSelectionChange.bind(this)}
          fontSize={14}
          tabSize={2}
          height={`${window.innerHeight - 300}px`}
          width={`100%`}
          editorProps={{$blockScrolling: true}}
          enableBasicAutocompletion={true}
          value={this.contents}
          ref={(ref) => {
            if (!!ref) {
              this.editor = ref.editor
              this.onEditorLoaded(this.editor)
              this.editor.enableBasicAutocompletion = true
              this.displayErrors()
            }
          }}
        />

      </Dialog>
    )
  }
})
