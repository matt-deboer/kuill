package proxy

import (
	"fmt"
	"net/http"
	"sync"

	"github.com/matt-deboer/kuill/pkg/auth"
	"github.com/matt-deboer/kuill/pkg/clients"
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

	r.URL.Query().Get("kind")

	// get: [namespaces]
	// put: [namespaces]
	// delete: [namespaces]
	// logs: [namespaces]
	// exec: [namespaces]

}

// WatchableAPIResource represents a resource for which the current user has
// 'watch' permissions, along with the namespaces in which the permission is
// granted; empty/omitted 'namespaces' list signifies permission to watch at
// the cluster scope
type WatchableAPIResource struct {
	*KubeKind
	Namespaces []string `json:"namespaces,omitempty"`
}

// Permission represents permission to perform a specific action
// on a kind in a namespace, with an optional subresource
type Permission struct {
	Kind        string
	Namespace   string
	Verb        string
	Subresource string
}

// GetWatchableResources returns a map of Kind => WatchableAPIResource
// representing all resources (and associated namespaces) for which the
// user specified in the provided authContext has permission to watch
func (a *AccessAggregator) GetWatchableResources(authContext auth.Context) (watchableKinds map[string]*WatchableAPIResource, count int, err error) {

	namespaces, err := a.namespaceLister.getNamespaces()
	if err != nil {
		return nil, 0, fmt.Errorf("Failed to list namespaces; %v", err)
	}

	watchable := make(chan Permission, len(a.kindLister.kinds)*len(namespaces))

	var wg sync.WaitGroup
	a.kindLister.mutex.RLock()
	for _, kind := range a.kindLister.kinds {
		wg.Add(1)
		go a.getAccess(kind.Kind, "", kind.Plural, "", "", "watch", namespaces, authContext, watchable, &wg)
	}
	a.kindLister.mutex.RUnlock()
	wg.Wait()

	result := make(map[string]*WatchableAPIResource)
AssembleResults:
	for {
		select {
		case permission := <-watchable:
			count++
			if w, exists := result[permission.Kind]; exists {
				w.Namespaces = append(w.Namespaces, permission.Namespace)
			} else {
				result[permission.Kind] = &WatchableAPIResource{
					KubeKind:   a.kindLister.GetKind(permission.Kind),
					Namespaces: []string{permission.Namespace},
				}
			}
		default:
			break AssembleResults
		}
	}
	return result, count, nil
}

func (a *AccessAggregator) getAccess(kind, namespace, resource, subresource, name, verb string,
	namespaces []string, authContext auth.Context, results chan Permission, wg *sync.WaitGroup) {

	attrs := &authorizationapi.ResourceAttributes{
		Group:     "*",
		Namespace: namespace,
		Resource:  resource,
		Verb:      verb,
		Version:   "*",
	}
	if len(subresource) > 0 {
		attrs.Subresource = subresource
	}
	if len(name) > 0 {
		attrs.Name = name
	}

	var status authorizationapi.SubjectAccessReviewStatus
	var err error
	if namespace == "" {
		result, serr := a.kubeClients.Standard.Authorization().SubjectAccessReviews().Create(
			&authorizationapi.SubjectAccessReview{
				Spec: authorizationapi.SubjectAccessReviewSpec{
					User:               authContext.User(),
					Groups:             authContext.Groups(),
					ResourceAttributes: attrs,
				},
			})
		if result != nil {
			status = result.Status
		} else {
			err = serr
		}
	} else {
		result, serr := a.kubeClients.Standard.Authorization().LocalSubjectAccessReviews(namespace).Create(
			&authorizationapi.LocalSubjectAccessReview{
				Spec: authorizationapi.SubjectAccessReviewSpec{
					User:               authContext.User(),
					Groups:             authContext.Groups(),
					ResourceAttributes: attrs,
				},
			})
		if result != nil {
			status = result.Status
		} else {
			err = serr
		}
	}

	if err != nil {
		log.Errorf("Error while testing access to %s %s %s in namespace '%s'; %v",
			verb, resource, subresource, namespace, err)
	} else if !status.Allowed {
		if namespace == "" {
			if log.GetLevel() >= log.DebugLevel {
				log.Debugf("Not allowed to '%s' %s at the cluster scope; testing namespace access...",
					verb, resource)
			}
			wg.Add(len(namespaces))
			for _, ns := range namespaces {
				go a.getAccess(kind, ns, resource, subresource, name, verb,
					namespaces, authContext, results, wg)
			}
		}
	} else {
		results <- Permission{
			Kind:        kind,
			Verb:        verb,
			Namespace:   namespace,
			Subresource: subresource,
		}
	}

	wg.Done()
}
