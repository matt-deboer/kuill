package proxy

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	kube_transport "k8s.io/client-go/transport"

	"github.com/matt-deboer/kuill/pkg/clients"
	"k8s.io/api/authentication/v1"

	"net/http/httputil"

	"github.com/gorilla/websocket"
	"github.com/matt-deboer/kuill/pkg/auth"
	log "github.com/sirupsen/logrus"
)

var whitelistedHeaders = []string{"Content-Type"}

const proxyBasePath = "/proxy"

type KubeAPIProxy struct {
	kubeClients         *clients.KubeClients
	websocketScheme     string
	reverseProxy        *httputil.ReverseProxy
	websocketProxy      *WebsocketProxy
	multiKindWatchProxy *KubeKindAggregatingWatchProxy
	traceRequests       bool
	traceWebsockets     bool
}

func NewKubeAPIProxy(kubeClients *clients.KubeClients,
	traceRequests, traceWebsockets bool, kindLister *KindsProxy,
	namespaceLister *NamespaceProxy, accessAggregator *AccessAggregator) (*KubeAPIProxy, error) {

	transportConfig, err := kubeClients.Config.TransportConfig()
	if err != nil {
		return nil, fmt.Errorf("Failed to resolve transport config; %v", err)
	}

	tlsConfig, err := kube_transport.TLSConfigFor(transportConfig)
	if err != nil {
		return nil, fmt.Errorf("Failed to resolve TLS config; %v", err)
	}

	transport := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		Dial: (&net.Dialer{
			Timeout:   5 * time.Second,
			KeepAlive: 30 * time.Second,
		}).Dial,
		TLSHandshakeTimeout: 5 * time.Second,
		TLSClientConfig:     tlsConfig,
	}

	wsURL, _ := url.Parse(kubeClients.BaseURL.String())
	if wsURL.Scheme == "https" {
		wsURL.Scheme = "wss"
	} else {
		wsURL.Scheme = "ws"
	}

	wsp := NewWebsocketProxy(wsURL, traceWebsockets)
	wsp.Upgrader = &websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
	}
	wsp.Director = func(incoming *http.Request, out http.Header) {
		for k, v := range incoming.Header {
			if k == v1.ImpersonateUserHeader || k == v1.ImpersonateGroupHeader || strings.HasPrefix(k, v1.ImpersonateUserExtraHeaderPrefix) {
				out[k] = v
			}
		}
		out.Set("Origin", kubeClients.BaseURL.String())
		if len(kubeClients.BearerToken) > 0 {
			out.Set("Authorization", fmt.Sprintf("Bearer %s", string(kubeClients.BearerToken)))
		}
	}
	wsp.Dialer = &websocket.Dialer{
		HandshakeTimeout: 5 * time.Second,
		TLSClientConfig:  tlsConfig,
		ReadBufferSize:   1024,
		WriteBufferSize:  1024,
	}

	mwp := NewKubeKindAggregatingWatchProxy(wsURL, traceWebsockets, kindLister, namespaceLister, accessAggregator)
	mwp.Dialer = wsp.Dialer
	mwp.Upgrader = wsp.Upgrader
	mwp.Director = wsp.Director

	log.Infof("Enabled kubernetes api proxy for %v", kubeClients.BaseURL)

	kp := &KubeAPIProxy{
		kubeClients:         kubeClients,
		reverseProxy:        httputil.NewSingleHostReverseProxy(kubeClients.BaseURL),
		websocketProxy:      wsp,
		multiKindWatchProxy: mwp,
		traceRequests:       traceRequests,
		traceWebsockets:     traceWebsockets,
	}

	if traceRequests {
		log.Infof("KubeAPIProxy: tracing requests...")
	}
	if traceWebsockets {
		log.Infof("KubeAPIProxy: tracing websockets...")
	}

	kp.reverseProxy.Director = kp.filterRequest
	kp.reverseProxy.Transport = transport

	return kp, nil
}

// ProxyRequest proxies the request
func (p *KubeAPIProxy) ProxyRequest(w http.ResponseWriter, r *http.Request, authContext auth.Context) {

	if strings.HasPrefix(r.URL.Scheme, "ws") || strings.ToLower(r.Header.Get("Connection")) == "upgrade" {
		r.Header.Set("Origin", p.kubeClients.BaseURL.String())
		if len(r.Header.Get("User-Agent")) == 0 {
			r.Header.Set("User-Agent", "kuill")
		}
		p.traceRequest(r, authContext, p.traceWebsockets)
		authContext.Impersonate(r.Header)

		if r.URL.Path == "/proxy/_/multiwatch" {
			p.multiKindWatchProxy.AggregateWatches(w, r, authContext)
		} else {
			r.URL.Path = strings.Replace(r.URL.Path, proxyBasePath, "", 1)
			r.URL.RawPath = strings.Replace(r.URL.RawPath, proxyBasePath, "", 1)
			p.websocketProxy.ServeHTTP(w, r)
		}
	} else {
		p.reverseProxy.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), auth.ContextKey, authContext)))
	}
}

func (p *KubeAPIProxy) filterRequest(r *http.Request) {
	r.URL.Path = strings.Replace(r.URL.Path, proxyBasePath, "", 1)
	r.URL.RawPath = strings.Replace(r.URL.RawPath, proxyBasePath, "", 1)
	r.URL.Scheme = p.kubeClients.BaseURL.Scheme
	r.URL.Host = p.kubeClients.BaseURL.Host
	if _, ok := r.Header["User-Agent"]; !ok {
		// explicitly disable User-Agent so it's not set to default value
		r.Header.Set("User-Agent", "")
	}
	r.Header.Set("Origin", p.kubeClients.BaseURL.String())
	authContext := r.Context().Value(auth.ContextKey).(auth.Context)
	p.traceRequest(r, authContext, p.traceWebsockets)
	authContext.Impersonate(r.Header)
}

func (p *KubeAPIProxy) traceRequest(r *http.Request, authContext auth.Context, trace bool) {

	if trace {
		lctx := log.WithFields(log.Fields{
			"method": "ProxyRequest",
			"req":    r.URL.String(),
		})

		data, err := httputil.DumpRequest(r, r.Method == "POST" || r.Method == "PUT" || r.Method == "PATCH")
		if err != nil {
			lctx.Warnf("Error dumping request : %v", err)
		} else {
			lctx.Infof("Proxying request for %s: %s\n%s", authContext.User(), r.URL, string(data))
		}
	}
}
