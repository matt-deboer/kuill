import { putResource, removeResource } from '../state/actions/resources'
import { addError } from '../state/actions/errors'
import { keyForResource } from '../utils/resource-utils'

const throttles = {
  'Endpoints/MODIFIED': 10000,
}
const throttlePurgeInterval = 2 * 60 * 1000
const aggregationInterval = 1000

export default class ResourceKindWatcher {

  constructor(props) {

    this.props = props
    this.tries = 0
    this.kubeKinds = props.kubeKinds
    this.initialize = this.initialize.bind(this)
    if (!!props.kind && !!props.dispatch && !!props.resourceGroup) {
      this.initialize()
    }
  }

  initialize = () => {
    let { props } = this
    this.namespaces = props.namespaces || []
    this.swagger = props.swagger
    this.dispatch = props.dispatch
    this.kind = this.kubeKinds[props.kind]
    let resourceVersion = props.resourceVersion || 0
    let loc = window.location
    let scheme = (loc.protocol === 'https:' ? 'wss' : 'ws')
    this.onEvent = this.onEvent.bind(this)

    this.urls = []
    for (let ns of this.namespaces) {
      this.urls.push(this.websocketUrl(scheme, loc.host, this.kind, resourceVersion, ns))
    }

    this.sockets = {}
    for (let url of this.urls) {
      this.initSocket(url)
    }

    this.throttled = {}
    this.lastPurge = Date.now()
    this.events = {}
    this.interval = window.setInterval(this.processEvents.bind(this), props.interval || aggregationInterval)
  }

  websocketUrl(scheme, host, kubeKind, resourceVersion, ns) {
    let url = `${scheme}://${host}/proxy`
    url += `/${kubeKind.base}/`
    if (!!ns && ns !== '*') {
      url += `namespaces/${ns}/`
    }
    url += `${kubeKind.plural}`
    url += `?watch=true&resourceVersion=${resourceVersion}`
    return url
  }

  processEvents = () => {
    if (Object.keys(this.events).length) {
      for (let key in this.events) {
        let data = this.events[key]
        switch(data.type) {
          case 'ADDED':
            this.dispatch(putResource(data.object, true))  
            break
          case 'MODIFIED': 
            this.dispatch(putResource(data.object, false))
            break
          case 'DELETED':
            this.dispatch(removeResource(data.object))
            break
          default:
            return 
        }
      }
      this.events = {}
    }
  }

  closed = () => {
    return !this.socket || this.socket.readyState === 3 || this.socket.readyState === 2
  }

  onEvent = (event) => {
    let data = this.applyThrottles(JSON.parse(event.data))
    if (!!data) {
      let key = keyForResource(data.object)
      this.events[key] = data
    }
  }

  destroy = () => {
    this.interval && window.clearInterval(this.interval)
    this.socket && this.socket.close()
  }

  reset = () => {
    this.destroy()
    this.initialize()
  }

  reload = (url) => {
    let socket = this.sockets[url]
    if (socket) {
      socket.close()
      if (socket.constructor === WebSocket) {
        this.initSocket(url)
      } else {
        this.fallback(url)
      }
    }
  }

  initSocket = (url) => {
    let tries = (this.sockets[url] && this.sockets[url].tries) || 0
    let socket = new WebSocket(url)
    socket.tries = tries
    let that = this
    socket.onerror = function (e) {
      if (socket.tries < 3) {
        ++socket.tries
        window.setTimeout(that.reload.bind(that, url), 3000)
      } else {
        that.fallback(url)
      }
    }
    socket.onmessage = this.onEvent
    this.sockets[url] = socket
  }
  /**
   * 
   */
  applyThrottles = (data) => {
    let resource = data.object
    let throttle = throttles[`${resource.kind}/${data.type}`]
    if (!!throttle) {
      let key = `${resource.metadata.namespace}/${resource.kind}/${resource.metadata.name}/${data.type}`
      let lastSeen = this.throttled[key] || 0
      let now = Date.now()
      this.purgeThrottles(now)
      if ((now - lastSeen) > throttle) {
        this.throttled[key] = now
        return data
      }
      return null
    }
    return data
  }

  purgeThrottles = (now) => {
    if ((now - this.lastPurge) > throttlePurgeInterval) {
      for (let t in this.throttled) {
        let throttle = throttles[t]
        let lastSeen = this.throttled[t]
        if (now - lastSeen > throttle) {
          delete this.throttled[t]
        }
      }
      this.lastPurge = now
    }
  }

  fallback = (url) => {
    let socket = this.sockets[url]
    let tries = 0
    if (socket) {
      socket.close()
      if (socket.constructor === EventSource) {
        tries = socket.tries
      }
    }
    let that = this
    let esUrl = url.replace(/ws(s)?/, "http$1")
    let stream = new EventSource(esUrl)
    stream.tries = tries
    stream.onerror = function (e) {
      if (stream.tries < 3) {
        ++stream.tries
        window.setTimeout(that.reload.bind(that, url), 2000)
      } else {
        that.dispatch(addError(e,'error',`Error occurred in watch for ${url}`))
      }
    }
    stream.onmessage = this.onEvent
    this.sockets[url] = stream
  }
}
