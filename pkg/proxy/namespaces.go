package proxy

import (
	"encoding/json"
	"net/http"

	"github.com/matt-deboer/kuill/pkg/clients"
	log "github.com/sirupsen/logrus"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// ServeNamespaces provides version information for kuill
func ServeNamespaces(kubeClients *clients.KubeClients) (*NamespaceLister, error) {
	ns := &NamespaceLister{kubeClients}
	http.HandleFunc("/proxy/_/namespaces", ns.serve)
	return ns, nil
}

type NamespaceLister struct {
	kubeClients *clients.KubeClients
}

type nsList struct {
	Namespaces []string `json:"namespaces"`
}

func (n *NamespaceLister) getNamespaces() ([]string, error) {
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

func (n *NamespaceLister) serve(w http.ResponseWriter, r *http.Request) {

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
