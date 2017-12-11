package proxy

import (
	"net/http"
	"sync"

	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/rest"

	"github.com/matt-deboer/kuill/pkg/auth"
	"github.com/matt-deboer/kuill/pkg/clients"
	log "github.com/sirupsen/logrus"
	meta_v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

type ResourceLister struct {
	kubeClients     *clients.KubeClients
	authManager     *auth.Manager
	kindLister      *KindLister
	namespaceLister *NamespaceLister
	bearerToken     string
}

func ServeResources(kubeClients *clients.KubeClients, authManager *auth.Manager, kindLister *KindLister, namespaceLister *NamespaceLister) error {
	l := &ResourceLister{
		authManager:     authManager,
		kindLister:      kindLister,
		namespaceLister: namespaceLister,
		kubeClients:     kubeClients,
	}
	http.HandleFunc("/proxy/_/resources/list", authManager.NewAuthDelegate(l.ListResources))
	return nil
}

type resourceLists struct {
	Lists []runtime.Object `json:"lists"`
}

// ListResources fetches all resources visible to the authenticated user and returns them in a single response list
func (l *ResourceLister) ListResources(w http.ResponseWriter, r *http.Request, authContext auth.Context) {
	namespaces, err := l.namespaceLister.getNamespaces()
	if err != nil {
		http.Error(w, "Failed to list namespaces", http.StatusInternalServerError)
		return
	}

	lists := make(chan runtime.Object, len(l.kindLister.kinds)*len(namespaces))
	var wg sync.WaitGroup

	l.kindLister.mutex.RLock()
	for _, kind := range l.kindLister.kinds {
		wg.Add(1)
		go l.fetchKind(kind, "", namespaces, lists, &wg, nil)
	}
	l.kindLister.mutex.RUnlock()

	wg.Wait()
	// wait for all results:

}

func (l *ResourceLister) fetchKind(kind *KubeKind, namespace string, namespaces []string, lists chan runtime.Object, wg *sync.WaitGroup, dynClient *dynamic.Client) {

	var err error
	if dynClient == nil {
		var config rest.Config
		l.kubeClients.Config.DeepCopyInto(&config.TLSClientConfig)
		config.GroupVersion = &schema.GroupVersion{
			Group:   kind.Group,
			Version: kind.Version,
		}
		dynClient, err = dynamic.NewClient(&config)
		if err != nil {
			log.Fatalf("Failed to create dynamic client for config %v; %v", config, err)
		}
	}

	obj, err := dynClient.Resource(&kind.APIResource, namespace).List(meta_v1.ListOptions{})
	if err != nil {
		log.Warnf("Error fetching %s (namespace: %s); %v", err)
		if kind.Namespaced && namespace == "" {
			for _, namespace := range namespaces {
				wg.Add(1)
				go l.fetchKind(kind, namespace, namespaces, lists, wg, dynClient)
			}
		}
	} else {
		lists <- obj
	}
	wg.Done()
}
