package auth

import (
	"bytes"
	"crypto/rsa"
	"crypto/tls"
	"crypto/x509"
	"encoding/base64"
	"encoding/xml"
	"fmt"
	"io/ioutil"
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
	description     string
	nonce           string
	samlSP          *samlsp.Middleware
	idpMetadata     *metadataSummary
	groupsAttribute string
	groupsDelimiter string
	iconURL         string
}

type metadataSummary struct {
	ssoLoginURL  string
	signingCerts []*x509.Certificate
	issuerID     string
}

// NewSamlHandler creates a new SAML authentication handler
func NewSamlHandler(publicURL, privateKeyFile, certFile, idpShortName, idpDescription, idpMetadataURL, groupsAttribute, groupsDelimiter string) (Authenticator, error) {

	pu, err := url.Parse(publicURL)
	if err != nil {
		return nil, fmt.Errorf("Failed to parse public url '%s'; %v", publicURL, err)
	}

	idpu, err := url.Parse(idpMetadataURL)
	if err != nil {
		return nil, fmt.Errorf("Failed to parse idp-metadata-url '%s'; %v", idpMetadataURL, err)
	}

	iconURL := &url.URL{Host: idpu.Host, Path: "favicon.ico", Scheme: idpu.Scheme}

	keyPair, err := tls.LoadX509KeyPair(certFile, privateKeyFile)
	if err != nil {
		return nil, fmt.Errorf("Failed to load keypair cert='%s', key='%s'; %v", certFile, privateKeyFile, err)
	}
	keyPair.Leaf, err = x509.ParseCertificate(keyPair.Certificate[0])
	if err != nil {
		return nil, fmt.Errorf("Failed to parse certificate for cert='%s', key='%s'; %v", certFile, privateKeyFile, err)
	}

	idpMetadata, err := getIDPMetadata(idpMetadataURL)
	if err != nil {
		return nil, err
	}

	s := &samlHandler{
		name:        idpShortName,
		description: idpDescription,
		idpMetadata: idpMetadata,
		iconURL:     iconURL.String(),
	}

	if len(s.name) == 0 {
		// extract name from entity id
		name := strings.Replace(idpMetadata.issuerID, "http://", "", 1)
		name = strings.Replace(name, "https://", "", 1)
		name = strings.Split(name, "/")[0]
		parts := strings.Split(name, ".")
		if len(parts) > 1 {
			name = parts[len(parts)-2]
		}
		s.name = name
	}
	if len(s.description) == 0 {
		s.description = s.name
	}

	s.samlSP, err = samlsp.New(samlsp.Options{
		URL:               *pu,
		Key:               keyPair.PrivateKey.(*rsa.PrivateKey),
		Certificate:       keyPair.Leaf,
		IDPMetadataURL:    idpu,
		AllowIDPInitiated: true,
	})
	// Update the ACS path in order to serve correct metadata
	s.samlSP.ServiceProvider.AcsURL.Path = s.LoginURL()
	s.samlSP.ServiceProvider.MetadataURL.Path = path.Join(s.LoginURL(), "metadata")

	http.HandleFunc(s.samlSP.ServiceProvider.MetadataURL.Path, s.Metadata)

	if err != nil {
		return nil, fmt.Errorf("Failed to parse idp-metadata-url '%s'; %v", idpMetadataURL, err)
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
	var entities saml.EntitiesDescriptor
	var metadata saml.EntityDescriptor

	defer resp.Body.Close()
	data, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("Failed to read metadata response; %v", err)
	}
	err = xml.NewDecoder(bytes.NewReader(data)).Decode(&entities)
	if err != nil {
		if strings.Contains(err.Error(), "have <EntityDescriptor>") {
			err = xml.NewDecoder(bytes.NewReader(data)).Decode(&metadata)
		}
		if err != nil {
			return nil, fmt.Errorf("Failed to decode entity descriptor: %v", err)
		}
	} else {
		metadata = entities.EntityDescriptors[0]
	}

	summary := &metadataSummary{
		issuerID: metadata.EntityID,
	}

	if len(metadata.IDPSSODescriptors) > 0 {
		idpSSODescriptor := metadata.IDPSSODescriptors[0]
		// Extract the signing key(s)
		summary.signingCerts = append(summary.signingCerts, extractKeys(idpSSODescriptor)...)
		// Extract the SSO login endpoint
		if len(idpSSODescriptor.SingleSignOnServices) == 0 {
			return nil, fmt.Errorf("Metadata contains no SSO descriptors")
		}

		for _, ssoService := range idpSSODescriptor.SingleSignOnServices {
			if ssoService.Binding == saml.HTTPPostBinding {
				summary.ssoLoginURL = ssoService.Location
			}
		}
	} else {
		return nil, fmt.Errorf("Metadata contains no SSO descriptors")
	}

	if len(summary.ssoLoginURL) == 0 {
		return nil, fmt.Errorf("Failed to parse sso login url from metadata")
	}

	return summary, nil
}

func extractKeys(d saml.IDPSSODescriptor) []*x509.Certificate {
	certs := []*x509.Certificate{}
	for _, keyDesc := range d.KeyDescriptors {
		if keyDesc.Use == "signing" || keyDesc.Use == "" {

			certBytes, err := base64.StdEncoding.DecodeString(keyDesc.KeyInfo.Certificate)
			if err != nil {
				log.Errorf("Failed to decode signing cert from pem bytes: %v", err)
			} else {
				cert, err := x509.ParseCertificate(certBytes)
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
	return s.description
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
	return false
}

// IconURL returns an icon URL to signify this login method; empty string implies a default can be used
func (s *samlHandler) IconURL() string {
	return s.iconURL
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
