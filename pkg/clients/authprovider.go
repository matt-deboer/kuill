package clients

import (
	"errors"
	"net/http"

	log "github.com/sirupsen/logrus"
	"k8s.io/client-go/rest"
)

func init() {
	if err := rest.RegisterAuthProviderPlugin("kuill", newAuthProvider); err != nil {
		log.Fatalf("Failed to register kuill auth plugin: %v", err)
	}
}

func newAuthProvider(_ string, cfg map[string]string, persister rest.AuthProviderConfigPersister) (rest.AuthProvider, error) {
	return &kuillKubeClientAuthProvider{}, nil
}

type kuillKubeClientAuthProvider struct {
}

func (p *kuillKubeClientAuthProvider) Login() error {
	return errors.New("not yet implemented")
}

func (p *kuillKubeClientAuthProvider) WrapTransport(rt http.RoundTripper) http.RoundTripper {
	return rt
}
