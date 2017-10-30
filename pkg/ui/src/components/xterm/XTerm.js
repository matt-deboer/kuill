import React from 'react'
import PropTypes from 'prop-types'
import xterm from 'xterm'
import className from 'classnames'

import './XTerm.css'

export default class XTerm extends React.Component {
    
    static propTypes = {
      onInput: PropTypes.func,
      cursorBlink: PropTypes.bool,
      options: PropTypes.object,
      cols: PropTypes.number,
      enabled: PropTypes.bool,
      onDestroy: PropTypes.func,
      copyOnCtrlC: PropTypes.bool,
      pasteOnCtrlV: PropTypes.bool,
    }
    
    static defaultProps = {
      onInput: function(){},
      cursorBlink: true,
      options: {},
      cols: null,
      enabled: true,
      onDestroy: function(){},
    }

    constructor(props, context) {
      super(props, context);
      this.state = {
        isFocused: false
      }
    }

    fit = () => {
      var geometry = this.proposeGeometry(this.xterm)
      if (isFinite(geometry.rows) && isFinite(geometry.cols)) {
        this.resize(this.props.cols || geometry.cols, geometry.rows)
      }
    }

    getXTermInstance() {
      if (!this.xtermInstance) {
          this.xtermInstance = this.props.xtermInstance || xterm;
      }
      return this.xtermInstance;
    }

    attachAddon(addon) {
      addon.attach(this.xtermInstance)
    }

    componentDidMount() {
      const xtermInstance = this.getXTermInstance()
      this.xterm = new xtermInstance(this.props.options)
      this.xterm.open(this.refs.container, this.props.options.focus)
      this.xterm.on('focus', this.focusChanged.bind(this, true))
      this.xterm.on('blur', this.focusChanged.bind(this, false))
      if (this.props.onInput) {
        this.xterm.on('data', this.props.onInput)
      }
      if (this.props.value) {
        this.xterm.write(this.props.value)
      }
      if (this.props.copyOnCtrlC || this.props.pasteOnCtrlV) {
        this.xterm.attachCustomKeyEventHandler(function (ev) {
          if (ev.ctrlKey && ev.keyCode === 67) {
            return !this.props.copyOnCtrlC
          } else if (ev.ctrlKey && ev.keyCode === 86) {
            return !this.props.pasteOnCtrlV
          }
          return true
        })
      }
      this.fit()
      if (!!this.tempBuffer) {
        this.xterm.write(this.tempBuffer)
        delete this.tempBuffer
      }
    }

    componentWillUnmount() {
      if (this.xterm) {
        this.xterm.destroy()
        this.xterm = null
      }
    }

    getXTerm() {
      return this.xterm
    }

    write(data) {
      if (this.xterm) {
        this.xterm.write(data)
      } else {
        console.log(`writing '${data}' to tempBuffer`)
        this.tempBuffer = (this.tempBuffer || '') + data
      }
    }

    writeln(data) {
      if (this.xterm) {
        this.xterm.writeln(data)
      } else {
        console.log(`writing line '${data}'  to tempBuffer`)
        this.tempBuffer = (this.tempBuffer || '') + data + '\n'
      }
    }

    focus() {
      if (this.xterm) {
        this.xterm.focus()
      }
    }

    focusChanged(focused) {
      this.setState({
        isFocused: focused,
      })
      this.props.onFocusChange && this.props.onFocusChange(focused)
    }

    resize(cols, rows) {
      this.xterm.resize(cols, rows);
    }

    setCursorBlink(blink) {
      if (this.xterm && this.xterm.cursorBlink !== blink) {
          this.xterm.cursorBlink = blink
          this.xterm.refresh(0, this.xterm.rows - 1)
      }
    }

    // TODO: This was cribbed from the 'fit' addon; can we use that addon directly instead of this?...
    proposeGeometry(term) {
        var parentElementStyle = window.getComputedStyle(term.element.parentElement), 
            parentElementHeight = parseInt(parentElementStyle.getPropertyValue('height'),10), 
            parentElementWidth = Math.max(0, parseInt(parentElementStyle.getPropertyValue('width'),10) - 17), 
            elementStyle = window.getComputedStyle(term.element), 
            elementPaddingVer = parseInt(elementStyle.getPropertyValue('padding-top'),10) + parseInt(elementStyle.getPropertyValue('padding-bottom'),10), 
            elementPaddingHor = parseInt(elementStyle.getPropertyValue('padding-right'),10) + parseInt(elementStyle.getPropertyValue('padding-left'),10), 
            availableHeight = parentElementHeight - elementPaddingVer, 
            availableWidth = parentElementWidth - elementPaddingHor, 
            subjectRow = term.rowContainer.firstElementChild, 
            contentBuffer = subjectRow.innerHTML, 
            characterHeight, rows, characterWidth, 
            cols, 
            geometry

        subjectRow.style.display = 'inline';
        subjectRow.innerHTML = 'W';
        characterWidth = subjectRow.getBoundingClientRect().width
        subjectRow.style.display = ''
        characterHeight = parseInt(subjectRow.offsetHeight,10)
        subjectRow.innerHTML = contentBuffer
        rows = Math.ceil(availableHeight / characterHeight)
        cols = Math.ceil(availableWidth / characterWidth)
        geometry = { cols: cols, rows: rows }
        console.log(`XTerm: proposed new geometry: ${cols}, ${rows}`)
        return geometry
    }
    
    render() {
        const terminalClassName = className('xterm-react', 
          this.state.isFocused ? 'xterm-react-focused' : null, 
          this.props.enabled ? null: 'xterm-react-disabled',
          this.props.className)
        return <div style={{...this.props.style}} ref={'container'} className={terminalClassName} />
    }
}
