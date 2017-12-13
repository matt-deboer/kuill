package proxy

import (
	"encoding/json"
	"net/http"
	"strings"
	"sync"

	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/rest"

	"github.com/matt-deboer/kuill/pkg/auth"
	"github.com/matt-deboer/kuill/pkg/clients"
	log "github.com/sirupsen/logrus"
	"k8s.io/apimachinery/pkg/api/errors"
	meta_v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

type ResourcesProxy struct {
	kubeClients     *clients.KubeClients
	authManager     *auth.Manager
	kindLister      *KindsProxy
	namespaceLister *NamespaceProxy
	bearerToken     string
}

// NewResourcesProxy creates  a new ResourcesProxy object
func NewResourcesProxy(kubeClients *clients.KubeClients, authManager *auth.Manager, kindLister *KindsProxy, namespaceLister *NamespaceProxy) *ResourcesProxy {
	return &ResourcesProxy{
		authManager:     authManager,
		kindLister:      kindLister,
		namespaceLister: namespaceLister,
		kubeClients:     kubeClients,
	}
}

type resourceLists struct {
	Lists []runtime.Object `json:"lists"`
}

// Serve fetches all resources visible to the authenticated user and returns them in a single response list
func (l *ResourcesProxy) Serve(w http.ResponseWriter, r *http.Request, authContext auth.Context) {
	namespaces, err := l.namespaceLister.getNamespaces()
	if err != nil {
		http.Error(w, "Failed to list namespaces", http.StatusInternalServerError)
		return
	}

	lists := make(chan *unstructured.UnstructuredList, len(l.kindLister.kinds)*len(namespaces))
	var wg sync.WaitGroup

	l.kindLister.mutex.RLock()
	for _, kind := range l.kindLister.kinds {
		wg.Add(1)
		go l.fetchKind(kind, "", namespaces, authContext, lists, &wg, nil)
	}
	l.kindLister.mutex.RUnlock()

	wg.Wait()
	// wait for all results:
	var result resourceLists
	// var result resourceLists
AssembleResults:
	for {
		select {
		case list := <-lists:
			result.Lists = append(result.Lists, list)
		default:
			break AssembleResults
		}
	}
	json.NewEncoder(w).Encode(result)
}

func (l *ResourcesProxy) fetchKind(kind *KubeKind, namespace string, namespaces []string,
	authContext auth.Context, lists chan *unstructured.UnstructuredList, wg *sync.WaitGroup,
	dynClient *dynamic.Client) {

	var err error
	if dynClient == nil {
		var config = *l.kubeClients.Config
		l.kubeClients.Config.DeepCopyInto(&config.TLSClientConfig)
		config.Impersonate = rest.ImpersonationConfig{
			UserName: authContext.User(),
			Groups:   authContext.Groups(),
		}
		if strings.Contains(kind.Version, "/") {
			config.APIPath = "/apis"
		}
		config.Host = l.kubeClients.Config.Host
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
		if statusErr, ok := err.(*errors.StatusError); ok {
			if statusErr.ErrStatus.Code == 403 {
				if kind.Namespaced && namespace == "" {
					if log.GetLevel() >= log.DebugLevel {
						log.Debugf("User %s %v cannot list %s at the cluster level; fetching at namespace level...",
							authContext.User(), authContext.Groups(), kind.Plural)
					}
					for _, namespace := range namespaces {
						wg.Add(1)
						go l.fetchKind(kind, namespace, namespaces, authContext, lists, wg, dynClient)
					}
				} else if log.GetLevel() >= log.DebugLevel {
					log.Debugf("User %s %v cannot list %s/%s; %s",
						authContext.User(), authContext.Groups(),
						namespace, kind.Plural, statusErr.ErrStatus.Message)
				}
			}
		} else {
			log.Warnf("Error fetching %s (namespace: '%s'); %v", kind.APIResource.Kind, namespace, err)
		}
	} else if ul, ok := obj.(*unstructured.UnstructuredList); ok && ul.IsList() {
		if len(ul.Items) > 0 {
			lists <- ul
		}
	} else {
		log.Warnf("Received unexpected result (%T): %v", obj, obj)
	}
	wg.Done()
}
