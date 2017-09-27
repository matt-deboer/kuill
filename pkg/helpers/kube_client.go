package helpers

import (
	"fmt"
	"io/ioutil"

	"github.com/ericchiang/k8s"
	"github.com/ghodss/yaml"
	log "github.com/sirupsen/logrus"
)

const serviceAccountTokenFile = "/var/run/secrets/kubernetes.io/serviceaccount/token"

// NewKubeClient constructs a new kubernetes client using the provided
// kubeconfig file path; uses in-cluster config when kubeconfig is empty
func NewKubeClient(kubeconfig string) (client *k8s.Client, bearerToken []byte, err error) {

	if len(kubeconfig) > 0 {
		data, err := ioutil.ReadFile(kubeconfig)
		if err != nil {
			return nil, nil, fmt.Errorf("read kubeconfig: %v", err)
		}

		// Unmarshal YAML into a Kubernetes config object.
		var config k8s.Config
		if err := yaml.Unmarshal(data, &config); err != nil {
			return nil, nil, fmt.Errorf("unmarshal kubeconfig: %v", err)
		}

		log.Infof("Using kubeconfig %s", kubeconfig)
		client, err = k8s.NewClient(&config)
		if err != nil {
			return nil, nil, err
		}
	} else {
		log.Infof("Using in-cluster kubeconfig")
		client, err = k8s.NewInClusterClient()
		if err != nil {
			return nil, nil, err
		}
		bearerToken, err = ioutil.ReadFile(serviceAccountTokenFile)
		if err != nil {
			return nil, nil, fmt.Errorf("Failed to read service account token file %s: %v", serviceAccountTokenFile, err)
		}
		if log.GetLevel() >= log.DebugLevel {
			log.Debugf("Got serviceaccount token: '%s'", string(bearerToken))
		}
	}
	return client, bearerToken, nil
}
