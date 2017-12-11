package proxy

import "github.com/matt-deboer/kuill/pkg/clients"

// SetupAggregators creates aggregator/helper proxies for
// kubernetes API resources as needed by the UI
func SetupAggregators(kubeClients *clients.KubeClients) (*KindLister, *NamespaceLister, error) {

	kindLister, err := ServeKinds(kubeClients)
	if err != nil {
		return nil, nil, err
	}
	nsLister, err := ServeNamespaces(kubeClients)
	if err != nil {
		return nil, nil, err
	}
	err = ServeAPIModels(kubeClients)
	if err != nil {
		return nil, nil, err
	}
	return kindLister, nsLister, nil
	// ServeAccessReview(kubeClients)
}
