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

	log "github.com/Sirupsen/logrus"
	oidc "github.com/coreos/go-oidc"
	jwt "github.com/dgrijalva/jwt-go"
	uuid "github.com/nu7hatch/gouuid"
)

const (
	oidcStateCookie = "oidc_state"
	jwtCookieName   = "jwt"
)

type oidcHandler struct {
	name         string
	nonce        string
	provider     *oidc.Provider
	verifier     *oidc.IDTokenVerifier
	oauth2Config oauth2.Config
	httpCtx      context.Context
	groupsClaim  string
	idClaim      string
	iconURL      string
	authManager  *Manager
}

// NewOIDCHandler creates a new oidc handler with the provided configuration items
func NewOIDCHandler(authManager *Manager, name, publicURL, oidcProvider, clientID, clientSecret string, additionalScopes []string, idClaim string, groupsClaim string) (Authenticator, error) {
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
		authManager: authManager,
		iconURL:     iconURL.String(),
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

	return o, nil
}

// Name returns the name of this authenticator
func (o *oidcHandler) Name() string {
	return o.name
}

// Description returns the user-friendly description of this authenticator
func (o *oidcHandler) Description() string {
	return o.name
}

// Type returns the type of this authenticator
func (o *oidcHandler) Type() string {
	return "oidc"
}

// IconURL returns an icon URL to signify this login method; empty string implies a default can be used
func (o *oidcHandler) IconURL() string {
	return o.iconURL
}

// GetHandlers returns the handlers for this authenticator
func (o *oidcHandler) GetHandlers() map[string]http.HandlerFunc {
	return map[string]http.HandlerFunc{
		o.LoginURL(): o.authenticate,
	}
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
func (o *oidcHandler) authenticate(w http.ResponseWriter, r *http.Request) {

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

	} else {

		stateCookie, err := r.Cookie(oidcStateCookie)
		if err != nil || stateCookie == nil {
			http.Error(w, "State did not match: missing/invalid state cookie", http.StatusBadRequest)
			return
		}
		state := stateCookie.Value

		if r.URL.Query().Get("state") != state {
			http.Error(w, "State did not match", http.StatusBadRequest)
			return
		}

		stateBytes, err := base64.URLEncoding.DecodeString(state)
		if err != nil {
			http.Error(w, "Failed to decode state: "+err.Error(), http.StatusInternalServerError)
			return
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
			http.Error(w, "Failed to exchange token: "+err.Error(), http.StatusInternalServerError)
			return
		}

		rawIDToken, ok := oauth2Token.Extra("id_token").(string)
		if !ok {
			http.Error(w, "No id_token field in oauth2 token", http.StatusInternalServerError)
			return
		} else if log.GetLevel() >= log.DebugLevel {
			log.Debugf("Received OIDC idToken: %s", rawIDToken)
		}
		// Verify the ID Token signature and nonce.
		idToken, err := o.verifier.Verify(o.httpCtx, rawIDToken)
		if err != nil {
			log.Errorf("Failed to verify ID Token: %v", err)
			http.Error(w, "Failed to verify ID Token: "+err.Error(), http.StatusInternalServerError)
			return
		}

		if idToken.Nonce != o.nonce {
			log.Errorf("Invalid ID Token nonce: got '%s', expected '%s'", idToken.Nonce, o.nonce)
			http.Error(w, "Invalid ID Token nonce", http.StatusInternalServerError)
			return
		}

		user, groups, err := o.resolveUserAndGroups(oauth2Token, idToken)
		if err != nil {
			log.Error("Failed to resolve user/group info", err)
			http.Error(w, "Failed to resolve user/group info: "+err.Error(), http.StatusInternalServerError)
			return
		}

		appToken := NewSessionToken(user, groups, jwt.MapClaims{
			"o2a": oauth2Token.AccessToken,
			"oid": rawIDToken,
			"orf": oauth2Token.RefreshToken,
		})

		o.authManager.completeAuthentication(appToken, w, r)
	}
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
		err := idToken.Claims(&idClaims)
		if err != nil {
			return "", nil, err
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
