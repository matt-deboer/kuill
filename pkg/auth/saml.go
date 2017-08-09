package auth

import (
	"crypto/rsa"
	"crypto/tls"
	"crypto/x509"
	"encoding/pem"
	"encoding/xml"
	"fmt"
	"net/http"
	"net/url"
	"path"
	"strings"

	"github.com/crewjam/saml"
	"github.com/crewjam/saml/samlsp"
	jwt "github.com/dgrijalva/jwt-go"
	log "github.com/sirupsen/logrus"
)

type samlHandler struct {
	name            string
	nonce           string
	samlSP          *samlsp.Middleware
	idpMetadata     *metadataSummary
	groupsAttribute string
	groupsDelimiter string
}

type metadataSummary struct {
	ssoLoginURL  string
	signingCerts []*x509.Certificate
	issuerID     string
}

func NewSamlHandler(publicURL, privateKeyFile, certFile, idpShortName, IDPMetadataURL, groupsAttribute, groupsDelimiter string) (Authenticator, error) {

	pu, err := url.Parse(publicURL)
	if err != nil {
		return nil, fmt.Errorf("Failed to parse public url '%s'; %v", publicURL, err)
	}

	idpu, err := url.Parse(IDPMetadataURL)
	if err != nil {
		return nil, fmt.Errorf("Failed to parse idp-metadata-url '%s'; %v", IDPMetadataURL, err)
	}

	keyPair, err := tls.LoadX509KeyPair(certFile, privateKeyFile)
	if err != nil {
		return nil, fmt.Errorf("Failed to load keypair cert='%s', key='%s'; %v", certFile, privateKeyFile, err)
	}
	keyPair.Leaf, err = x509.ParseCertificate(keyPair.Certificate[0])
	if err != nil {
		return nil, fmt.Errorf("Failed to parse certificate for cert='%s', key='%s'; %v", certFile, privateKeyFile, err)
	}

	idpMetadata, err := getIDPMetadata(IDPMetadataURL)
	if err != nil {
		return nil, err
	}

	s := &samlHandler{
		name:        idpShortName,
		idpMetadata: idpMetadata,
	}

	s.samlSP, err = samlsp.New(samlsp.Options{

		URL:               *pu,
		Key:               keyPair.PrivateKey.(*rsa.PrivateKey),
		Certificate:       keyPair.Leaf,
		IDPMetadataURL:    idpu,
		AllowIDPInitiated: true,
	})
	http.HandleFunc(path.Join(s.LoginURL(), "metadata"), s.Metadata)

	if err != nil {
		return nil, fmt.Errorf("Failed to parse idp-metadata-url '%s'; %v", IDPMetadataURL, err)
	}

	return s, nil
}

func getIDPMetadata(metadataURL string) (*metadataSummary, error) {
	resp, err := http.Get(metadataURL)
	if err != nil {
		return nil, fmt.Errorf("Failed to fetch saml metadata from '%s'; %v", metadataURL, err)
	} else if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Failed to fetch saml metadata from '%s'; %v", metadataURL, resp.StatusCode)
	}
	var metadata saml.EntitiesDescriptor
	err = xml.NewDecoder(resp.Body).Decode(&metadata)
	if err != nil {
		return nil, fmt.Errorf("Failed to decode entity descriptor: %v", err)
	}

	summary := &metadataSummary{
		issuerID: metadata.EntityDescriptors[0].EntityID,
	}

	for _, idpSSODescriptor := range metadata.EntityDescriptors[0].IDPSSODescriptors {
		// Extract the signing key(s)
		summary.signingCerts = append(summary.signingCerts, extractKeys(idpSSODescriptor)...)
		// Extract the SSO login endpoint
		if len(idpSSODescriptor.SingleSignOnServices) > 0 {
			summary.ssoLoginURL = idpSSODescriptor.SingleSignOnServices[0].Location
		} else {
			return nil, fmt.Errorf("Metadata contains no SSO descriptors")
		}
	}

	return summary, nil
}

func extractKeys(d saml.IDPSSODescriptor) []*x509.Certificate {
	certs := []*x509.Certificate{}
	for _, keyDesc := range d.KeyDescriptors {
		if keyDesc.Use == "signing" || keyDesc.Use == "" {

			pemBytes := []byte("-----BEGIN RSA PRIVATE KEY-----\n" +
				string(keyDesc.KeyInfo.Certificate) +
				"\n-----END CERTIFICATE-----")

			pemBlock, rest := pem.Decode(pemBytes)
			if rest != nil {
				log.Errorf("Failed to decode signing cert from pem bytes %v", string(pemBytes))
			} else {
				cert, err := x509.ParseCertificate(pemBlock.Bytes)
				if err != nil {
					log.Errorf("Failed to parse signing certificate; %v", err)
				} else {
					certs = append(certs, cert)
				}
			}
		}
	}
	return certs
}

// Name returns the name of this authenticator
func (s *samlHandler) Name() string {
	return s.name
}

// Description returns the user-friendly description of this authenticator
func (s *samlHandler) Description() string {
	return s.name
}

// Type returns the type of this authenticator
func (s *samlHandler) Type() string {
	return "saml"
}

// LoginURL returns the initial login URL for this handler
func (s *samlHandler) LoginURL() string {
	return path.Join("/", "auth", s.Type(), s.Name())
}

// PostWithCredentials returns true if this authenticator expects username/password credentials be POST'd
func (s *samlHandler) PostWithCredentials() bool {
	return true
}

// IconURL returns an icon URL to signify this login method; empty string implies a default can be used
func (s *samlHandler) IconURL() string {
	return ""
}

// Metadata returns the metadata for this service provider
func (s *samlHandler) Metadata(w http.ResponseWriter, r *http.Request) {
	buf, _ := xml.MarshalIndent(s.samlSP.ServiceProvider.Metadata(), "", "  ")
	w.Header().Set("Content-Type", "application/samlmetadata+xml")
	w.Write(buf)
}

func (s *samlHandler) Authenticate(w http.ResponseWriter, r *http.Request) (*SessionToken, error) {

	if r.Method == "GET" {
		http.Redirect(w, r, s.idpMetadata.ssoLoginURL, http.StatusTemporaryRedirect)
	} else if r.Method == "POST" {

		r.ParseForm()
		assertion, err := s.samlSP.ServiceProvider.ParseResponse(r, []string{""})
		if err != nil {
			if parseErr, ok := err.(*saml.InvalidResponseError); ok {
				log.Warnf("RESPONSE: ===\n%s\n===\nNOW: %s\nERROR: %s",
					parseErr.Response, parseErr.Now, parseErr.PrivateErr)
			}
			http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
			return nil, nil
		}
		return s.sessionTokenFromAssertion(assertion)

	} else {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
	return nil, nil
}

func (s *samlHandler) sessionTokenFromAssertion(assertion *saml.Assertion) (*SessionToken, error) {

	// TODO: confirm that the assertion has already been validated by this point
	username := assertion.Subject.NameID.Value
	groups := []string{}
	for _, ast := range assertion.AttributeStatements {
		for _, attr := range ast.Attributes {
			if s.groupsAttribute == attr.FriendlyName || s.groupsAttribute == attr.Name {
				for _, attrVal := range attr.Values {
					if len(s.groupsDelimiter) > 0 {
						groups = append(groups, strings.Split(attrVal.Value, s.groupsDelimiter)...)
					} else {
						groups = append(groups, attrVal.Value)
					}
				}
			}
		}
	}
	return NewSessionToken(username, groups, jwt.MapClaims{
		"s2i": assertion.Issuer.Value,
	}), nil
}
