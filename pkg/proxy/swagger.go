package proxy

import (
	"encoding/json"
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

	swaggerDoc, err := s.kubeClients.Standard.Discovery().OpenAPISchema()
	if err == nil {
		data, err := json.Marshal(swaggerDoc)
		if err != nil {
			log.Errorf("Failed to read swagger.json: %v", err)
		} else {
			w.Header().Set("Content-Type", "application/json")
			w.Write(data)
		}
	} else {
		log.Errorf("Failed to read swagger.json: %v", err)
	}
}
