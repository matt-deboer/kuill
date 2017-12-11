package proxy

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	log "github.com/sirupsen/logrus"

	"bytes"

	"github.com/gorilla/websocket"
)

// MultiwatchPath is the url path at which multiwatch is served
const MultiwatchPath = "/proxy/_/multiwatch"

// CreateWatchesRequest represents a request to
// create a watch for a set of kinds and associated
// namespaces
type CreateWatchesRequest struct {
	Watches []*NamespacedKind `json:"watches"`
}

// NamespacedKind represents a kind
// and a set of associated namespaces
type NamespacedKind struct {
	Kind             string   `json:"kind"`
	ResourceRevision int      `json:"resourceRevision"`
	Namespaces       []string `json:"namespaces"`
}

// KubeKindAggregatingWatchProxy is an HTTP Handler that takes an incoming WebSocket
// connection and proxies it to another server.
type KubeKindAggregatingWatchProxy struct {
	// Director, if non-nil, is a function that may copy additional request
	// headers from the incoming WebSocket connection into the output headers
	// which will be forwarded to another server.
	Director func(incoming *http.Request, out http.Header)

	// Backend returns the backend URL which the proxy uses to reverse proxy
	// the incoming WebSocket connection. Request is the initial incoming and
	// unmodified request.
	Backend func(kindPath string, resourceVersion int) *url.URL

	// Upgrader specifies the parameters for upgrading a incoming HTTP
	// connection to a WebSocket connection. If nil, DefaultUpgrader is used.
	Upgrader *websocket.Upgrader

	//  Dialer contains options for connecting to the backend WebSocket server.
	//  If nil, DefaultDialer is used.
	Dialer *websocket.Dialer

	traceRequests bool

	kindLister *KindLister
}

// NewKubeKindAggregatingWatchProxy returns a new Websocket reverse proxy that rewrites the
// URL's to the scheme, host and base path provider in target.
func NewKubeKindAggregatingWatchProxy(target *url.URL, traceRequests bool, kindLister *KindLister) *KubeKindAggregatingWatchProxy {
	backend := func(watchPath string, resourceVersion int) *url.URL {
		// Shallow copy
		u := *target
		u.Fragment = ""
		u.Path = watchPath
		u.RawQuery = fmt.Sprintf("watch=true&resourceVersion=%d", resourceVersion)
		return &u
	}

	return &KubeKindAggregatingWatchProxy{Backend: backend, kindLister: kindLister}
}

// split up the watch request into 3 separate parts, each of which will be
// encoded into it's own separate cookie
func splitWatchesRequest(watchesRequest *CreateWatchesRequest) (kinds []string, namespaces []string, namespaceIndexesByKindIndex [][]int) {

	indexesByKind := make(map[string]int)
	indexesByNs := make(map[string]int)
	nextKindIndex := 0
	nextNsIndex := 0

	for _, watch := range watchesRequest.Watches {
		kinds = append(kinds, fmt.Sprintf("%s:%d", watch.Kind, watch.ResourceRevision))
		indexesByKind[watch.Kind] = nextKindIndex
		nextKindIndex++

		nsIndicies := make([]int, 0, len(watch.Namespaces))
		for _, ns := range watch.Namespaces {
			if index, ok := indexesByNs[ns]; ok {
				nsIndicies = append(nsIndicies, index)
			} else {
				namespaces = append(namespaces, ns)
				nsIndicies = append(nsIndicies, nextNsIndex)
				indexesByNs[ns] = nextNsIndex
				nextNsIndex++
			}
		}
		namespaceIndexesByKindIndex = append(namespaceIndexesByKindIndex, nsIndicies)
	}

	return
}

// convets the watches request to a gob-base64 encoded cookie to be passed
// on a subsequent websocket request; this allows passing all of the information
// necessary for a multiwatch which would not otherwise fit in the URL
func (w *KubeKindAggregatingWatchProxy) convertWatchesRequestToCookies(rw http.ResponseWriter, req *http.Request) {
	contentType := req.Header.Get("Content-Type")
	if strings.Contains(contentType, "application/json") {
		decoder := json.NewDecoder(req.Body)
		defer req.Body.Close()
		var watchesRequest CreateWatchesRequest
		err := decoder.Decode(&watchesRequest)
		if err != nil {
			http.Error(rw, "Failed to decode request", http.StatusBadRequest)
		} else {
			kinds, namespaces, namespaceIndexesByKindIndex := splitWatchesRequest(&watchesRequest)
			http.SetCookie(rw, &http.Cookie{
				Name:     "multiwatch.kinds",
				Value:    strings.Join(kinds, ","),
				HttpOnly: true,
				Path:     MultiwatchPath,
			})
			http.SetCookie(rw, &http.Cookie{
				Name:     "multiwatch.namespaces",
				Value:    strings.Join(namespaces, ","),
				HttpOnly: true,
				Path:     MultiwatchPath,
			})
			nsByKindBytes, err := json.Marshal(namespaceIndexesByKindIndex)
			if err != nil {
				http.Error(rw, "Internal Server Error", http.StatusInternalServerError)
				return
			}
			http.SetCookie(rw, &http.Cookie{
				Name:     "multiwatch.nsByKind",
				Value:    string(nsByKindBytes),
				HttpOnly: true,
				Path:     MultiwatchPath,
			})
			// success; the cookies are actually the response
			rw.WriteHeader(http.StatusCreated)
		}
	} else {
		http.Error(rw, "Only 'application/json' is supported for this resource", http.StatusUnsupportedMediaType)
	}
	return
}

