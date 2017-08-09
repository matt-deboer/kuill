package auth

import (
	"context"
	"net/http"
	"net/url"
	"path"
	"strings"

	"golang.org/x/oauth2"

	"fmt"

	"crypto/rand"

	"encoding/base64"

	oidc "github.com/coreos/go-oidc"
	jwt "github.com/dgrijalva/jwt-go"
	uuid "github.com/nu7hatch/gouuid"
	log "github.com/sirupsen/logrus"
)

const (
	oidcStateCookie = "oidc_state"
	jwtCookieName   = "jwt"
)

type oidcHandler struct {
	name         string
	description  string
	nonce        string
	provider     *oidc.Provider
	verifier     *oidc.IDTokenVerifier
	oauth2Config oauth2.Config
	httpCtx      context.Context
	groupsClaim  string
	idClaim      string
	iconURL      string
}

// NewOIDCHandler creates a new oidc handler with the provided configuration items
func NewOIDCHandler(name, description, publicURL, oidcProvider, clientID, clientSecret string, additionalScopes []string, idClaim string, groupsClaim string) (Authenticator, error) {
	if len(name) == 0 {
		return nil, fmt.Errorf("'name' is required")
	}

	iconURL, err := url.Parse(oidcProvider)
	if err != nil {
		return nil, err
	}
	iconURL.Path = path.Join(iconURL.Path, "favicon.ico")

	o := &oidcHandler{
		name:        name,
		groupsClaim: groupsClaim,
		idClaim:     idClaim,
		iconURL:     iconURL.String(),
	}

	if len(description) > 0 {
		o.description = description
	} else {
		o.description = name
	}

	appNonce, err := uuid.NewV4()
	o.nonce = appNonce.String()
	o.httpCtx = context.Background()

	provider, err := oidc.NewProvider(o.httpCtx, oidcProvider)
	if err != nil {
		return nil, err
	}
	o.provider = provider

	oidcConfig := &oidc.Config{
		// We'll check expiry ourselves, so we can try refresh
		SkipExpiryCheck: true,
		ClientID:        clientID,
	}
	// Use the nonce source to create a custom ID Token verifier.
	o.verifier = provider.Verifier(oidcConfig)

	scopes := []string{oidc.ScopeOpenID}
	scopes = append(scopes, additionalScopes...)

	if strings.HasSuffix(publicURL, "/") {
		publicURL = publicURL[:len(publicURL)-1]
	}

	o.oauth2Config = oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		Endpoint:     provider.Endpoint(),
		RedirectURL:  publicURL + o.LoginURL(),
		Scopes:       scopes,
	}

	if log.GetLevel() >= log.DebugLevel {
		log.Debugf("Configured oidcHandler: %#v", struct {
			IDClaim      string
			GroupsClaim  string
			OAuth2Config oauth2.Config
		}{o.idClaim, o.groupsClaim, o.oauth2Config})
	}

	return o, nil
}

// Name returns the name of this authenticator
func (o *oidcHandler) Name() string {
	return o.name
}

// Description returns the user-friendly description of this authenticator
func (o *oidcHandler) Description() string {
	return o.description
}

// Type returns the type of this authenticator
func (o *oidcHandler) Type() string {
	return "oidc"
}

// IconURL returns an icon URL to signify this login method; empty string implies a default can be used
func (o *oidcHandler) IconURL() string {
	return o.iconURL
}

// LoginURL returns the initial login URL for this handler
func (o *oidcHandler) LoginURL() string {
	return path.Join("/", "auth", o.Type(), o.Name())
}

// PostWithCredentials returns true if this authenticator expects username/password credentials be POST'd
func (o *oidcHandler) PostWithCredentials() bool {
	return false
}

func randomBytes(len int) []byte {
	b := make([]byte, len)
	rand.Read(b)
	return b
}

