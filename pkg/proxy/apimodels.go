package proxy

import (
	"encoding/json"
	"net/http"

	"github.com/matt-deboer/kuill/pkg/clients"
	log "github.com/sirupsen/logrus"
)

// ServeAPIModels provides swagger information for kuill
func ServeAPIModels(kubeClients *clients.KubeClients) error {
	s := &swaggerLister{kubeClients}
	http.HandleFunc("/proxy/swagger.json", s.serveSwagger)
	return nil
}

type swaggerLister struct {
	kubeClients *clients.KubeClients
}

func (s *swaggerLister) serveSwagger(w http.ResponseWriter, r *http.Request) {

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
	// req, err := http.NewRequest("GET", fmt.Sprintf("%s/swagger.json", s.kubeClient.Client), nil)
	// if err != nil {
	// 	log.Errorf("Failed to create request for swagger.json: %v", err)
	// } else {
	// 	if len(s.bearerToken) > 0 {
	// 		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.bearerToken))
	// 	}
	// 	resp, err := s.client.Client.Do(req)
	// 	if err == nil {
	// 		if resp != nil {
	// 			defer resp.Body.Close()
	// 			b, err := ioutil.ReadAll(resp.Body)
	// 			if err != nil {
	// 				log.Errorf("Failed to read response body: %v", err)
	// 			}
	// 			w.Header().Set("Content-Type", resp.Header.Get("Content-Type"))
	// 			w.Write(b)
	// 			return
	// 		}
	// 	} else {
	// 		log.Errorf("Failed to read swagger.json: %v", err)
	// 	}
	// }
	// w.WriteHeader(500)
}
