import { TextDecoder } from 'text-encoding-utf-8'
import { addError } from '../state/actions/errors'

// const escape = parseInt('033', 8);
const colorCodes = [153,215,230,147,14,10,11,159,255].map(val => `\x1B[38;5;${val}m`)
const logSuffix = `\x1B[0m`

export default class LogFollower {

  // Buffer allows for appending received log lines before
  // the on-screen view component is ready to receive them;
  // until the onPush method is defined, 'push' works normally
  static Buffer = function(maxSize=2500) {
    let buffer = []
    buffer._maxSize = maxSize
    buffer.push = function(e) {
      // if an 'onPush' is defined, and it returns false, don't
      // add the element to the array
      if (typeof buffer.onPush === 'function') {
        if (!buffer.onPush(e)) {
          return
        }
      }
      let size = Array.prototype.push.call(buffer, e)
      if (size >= buffer._maxSize) {
        buffer.splice(0, size - buffer._maxSize)
      }
    }
    buffer._colorIndex = 0
    buffer.nextColor = function() {
      buffer._colorIndex = (buffer._colorIndex + 1) % colorCodes.length
      return colorCodes[buffer._colorIndex]
    }
    return buffer
  }

  constructor(props) {

    this.props = props
    this.firstLine = true
    this.maxLines = props.maxLines || 1500
    this.logs = props.logs
    this.dispatch = props.dispatch
    this.logColor = props.logs.nextColor()
    let { pod, namespace, container } = props

    this.logPrefix = `${props.logs.nextColor()}`
    let loc = window.location
    let scheme = (loc.protocol === 'https:' ? 'wss' : 'ws')
    
    this.url = `${scheme}://${loc.host}/proxy/api/v1/namespaces/${namespace}/pods/${pod}/log?follow=true&container=${container}&tailLines=${this.maxLines}`
    this.initSocket(this.url)
  }

  initSocket = (url) => {
    let tries = (this.socket && this.socket.tries) || 0
    let socket = new WebSocket(url)
    socket.binaryType = 'arraybuffer'
    socket.tries = tries
    let that = this
    socket.onerror = function (e) {
      if (socket.readyState !== WebSocket.OPEN) {
        if (socket.tries < 3) {
          ++socket.tries
          window.setTimeout(that.reload.bind(that, url), 2000)
        } else {
          socket.tries = 0
          that.dispatch(addError(e,'error',`Error occurred following logs for: ${url}`,
            'Retry', that.reload.bind(that,url)))
          that.destroy()
        }
      }
    }
    socket.onmessage = this.onEvent
    this.socket = socket
  }

  reload = (url) => {
    let socket = this.socket
    if (socket) {
      socket.close()
      this.initSocket(url)
    }
  }

  onEvent = (event) => {
    let line = new TextDecoder("utf-8").decode(event.data)
    if (!!line) {
      line = this.logPrefix + line
      if (line.endsWith('\n')) {
        line = line.slice(0, -1) + logSuffix
      } else {
        line += logSuffix
      }
      this.logs.push(line)
    }
  }

  destroy = () => {
    if (this.socket) {
      this.socket.close()
      this.socket.onmessage = null
      this.socket.onerror = null
      this.socket = null
      this.logs = null
    }
  }
}