// authCallback handles OIDC authentication callback for the app
func (o *oidcHandler) Authenticate(w http.ResponseWriter, r *http.Request) (*SessionToken, error) {

	oidcCode := r.URL.Query().Get("code")

	if len(oidcCode) == 0 {
		stateBytes := randomBytes(24)
		target := r.URL.Query().Get("target")
		if len(target) > 0 {
			stateBytes = append(stateBytes, []byte("::"+target)...)
		}
		state := base64.URLEncoding.EncodeToString(stateBytes)

		http.SetCookie(w, &http.Cookie{
			Name:     oidcStateCookie,
			Value:    state,
			HttpOnly: true,
		})

		http.Redirect(w, r,
			o.oauth2Config.AuthCodeURL(state, oidc.Nonce(o.nonce)), http.StatusFound)
		return nil, nil

	}

	stateCookie, err := r.Cookie(oidcStateCookie)
	if err != nil || stateCookie == nil {
		msg := "State did not match: missing/invalid state cookie"
		http.Error(w, msg, http.StatusBadRequest)
		return nil, fmt.Errorf("%s: %v", msg, err)
	}
	state := stateCookie.Value

	if r.URL.Query().Get("state") != state {
		msg := "State did not match: missing/invalid state cookie"
		http.Error(w, msg, http.StatusBadRequest)
		return nil, fmt.Errorf(msg)
	}

	stateBytes, err := base64.URLEncoding.DecodeString(state)
	if err != nil {
		msg := "Failed to decode state"
		http.Error(w, msg, http.StatusInternalServerError)
		return nil, fmt.Errorf("%s: %v", msg, err)
	}

	stateParts := strings.Split(string(stateBytes), "::")
	if len(stateParts) > 1 {
		if log.GetLevel() >= log.DebugLevel {
			log.Debugf("Parsed redirect target: %s", stateParts[1])
		}

		query := r.URL.Query()
		query.Set("target", stateParts[1])
		r.URL.RawQuery = query.Encode()
	}

	oauth2Token, err := o.oauth2Config.Exchange(o.httpCtx, r.URL.Query().Get("code"))
	if err != nil {
		msg := "Failed to exchange token"
		http.Error(w, msg, http.StatusInternalServerError)
		return nil, fmt.Errorf("%s: %v", msg, err)
	}

	rawIDToken, ok := oauth2Token.Extra("id_token").(string)
	if !ok {
		msg := "No id_token field in oauth2 token"
		http.Error(w, msg, http.StatusInternalServerError)
		return nil, fmt.Errorf("%s: %v", msg, err)
	} else if log.GetLevel() >= log.DebugLevel {
		log.Debugf("Received OIDC idToken: %s", rawIDToken)
	}
	// Verify the ID Token signature and nonce.
	idToken, err := o.verifier.Verify(o.httpCtx, rawIDToken)
	if err != nil {
		msg := "Failed to verify ID Token"
		http.Error(w, msg, http.StatusInternalServerError)
		return nil, fmt.Errorf("%s: %v", msg, err)
	}

	if idToken.Nonce != o.nonce {
		msg := "Invalid ID Token nonce"
		http.Error(w, msg, http.StatusInternalServerError)
		return nil, fmt.Errorf(msg)
	}

	user, groups, err := o.resolveUserAndGroups(oauth2Token, idToken)
	if err != nil {
		msg := "Failed to resolve user/group info"
		http.Error(w, msg, http.StatusInternalServerError)
		return nil, fmt.Errorf("%s: %v", msg, err)
	}

	appToken := NewSessionToken(user, groups, jwt.MapClaims{
		"o2a": oauth2Token.AccessToken,
		"oid": rawIDToken,
		"orf": oauth2Token.RefreshToken,
	})
	return appToken, nil

}

func (o *oidcHandler) getUserInfoClaims(claims *map[string]interface{}, oauth2Token *oauth2.Token) error {
	if claims == nil {
		*claims = make(map[string]interface{})
	}
	if len(*claims) == 0 {
		userInfo, err := o.provider.UserInfo(o.httpCtx, oauth2.StaticTokenSource(oauth2Token))
		if err != nil {
			return fmt.Errorf("Failed to get userinfo: " + err.Error())
		}

		err = userInfo.Claims(claims)
		if err != nil {
			return err
		}
		if _, ok := (*claims)["email"]; !ok {
			(*claims)["email"] = userInfo.Email
		}

		if log.GetLevel() >= log.DebugLevel {
			log.Debugf("Resulting UserInfo claims: %v", *claims)
		}

	}
	return nil
}

func (o *oidcHandler) resolveUserAndGroups(oauth2Token *oauth2.Token, idToken *oidc.IDToken) (string, []string, error) {

	var idClaims map[string]interface{}
	var infoClaims map[string]interface{}

	var user string
	var userGroups []string

	if o.idClaim == "sub" {
		user = idToken.Subject
	} else {
		idClaims := make(map[string]interface{})
		if log.GetLevel() >= log.DebugLevel {
			log.Debugf("Resolving ID claims...")
		}
		err := idToken.Claims(&idClaims)
		if err != nil {
			return "", nil, err
		}
		if log.GetLevel() >= log.DebugLevel {
			log.Debugf("Resolved IDToken %v, with claims: %v", idToken, idClaims)
		}
		if u, ok := idClaims[o.idClaim]; ok {
			user = u.(string)
		} else {
			err = o.getUserInfoClaims(&infoClaims, oauth2Token)
			if err != nil {
				return "", nil, err
			}
			if u, ok := infoClaims[o.idClaim]; ok {
				user = u.(string)
			}
		}
	}

	if len(user) == 0 {
		user = idToken.Subject
	}

	if idClaims == nil {
		idClaims := make(map[string]interface{})
		err := idToken.Claims(&idClaims)
		if err != nil {
			return "", nil, err
		}
	}

	if log.GetLevel() >= log.DebugLevel {
		log.Debugf("Resulting IDToken claims: %v", idClaims)
	}

	if g, ok := idClaims[o.groupsClaim]; ok {
		userGroups = g.([]string)
	} else {
		err := o.getUserInfoClaims(&infoClaims, oauth2Token)
		if err != nil {
			return "", nil, err
		}
		if g, ok := infoClaims[o.groupsClaim]; ok {
			userGroups = g.([]string)
		}
	}

	// var userGroups []string
	// if groups, ok := userClaims[groupsClaim]; ok {
	// 	userGroups = groups.([]string)
	// }
	// default testing:
	userGroups = []string{"system:masters"}

	return user, userGroups, nil

}
