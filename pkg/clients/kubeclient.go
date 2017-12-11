package clients

import (
	"fmt"
	"io/ioutil"
	"net/http"

	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

const serviceAccountTokenFile = "/var/run/secrets/kubernetes.io/serviceaccount/token"

// KubeClients is an aggregation of the set of kubernetes clients and associated configuration
type KubeClients struct {
	Standard    *kubernetes.Clientset
	HTTP        *http.Client
	BaseURL     string
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

	r := stdClient.RESTClient().Get()
	baseURL := fmt.Sprintf("%s://%s", r.URL().Scheme, r.URL().Host)

	return &KubeClients{
		Standard:    stdClient,
		HTTP:        stdClient.RESTClient().(*rest.RESTClient).Client,
		BaseURL:     baseURL,
		Config:      config,
		BearerToken: bearerToken,
	}, nil
}
