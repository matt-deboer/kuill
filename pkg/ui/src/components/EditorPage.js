import React from 'react'

import FlatButton from 'material-ui/FlatButton'
import RaisedButton from 'material-ui/RaisedButton'
import Dialog from 'material-ui/Dialog'
import { routerActions } from 'react-router-redux'
import { connect } from 'react-redux'

import AceEditor from 'react-ace'
import 'brace/mode/yaml'
import 'brace/mode/json'
import 'brace/theme/iplastic'
import 'brace/ext/language_tools'
import ace from 'brace'

const langTools = ace.acequire('ace/ext/language_tools')

var completer = {
  getCompletions: function(editor, session, pos, prefix, callback) {
    callback(null, [])
  }
}
langTools.addCompleter(completer);





const mapStateToProps = function(store) {
  return {
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
  }
}

// use functional component style for representational components
export default connect(mapStateToProps, mapDispatchToProps) (
class EditorPage extends React.Component {

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
    if (!this.contents) {
      this.contents = props.contents
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
    this.props.onChange && this.props.onChange(contents)
  }

  onEditorLoaded = (editor) => {
    this.props.onEditorLoaded && this.props.onEditorLoaded(editor)
  }

  applyChanges = () => {
    this.props.onEditorApply(this.contents)
  }

  render() {
    let { props } = this
    let additionalActions = props.additionalActions || []
    const actions = [
      ...additionalActions,
      <FlatButton
        label="Cancel"
        primary={true}
        onTouchTap={props.onEditorCancel}
      />,
      <RaisedButton
        label="Apply"
        primary={true}
        onTouchTap={this.applyChanges.bind(this)}
      />,
    ]

    return (
      <Dialog
        actions={actions}
        title={props.title}
        titleStyle={props.titleStyle || {}}
        modal={true}
        open={props.open}
        contentStyle={{width: '90%', maxWidth: 'none'}}
        actionsContainerStyle={{padding: 25}}
      >
        <AceEditor
          mode={"yaml"}
          theme={"iplastic"}
          name={"kubernetes-editor"}
          onChange={this.onChange.bind(this)}
          onSelectionChange={this.onSelectionChange.bind(this)}
          tabSize={3}
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
            }
          }}
        />
      </Dialog>
    )
  }
})

