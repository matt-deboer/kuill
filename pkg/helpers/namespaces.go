package helpers

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/ericchiang/k8s"
	"github.com/prometheus/common/log"
)

// ServeNamespaces provides version information for kuill
func ServeNamespaces(kubeconfig string) error {

	client, err := NewKubeClient(kubeconfig)
	if err != nil {
		return err
	}
	nsLister := &nsLister{client}
	http.HandleFunc("/namespaces", nsLister.serveNamespaces)
	return nil
}

type nsLister struct {
	client *k8s.Client
}

type nsList struct {
	Namespaces []string `json:"namespaces"`
}

func (n *nsLister) serveNamespaces(w http.ResponseWriter, r *http.Request) {

	var list nsList
	nss, err := n.client.CoreV1().ListNamespaces(context.Background())
	if err != nil {
		log.Error(err)
	}
	for _, ns := range nss.GetItems() {
		list.Namespaces = append(list.Namespaces, ns.GetMetadata().GetName())
	}
	data, err := json.Marshal(list)
	if err != nil {
		log.Error(err)
	} else {
		w.Header().Set("Content-Type", "application/json")
		w.Write(data)
	}
}
