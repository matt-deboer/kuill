package proxy

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"io/ioutil"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"net/http/httputil"

	"github.com/gorilla/websocket"
	"github.com/matt-deboer/kuill/pkg/auth"
	log "github.com/sirupsen/logrus"
)

var whitelistedHeaders = []string{"Content-Type"}

type KubeAPIProxy struct {
	client              *http.Client
	usernameHeader      string
	groupHeader         string
	extraHeadersPrefix  string
	kubernetesURL       *url.URL
	websocketScheme     string
	proxyBasePath       string
	reverseProxy        *httputil.ReverseProxy
	websocketProxy      *WebsocketProxy
	traceRequests       bool
	authenticatedGroups []string
}

func NewKubeAPIProxy(kubernetesURL, proxyBasePath, clientCA, clientCert, clientKey,
	usernameHeader, groupHeader, extraHeadersPrefix string, authenticatedGroups []string, traceRequests bool) (*KubeAPIProxy, error) {

	// Load our TLS key pair to use for authentication
	cert, err := tls.LoadX509KeyPair(clientCert, clientKey)
	if err != nil {
		return nil, err
	}

	// Load our CA certificate
	clientCACert, err := ioutil.ReadFile(clientCA)
	if err != nil {
		return nil, err
	}

	clientCertPool := x509.NewCertPool()
	clientCertPool.AppendCertsFromPEM(clientCACert)

	tlsConfig := &tls.Config{
		Certificates: []tls.Certificate{cert},
		RootCAs:      clientCertPool,
		// TODO: pass in the 'insecure' as a flag
		InsecureSkipVerify: true,
	}

	tlsConfig.BuildNameToCertificate()
	client := &http.Client{
		Transport: &http.Transport{TLSClientConfig: tlsConfig},
	}

	if !strings.HasPrefix(proxyBasePath, "/") {
		proxyBasePath = "/" + proxyBasePath
	}

	kubeURL, err := url.Parse(kubernetesURL)
	if err != nil {
		return nil, err
	}

	wsURL, _ := url.Parse(kubernetesURL)
	if wsURL.Scheme == "https" {
		wsURL.Scheme = "wss"
	} else {
		wsURL.Scheme = "ws"
	}

	wsp := NewWebsocketProxy(wsURL)
	wsp.Dialer = &websocket.Dialer{
		TLSClientConfig: tlsConfig,
	}
	wsp.Upgrader = &websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}
	wsp.Director = func(incoming *http.Request, out http.Header) {
		out.Set(usernameHeader, incoming.Header.Get(usernameHeader))
		if traceRequests {
			log.Debugf("Director: adding header %s: %s", usernameHeader, incoming.Header.Get(usernameHeader))
		}
		out.Set(groupHeader, incoming.Header.Get(groupHeader))
		if traceRequests {
			log.Debugf("Director: adding header %s: %s", groupHeader, incoming.Header.Get(groupHeader))
		}
		out.Set("Origin", kubernetesURL)
		if traceRequests {
			log.Debugf("Director: adding header %s: %s", "Origin", kubernetesURL)
		}
	}

	log.Infof("Enabled kubernetes api proxy for %s", kubeURL)

	kp := &KubeAPIProxy{
		client:              client,
		kubernetesURL:       kubeURL,
		usernameHeader:      usernameHeader,
		groupHeader:         groupHeader,
		extraHeadersPrefix:  extraHeadersPrefix,
		proxyBasePath:       proxyBasePath,
		reverseProxy:        httputil.NewSingleHostReverseProxy(kubeURL),
		websocketProxy:      wsp,
		traceRequests:       traceRequests,
		authenticatedGroups: authenticatedGroups,
	}

	kp.reverseProxy.Director = kp.filterRequest
	kp.reverseProxy.Transport = &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		Dial: (&net.Dialer{
			Timeout:   5 * time.Second,
			KeepAlive: 30 * time.Second,
		}).Dial,
		TLSHandshakeTimeout: 5 * time.Second,
		TLSClientConfig:     tlsConfig,
	}

	return kp, nil
}

type AuthContextKey string

var authContextKey AuthContextKey = "kuill.authContext"

// ProxyRequest proxies the request
func (p *KubeAPIProxy) ProxyRequest(w http.ResponseWriter, r *http.Request, authContext auth.Context) {

	if strings.HasPrefix(r.URL.Scheme, "ws") || strings.ToLower(r.Header.Get("Connection")) == "upgrade" {
		r.URL.Path = strings.Replace(r.URL.Path, p.proxyBasePath, "", 1)
		r.URL.RawPath = strings.Replace(r.URL.RawPath, p.proxyBasePath, "", 1)
		r.Header.Del("Origin")
		p.traceRequest(r, authContext)
		p.addAuthHeaders(r, authContext)
		p.websocketProxy.ServeHTTP(w, r)
	} else {
		p.reverseProxy.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), authContextKey, authContext)))
	}
}

func (p *KubeAPIProxy) filterRequest(r *http.Request) {
	r.URL.Path = strings.Replace(r.URL.Path, p.proxyBasePath, "", 1)
	r.URL.RawPath = strings.Replace(r.URL.RawPath, p.proxyBasePath, "", 1)
	r.URL.Scheme = p.kubernetesURL.Scheme
	r.URL.Host = p.kubernetesURL.Host
	if _, ok := r.Header["User-Agent"]; !ok {
		// explicitly disable User-Agent so it's not set to default value
		r.Header.Set("User-Agent", "")
	}
	r.Header.Set("Origin", p.kubernetesURL.String())
	authContext := r.Context().Value(authContextKey).(auth.Context)
	p.traceRequest(r, authContext)
	p.addAuthHeaders(r, authContext)
}

func (p *KubeAPIProxy) traceRequest(r *http.Request, authContext auth.Context) {

	if p.traceRequests {
		lctx := log.WithFields(log.Fields{
			"method": "ProxyRequest",
			"req":    r.URL.String(),
		})

		data, err := httputil.DumpRequest(r, r.Method == "POST" || r.Method == "PUT" || r.Method == "PATCH")
		if err != nil {
			lctx.Warnf("Error dumping request : %v", err)
		} else {
			lctx.Debugf("Proxying WS request for %s: %s\n%s", authContext.User(), r.URL, string(data))
		}
	}
}

func (p *KubeAPIProxy) addAuthHeaders(req *http.Request, authContext auth.Context) {
	req.Header.Add(p.usernameHeader, authContext.User())
	for _, group := range authContext.Groups() {
		req.Header.Add(p.groupHeader, group)
	}
	for _, group := range p.authenticatedGroups {
		req.Header.Add(p.groupHeader, group)
	}
}
