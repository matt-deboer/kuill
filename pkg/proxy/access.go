package proxy

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"

	"k8s.io/client-go/kubernetes"

	"github.com/matt-deboer/kuill/pkg/auth"
	"github.com/matt-deboer/kuill/pkg/clients"
	"github.com/matt-deboer/kuill/pkg/types"
	log "github.com/sirupsen/logrus"
	authorizationapi "k8s.io/api/authorization/v1"
)

// AccessAggregator provides aggregation for the multiple fine-grained
// SubjectAccessReview and SubjectRulesReview requests required in order to
// present a graphical UI over multiple resources and namespaces
type AccessAggregator struct {
	kubeClients     *clients.KubeClients
	authManager     *auth.Manager
	kindLister      *KindsProxy
	namespaceLister *NamespaceProxy
	bearerToken     string
}

func NewAccessProxy(kubeClients *clients.KubeClients,
	authManager *auth.Manager, kindLister *KindsProxy, namespaceLister *NamespaceProxy) *AccessAggregator {
	return &AccessAggregator{
		kubeClients:     kubeClients,
		authManager:     authManager,
		kindLister:      kindLister,
		namespaceLister: namespaceLister,
	}
}

// Serve returns an access permissions summary across all known namespaces for a given
// resource kind or multiple kinds
func (a *AccessAggregator) Serve(w http.ResponseWriter, r *http.Request, authContext auth.Context) {

	kind := r.URL.Query().Get("kind")
	if len(kind) == 0 {
		http.Error(w, "'kind' is required", http.StatusBadRequest)
		return
	}
	namespace := r.URL.Query().Get("namespace")
	name := r.URL.Query().Get("name")
	permissions, err := a.permissionsForResource(kind, namespace, name, authContext)
	if err != nil {
		log.Errorf("Error getting permissions for %s/%s/%s; %v", kind, namespace, name, err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
	}
	json.NewEncoder(w).Encode(permissions)
}

type kindPermissions struct {
	Get    bool `json:"get"`
	Put    bool `json:"put"`
	Delete bool `json:"delete"`
	Logs   bool `json:"logs"`
	Exec   bool `json:"exec"`
}

func (a *AccessAggregator) permissionsForResource(kind, namespace, name string, authContext auth.Context) (*kindPermissions, error) {
	namespaces, err := a.namespaceLister.getNamespaces()
	if err != nil {
		return nil, fmt.Errorf("Failed to list namespaces; %v", err)
	}

	if log.GetLevel() >= log.DebugLevel {
		log.Debugf("Evaluating permissions to %s/%s/%s for user %s %v",
			kind, namespace, name, authContext.User(), authContext.Groups())
	}

	if len(kind) == 0 {
		return nil, fmt.Errorf("'kind' cannot be emptuy")
	}
	kubeKind := a.kindLister.GetKind(kind)
	podKind := a.kindLister.GetKind("Pod")
	permissions := make(chan Permission, 5)
	client, err := a.kubeClients.StandardClientFor(authContext)
	if err != nil {
		return nil, fmt.Errorf("Failed to generate client for auth context %v; %v", authContext, err)
	}

	var wg sync.WaitGroup
	wg.Add(5)
	go a.getAccess(kubeKind, namespace, "", name, "get", namespaces, permissions, client, &wg)
	go a.getAccess(kubeKind, namespace, "", name, "put", namespaces, permissions, client, &wg)
	go a.getAccess(kubeKind, namespace, "", name, "delete", namespaces, permissions, client, &wg)
	go a.getAccess(podKind, namespace, "log", "", "get", namespaces, permissions, client, &wg)
	go a.getAccess(podKind, namespace, "exec", "", "get", namespaces, permissions, client, &wg)
	go func() {
		wg.Wait()
		close(permissions)
	}()

	var result kindPermissions
	for permission := range permissions {
		if permission.Subresource == "log" && permission.Verb == "get" {
			result.Logs = true
		} else if permission.Subresource == "exec" && permission.Verb == "get" {
			result.Exec = true
		} else if permission.Verb == "put" {
			result.Put = true
		} else if permission.Verb == "delete" {
			result.Delete = true
		} else if permission.Verb == "get" {
			result.Get = true
		}
	}
	return &result, nil
}

// Permission represents permission to perform a specific action
// on a kind in a namespace, with an optional subresource
type Permission struct {
	Kind        *types.KubeKind
	Namespace   string
	Verb        string
	Subresource string
}

// test the user's access to a particular resource; if acess is not granted at
// the cluster scope, make recursive tests over each namespace provided in the
// namespaces array
//
// TODO: we may need to inspect roles and rolebindings directly as the current
// approach (although prescribed by the kube api) will not scale under a large
// number of namespaces
func (a *AccessAggregator) getAccess(kubeKind *types.KubeKind, namespace, subresource, name, verb string,
	namespaces []string, results chan Permission, client *kubernetes.Clientset, wg *sync.WaitGroup) {

	attrs := &authorizationapi.ResourceAttributes{
		Group:     "",
		Namespace: namespace,
		Resource:  kubeKind.Plural,
		Verb:      verb,
		Version:   "*",
	}

	if strings.HasPrefix(kubeKind.APIBase, "apis/") {
		attrs.Group = strings.Split(kubeKind.APIBase, "/")[1]
	}

	if len(subresource) > 0 {
		attrs.Subresource = subresource
	}

	if len(name) > 0 {
		attrs.Name = name
	}

	result, err := client.Authorization().SelfSubjectAccessReviews().Create(
		&authorizationapi.SelfSubjectAccessReview{
			Spec: authorizationapi.SelfSubjectAccessReviewSpec{
				ResourceAttributes: attrs,
			},
		})

	if err != nil {
		log.Errorf("Error while testing access to %s %s %s in namespace '%s'; %v",
			verb, kubeKind.Plural, subresource, namespace, err)
	} else if !result.Status.Allowed {
		if namespace == "" {
			if log.GetLevel() >= log.DebugLevel {
				log.Debugf("Not allowed to '%s' %s at the cluster scope; testing namespace access...",
					verb, kubeKind.Plural)
			}
			wg.Add(len(namespaces))
			for _, ns := range namespaces {
				go a.getAccess(kubeKind, ns, subresource, name, verb,
					namespaces, results, client, wg)
			}
		} else if log.GetLevel() >= log.DebugLevel {
			log.Debugf("Not allowed to '%s' %s in namespace %s; testing namespace access...",
				verb, kubeKind.Plural, namespace)
		}
	} else {
		results <- Permission{
			Kind:        kubeKind,
			Verb:        verb,
			Namespace:   namespace,
			Subresource: subresource,
		}
	}
	if wg != nil {
		wg.Done()
	}
}
