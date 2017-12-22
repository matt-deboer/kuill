package clients

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"strings"

	"github.com/matt-deboer/kuill/pkg/auth"
	"github.com/matt-deboer/kuill/pkg/types"
	log "github.com/sirupsen/logrus"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

const serviceAccountTokenFile = "/var/run/secrets/kubernetes.io/serviceaccount/token"

// KubeClients is an aggregation of the set of kubernetes clients and associated configuration
type KubeClients struct {
	Standard    *kubernetes.Clientset
	HTTP        *http.Client
	BaseURL     *url.URL
	BearerToken []byte
	Config      *rest.Config
	TLSConfig   *tls.Config
}

// Create builds a new set of kubernetes clients and configuration
func Create(kubeConfig string, clientCA, clientCert, clientKey string) (*KubeClients, error) {
	var config *rest.Config
	var bearerToken []byte
	var err error
	if len(kubeConfig) > 0 {
		config, err = clientcmd.BuildConfigFromFlags("", kubeConfig)
		if err != nil {
			return nil, err
		}
	} else {
		config, err = rest.InClusterConfig()
		if err != nil {
			return nil, err
		}
		bearerToken, err = ioutil.ReadFile(serviceAccountTokenFile)
		if err != nil {
			return nil, fmt.Errorf("Failed to read service account token file %s: %v", serviceAccountTokenFile, err)
		}
	}

	config.TLSClientConfig = rest.TLSClientConfig{
		CAFile:   clientCA,
		CertFile: clientCert,
		KeyFile:  clientKey,
	}
	config.CAFile = clientCA
	config.CertFile = clientCert
	config.KeyFile = clientKey

	stdClient, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("Failed to create standard kube client; %v", err)
	}
	config.GroupVersion = &schema.GroupVersion{}

	b := *stdClient.RESTClient().Get().URL() // copy the base url
	baseURL := &b
	baseURL.Path = ""
	baseURL.RawPath = ""
	baseURL.RawQuery = ""
	if log.GetLevel() >= log.DebugLevel {
		log.Debugf("Kubernetes API baseURL: '%s'", baseURL.String())
	}

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

	return &KubeClients{
		Standard:    stdClient,
		HTTP:        stdClient.RESTClient().(*rest.RESTClient).Client,
		BaseURL:     baseURL,
		Config:      config,
		BearerToken: bearerToken,
		TLSConfig:   tlsConfig,
	}, nil
}

// DynamicClientFor creates a new dynamic client configured for the specified
// authContext and kind
func (k *KubeClients) DynamicClientFor(authContext auth.Context, kind *types.KubeKind) (*dynamic.Client, error) {

	config := k.ConfigForUser(authContext)
	if strings.Contains(kind.Version, "/") {
		config.APIPath = "/apis"
	}
	config.GroupVersion = &schema.GroupVersion{
		Group:   kind.Group,
		Version: kind.Version,
	}
	return dynamic.NewClient(&config)
}

func (k *KubeClients) ConfigForUser(authContext auth.Context) rest.Config {
	var config = *k.Config
	k.Config.DeepCopyInto(&config.TLSClientConfig)
	config.Impersonate = rest.ImpersonationConfig{
		UserName: authContext.User(),
		Groups:   authContext.Groups(),
	}
	config.Host = k.Config.Host
	return config
}
