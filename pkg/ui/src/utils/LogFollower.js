import { TextDecoder } from 'text-encoding'

// const escape = parseInt('033', 8);
const colorCodes = [22,26,28,30,32,94,102,140,142,215,220,229].map(val => `\x1B[38;5;${val}m`)
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

    this.firstLine = true
    this.maxLines = props.maxLines || 1500
    this.logs = props.logs
    this.logColor = props.logs.nextColor()
    let { pod, namespace, container } = props
    this.logPrefix = `${props.logs.nextColor()}${pod}/${container} | `
    let loc = window.location
    let scheme = (loc.protocol === 'https:' ? 'wss' : 'ws')
    this.socket = new WebSocket(`${scheme}://${loc.host}/proxy/api/v1/namespaces/${namespace}/pods/${pod}/log?follow=true&container=${container}&tailLines=${this.maxLines}`)
    this.socket.onerror = function (e) {
      console.log(e)
    }
    this.socket.binaryType = 'arraybuffer'
    this.socket.onmessage = this.onEvent.bind(this)
    this.props = props
    console.log(`LogFollower for ${this.props.pod}/${this.props.container} created`)
  }

  onEvent = (event) => {
    let line = new TextDecoder("utf-8").decode(event.data)
    if (!!line) {
      this.logs.push(`${this.logPrefix}${line}${logSuffix}`)
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
    console.log(`LogFollower for ${this.props.pod}/${this.props.container} destroyed`)
  }
}