// rebuild the watches request from the separate cookie values
func extractWatchesRequestFromCookies(req *http.Request) (*CreateWatchesRequest, error) {

	var watchesRequest CreateWatchesRequest

	ckKinds, err := req.Cookie("multiwatch.kinds")
	if err != nil {
		return nil, fmt.Errorf("Missing 'multiwatch.kinds' cookie; %v", err)
	}
	kinds := strings.Split(ckKinds.Value, ",")

	ckNamespaces, err := req.Cookie("multiwatch.namespaces")
	if err != nil {
		return nil, fmt.Errorf("Missing 'multiwatch.namespaces' cookie; %v", err)
	}
	namespaces := strings.Split(ckNamespaces.Value, ",")

	ckNsByKind, err := req.Cookie("multiwatch.nsByKind")
	if err != nil {
		return nil, fmt.Errorf("Missing 'multiwatch.nsByKind' cookie; %v", err)
	}
	var nsByKind [][]int
	err = json.Unmarshal([]byte(ckNsByKind.Value), &nsByKind)
	if err != nil {
		return nil, fmt.Errorf("Failed to parse 'multiwatch.nsByKind' cookie; %v", err)
	}

	for i, nss := range nsByKind {
		nsForKind := make([]string, 0, len(nss))
		for _, nsi := range nss {
			nsForKind = append(nsForKind, namespaces[nsi])
		}
		parts := strings.Split(kinds[i], ":")
		rev, _ := strconv.Atoi(parts[1])
		watchesRequest.Watches = append(watchesRequest.Watches,
			&NamespacedKind{Kind: parts[0], ResourceRevision: rev, Namespaces: nsForKind})
	}

	return &watchesRequest, nil
}

