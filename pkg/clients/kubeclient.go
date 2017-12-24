package clients

import (
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
}

// Create builds a new set of kubernetes clients and configuration
func Create(kubeConfig string) (*KubeClients, error) {
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

	return &KubeClients{
		Standard:    stdClient,
		HTTP:        stdClient.RESTClient().(*rest.RESTClient).Client,
		BaseURL:     baseURL,
		Config:      config,
		BearerToken: bearerToken,
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

// StandardClientFor creates a new standard client configured for the specified authContext
func (k *KubeClients) StandardClientFor(authContext auth.Context) (*kubernetes.Clientset, error) {
	config := k.ConfigForUser(authContext)
	return kubernetes.NewForConfig(&config)
}

// ConfigForUser produces a configuration which includes impersonation based on the provided auth context
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
