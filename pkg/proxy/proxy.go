package proxy

import (
	"crypto/tls"
	"crypto/x509"
	"io"
	"io/ioutil"
	"net/http"
	"net/url"
	"strings"

	"net/http/httputil"

	"github.com/gorilla/websocket"
	"github.com/matt-deboer/kapow/pkg/auth"
	log "github.com/sirupsen/logrus"
)

var whitelistedHeaders = []string{"Content-Type"}

type KubeAPIProxy struct {
	client             *http.Client
	usernameHeader     string
	groupHeader        string
	extraHeadersPrefix string
	kubernetesURL      *url.URL
	proxyBasePath      string
	websocketProxy     *WebsocketProxy
	traceRequests      bool
}

func NewKubeAPIProxy(kubernetesURL, proxyBasePath, clientCA, clientCert, clientKey,
	usernameHeader, groupHeader, extraHeadersPrefix string, traceRequests bool) (*KubeAPIProxy, error) {

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

	if !strings.HasSuffix(proxyBasePath, "/") {
		proxyBasePath += "/"
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

	return &KubeAPIProxy{
		client:             client,
		kubernetesURL:      kubeURL,
		usernameHeader:     usernameHeader,
		groupHeader:        groupHeader,
		extraHeadersPrefix: extraHeadersPrefix,
		proxyBasePath:      proxyBasePath,
		websocketProxy:     wsp,
		traceRequests:      traceRequests,
	}, nil
}

// ProxyRequest proxies the request
func (p *KubeAPIProxy) ProxyRequest(w http.ResponseWriter, r *http.Request, authContext auth.Context) {

	ctx := log.WithFields(log.Fields{
		"method": "ProxyRequest",
		"req":    r.URL.String(),
	})

	r.URL.Path = strings.Replace(r.URL.Path, p.proxyBasePath, "", 1)
	if strings.HasPrefix(r.URL.Scheme, "ws") || strings.ToLower(r.Header.Get("Connection")) == "upgrade" {

		r.Header.Del("Origin")

		if p.traceRequests {
			data, err := httputil.DumpRequest(r, r.Method == "POST" || r.Method == "PUT" || r.Method == "PATCH")
			if err != nil {
				ctx.Warnf("Error dumping request : %v", err)
			} else {
				ctx.Debugf("Proxying WS request for %s: %s\n%s", authContext.User(), r.URL, string(data))
			}
		}

		p.addAuthHeaders(r, authContext)
		p.websocketProxy.ServeHTTP(w, r)

	} else {
		r.URL.Host = p.kubernetesURL.Host
		r.URL.Scheme = p.kubernetesURL.Scheme

		if p.traceRequests {
			data, err := httputil.DumpRequest(r, r.Method == "POST" || r.Method == "PUT" || r.Method == "PATCH")
			if err != nil {
				ctx.Warnf("Error dumping request : %v", err)
			} else {
				ctx.Debugf("Proxying request for %s: %s\n%s", authContext.User(), r.URL, string(data))
			}
		}

		req, err := http.NewRequest(r.Method, r.URL.String(), r.Body)
		if err != nil {
			ctx.Error("Failed to create request", err)
			http.Error(w, "Failed to create request: "+err.Error(), http.StatusInternalServerError)
			return
		}

		for _, h := range whitelistedHeaders {
			req.Header.Add(h, r.Header.Get(h))
		}
		p.addAuthHeaders(req, authContext)

		resp, err := p.client.Do(req)
		if err != nil {
			ctx.Error("Error calling kubernetes API: ", err)
			http.Error(w, "Error calling kubernetes api: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(resp.StatusCode)
		for name, value := range resp.Header {
			w.Header()[name] = value
		}
		io.Copy(w, resp.Body)
		resp.Body.Close()
	}
}

func (p *KubeAPIProxy) addAuthHeaders(req *http.Request, authContext auth.Context) {
	req.Header.Add(p.usernameHeader, authContext.User())
	for _, group := range authContext.Groups() {
		req.Header.Add(p.groupHeader, group)
	}
}
