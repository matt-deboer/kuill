package proxy

import (
	"encoding/json"
	"net/http"

	"github.com/matt-deboer/kuill/pkg/clients"
	log "github.com/sirupsen/logrus"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// NewNamespacesProxy creates a new NamespaceProxy which simply returns a
// list of all known namespaces
func NewNamespacesProxy(kubeClients *clients.KubeClients) *NamespaceProxy {
	return &NamespaceProxy{kubeClients}
}

type NamespaceProxy struct {
	kubeClients *clients.KubeClients
}

type nsList struct {
	Namespaces []string `json:"namespaces"`
}

func (n *NamespaceProxy) getNamespaces() ([]string, error) {
	var list []string
	nss, err := n.kubeClients.Standard.Core().Namespaces().List(metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	for _, ns := range nss.Items {
		list = append(list, ns.ObjectMeta.Name)
	}
	return list, nil
}

func (n *NamespaceProxy) Serve(w http.ResponseWriter, r *http.Request) {

	var list nsList
	nss, err := n.getNamespaces()
	if err == nil {
		list.Namespaces = nss
		data, merr := json.Marshal(list)
		if merr == nil {
			w.Header().Set("Content-Type", "application/json")
			w.Write(data)
			return
		}
		err = merr
	}
	log.Error(err)
	http.Error(w, "Failed to recover namespaces", http.StatusInternalServerError)
}
