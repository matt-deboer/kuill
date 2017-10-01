package helpers

import (
	"fmt"
	"io/ioutil"
	"net/http"

	"github.com/ericchiang/k8s"
	"github.com/prometheus/common/log"
)

// ServeApiModels provides swagger information for kuill
func ServeApiModels(kubeconfig string) error {

	client, _, err := NewKubeClient(kubeconfig)
	if err != nil {
		return err
	}
	s := &swaggerLister{client}
	http.HandleFunc("/proxy/swagger.json", s.serveSwagger)
	return nil
}

type swaggerLister struct {
	client *k8s.Client
}

func (s *swaggerLister) serveSwagger(w http.ResponseWriter, r *http.Request) {

	req, err := http.NewRequest("GET", fmt.Sprintf("%s/swagger.json", s.client.Endpoint), nil)
	if err != nil {
		log.Errorf("Failed to create request for swagger.json: %v", err)
	} else {
		resp, err := s.client.Client.Do(req)
		if err == nil {
			if resp != nil {
				defer resp.Body.Close()
				b, err := ioutil.ReadAll(resp.Body)
				if err != nil {
					log.Errorf("Failed to read response body: %v", err)
				}
				w.Header().Set("Content-Type", resp.Header.Get("Content-Type"))
				w.Write(b)
				return
			}
		} else {
			log.Errorf("Failed to read swagger.json: %v", err)
		}
	}
	w.WriteHeader(500)
}
