package proxy

import (
	"fmt"
	"io/ioutil"
	"net/http"

	"github.com/matt-deboer/kuill/pkg/clients"
	log "github.com/sirupsen/logrus"
)

// NewSwaggerProxy provides swagger information for kuill
func NewSwaggerProxy(kubeClients *clients.KubeClients) *SwaggerProxy {
	return &SwaggerProxy{kubeClients}
}

type SwaggerProxy struct {
	kubeClients *clients.KubeClients
}

func (s *SwaggerProxy) Serve(w http.ResponseWriter, r *http.Request) {

	req, err := http.NewRequest("GET", fmt.Sprintf("%s/swagger.json", s.kubeClients.BaseURL), nil)
	if err != nil {
		log.Errorf("Failed to create request for swagger.json: %v", err)
	} else {
		if len(s.kubeClients.BearerToken) > 0 {
			req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.kubeClients.BearerToken))
		}
		resp, err := s.kubeClients.HTTP.Do(req)
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