// ServeHTTP implements the http.Handler that proxies WebSocket connections.
func (w *KubeKindAggregatingWatchProxy) ServeHTTP(rw http.ResponseWriter, req *http.Request) {

	if req.Method == "POST" {
		// User is creating the cookies that will be used by a subsequent
		// websocket GET request
		w.convertWatchesRequestToCookies(rw, req)
		return
	}

	if w.Backend == nil {
		log.Error("KubeKindAggregatingWatchProxy: backend function is not defined")
		http.Error(rw, "internal server error (code: 1)", http.StatusInternalServerError)
		return
	}

	watchesRequest, err := extractWatchesRequestFromCookies(req)
	if err != nil {
		log.Errorf("KubeKindAggregatingWatchProxy: missing required multiwatch cookies; %v", err)
		http.Error(rw, "Missing required multiwatch cookies", http.StatusBadRequest)
		return
	} else if log.GetLevel() >= log.DebugLevel {
		data, err := json.Marshal(watchesRequest)
		if err != nil {
			log.Errorf("Failed to marshal watchesRequest: %v", err)
		}
		log.Debugf("KubeKindAggregatingWatchProxy: handling multiwatch for %#v",
			string(data))
	}

	dialer := w.Dialer
	if w.Dialer == nil {
		dialer = DefaultDialer
	}

	// Pass headers from the incoming request to the dialer to forward them to
	// the final destinations.
	requestHeader := http.Header{}
	if origin := req.Header.Get("Origin"); origin != "" {
		requestHeader.Add("Origin", origin)
	}
	for _, prot := range req.Header[http.CanonicalHeaderKey("Sec-WebSocket-Protocol")] {
		requestHeader.Add("Sec-WebSocket-Protocol", prot)
	}
	for _, cookie := range req.Header[http.CanonicalHeaderKey("Cookie")] {
		requestHeader.Add("Cookie", cookie)
	}

	// Pass X-Forwarded-For headers too, code below is a part of
	// httputil.ReverseProxy. See http://en.wikipedia.org/wiki/X-Forwarded-For
	// for more information
	// TODO: use RFC7239 http://tools.ietf.org/html/rfc7239
	if clientIP, _, err := net.SplitHostPort(req.RemoteAddr); err == nil {
		// If we aren't the first proxy retain prior
		// X-Forwarded-For information as a comma+space
		// separated list and fold multiple headers into one.
		if prior, ok := req.Header["X-Forwarded-For"]; ok {
			clientIP = strings.Join(prior, ", ") + ", " + clientIP
		}
		requestHeader.Set("X-Forwarded-For", clientIP)
	}

	// Set the originating protocol of the incoming HTTP request. The SSL might
	// be terminated on our site and because we doing proxy adding this would
	// be helpful for applications on the backend.
	requestHeader.Set("X-Forwarded-Proto", "http")
	if req.TLS != nil {
		requestHeader.Set("X-Forwarded-Proto", "https")
	}

	// Enable the director to copy any additional headers it desires for
	// forwarding to the remote server.
	if w.Director != nil {
		w.Director(req, requestHeader)
	}

	backendErrors := make(chan error, len(watchesRequest.Watches))
	var clientConn *websocket.Conn

	outbound := make(chan []byte, 32)

	for _, watch := range watchesRequest.Watches {
		// Connect to the backend URL, also pass the headers we get from the requst
		// together with the Forwarded headers we prepared above.
		kubeKind := w.kindLister.GetKind(watch.Kind)
		for _, ns := range watch.Namespaces {
			kindPath := kubeKind.GetWatchPath(ns)
			if log.GetLevel() >= log.DebugLevel {
				log.Debugf("Got kindPath %s for ns: %s, kind: %s", kindPath, ns, watch.Kind)
			}
			backendURL := w.Backend(kindPath, watch.ResourceRevision)
			if backendURL == nil {
				log.Error("KubeKindAggregatingWatchProxy: backend URL is nil")
				// TODO: should we just log this and move on to the next?
				http.Error(rw, "Internal server error (code: 2)", http.StatusInternalServerError)
				return
			} else if log.GetLevel() >= log.DebugLevel {
				log.Debugf("Got backend url of %v for request url of %v",
					backendURL, req.URL)
			}

			if w.traceRequests {
				log.Infof("KubeKindAggregatingWatchProxy: adding ws backend to multiwatch: %v",
					backendURL)
			}

			connBackend, resp, err := dialer.Dial(backendURL.String(), requestHeader)
			if err != nil {
				status := "<none>"
				body := ""
				if resp != nil {
					status = resp.Status
					if resp.Body != nil {
						buff := &bytes.Buffer{}
						buff.ReadFrom(resp.Body)
						body = buff.String()
					}
				}
				backendErrors <- fmt.Errorf("KubeKindAggregatingWatchProxy: couldn't dial to remote backend url %s: %s %s %s", backendURL, err, status, body)
				continue
			}
			defer connBackend.Close()

			if log.GetLevel() >= log.DebugLevel {
				log.Debugf("Starting socket reader for %v => %v...", req.URL, backendURL)
			}
			go w.readMessages(backendURL, connBackend, outbound, backendErrors)

			if clientConn == nil {
				clientConn, err = w.upgradeClient(req, resp, rw)
				if err != nil {
					log.Errorf("KubeKindAggregatingWatchProxy: couldn't upgrade %s\n", err)
					return
				}
				defer clientConn.Close()
			}
		}
	}

	if log.GetLevel() >= log.DebugLevel {
		log.Debugf("Starting aggregating socket writer for %v...", req.URL)
	}
	errOutbound := make(chan error, 1)
	go w.writeMessages(clientConn, outbound, errOutbound)
	<-errOutbound
	if log.GetLevel() >= log.DebugLevel {
		log.Debugf("Closed aggregating socket writer for %v", req.URL)
	}
}

func (w *KubeKindAggregatingWatchProxy) upgradeClient(req *http.Request, resp *http.Response, rw http.ResponseWriter) (*websocket.Conn, error) {
	upgrader := w.Upgrader
	if w.Upgrader == nil {
		upgrader = DefaultUpgrader
	}

	// Only pass those headers to the upgrader.
	upgradeHeader := http.Header{}
	if hdr := resp.Header.Get("Sec-Websocket-Protocol"); hdr != "" {
		upgradeHeader.Set("Sec-Websocket-Protocol", hdr)
	}
	if hdr := resp.Header.Get("Set-Cookie"); hdr != "" {
		upgradeHeader.Set("Set-Cookie", hdr)
	}

	// Now upgrade the existing incoming request to a WebSocket connection.
	// Also pass the header that we gathered from the Dial handshake.
	if w.traceRequests {
		log.Infof("KubeKindAggregatingWatchProxy: upgrading request %v { %v }", req.URL, upgradeHeader)
	}
	return upgrader.Upgrade(rw, req, upgradeHeader)
}

func (w *KubeKindAggregatingWatchProxy) readMessages(backendURL *url.URL, socket *websocket.Conn, outbound chan []byte, errc chan error) {
	for {
		mt, message, err := socket.ReadMessage()
		if err != nil {
			errc <- err
			return
		}
		if w.traceRequests {
			log.Infof("Read message of type %d from %v: %s", mt, backendURL, string(message))
		}
		outbound <- message
	}
}

func (w *KubeKindAggregatingWatchProxy) writeMessages(socket *websocket.Conn, outbound chan []byte, errc chan error) {

	for {
		select {
		case message := <-outbound:
			err := socket.WriteMessage(websocket.TextMessage, message)
			if err != nil {
				errc <- err
				return
			}
			if w.traceRequests {
				log.Infof("Writing message to client: %s", string(message))
			}
		default:
		}
	}
}
