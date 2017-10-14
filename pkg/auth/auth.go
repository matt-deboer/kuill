package auth

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"sync"

	jwt "github.com/dgrijalva/jwt-go"
	uuid "github.com/nu7hatch/gouuid"
	log "github.com/sirupsen/logrus"
)

const (
	sessionTokenName = "kuill"
	claimExpires     = "exp"
	claimNotBefore   = "nbf"
	claimCSRFToken   = "csrf"
	claimUserID      = "uid"
	claimGroups      = "grp"
)

// Context is a holder for the currently authenticated user's information
type Context interface {
	User() string
	Groups() []string
}

// Authenticator is a pluggable interface for authentication providers
type Authenticator interface {
	// Name returns the url-safe unique name of this authenticator
	Name() string
	// Description returns the user-friendly description of this authenticator
	Description() string
	// Type returns the type of this authenticator
	Type() string
	// GetHandlers returns the handlers for this authenticator; the set of
	// handlers must include a "login" handler which will be triggered
	// GetHandlers() map[string]http.HandlerFunc
	// LoginURL returns the initial login URL for this handler
	Authenticate(w http.ResponseWriter, r *http.Request) (*SessionToken, error)

	LoginURL() string
	// IconURL returns an icon URL to signify this login method; empty string implies a default can be used
	IconURL() string
	// PostWithCredentials returns true if this authenticator expects username/password credentials be POST'd
	PostWithCredentials() bool
}

// Delegate is a function which requires user and group information along with
// the standard http request/response parameters
type Delegate func(w http.ResponseWriter, r *http.Request, authentication Context)

// NewAuthDelegate returns a new http.Handler func which delegates to the
// provided AuthDelegate, passing the resolved user,group information form
// the session where found, otherwise returning 401 Unauthorized.
func (m *Manager) NewAuthDelegate(delegate Delegate) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		session, err := m.ParseSessionToken(r)
		if session == nil {
			if err != nil {
				log.Warnf("Authentication error: %v", err)
			} else {
				log.Infof("No existing/valid session")
			}
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		m.keepSessionAlive(session, w)
		delegate(w, r, session)
	}
}

// Manager manages supported authentication mechanisms
type Manager struct {
	authenticators       map[string]Authenticator
	loginMethodsResponse []byte
	mutex                sync.Mutex
	hmac                 []byte
}

// NewAuthManager creates a new authentication manager instance
func NewAuthManager() (*Manager, error) {

	hmc, _ := uuid.NewV4()
	m := &Manager{
		authenticators: make(map[string]Authenticator),
		hmac:           []byte(hmc.String()),
	}

	m.loginMethodsResponse, _ = m.buildLoginMethodsResponse()
	http.HandleFunc("/auth/login_methods", m.listLoginMethods)
	http.HandleFunc("/auth/user_info", m.userInfo)

	return m, nil
}

func (m *Manager) buildLoginMethodsResponse() ([]byte, error) {
	loginMethods := []map[string]interface{}{}
	for id, authN := range m.authenticators {
		loginMethods = append(loginMethods, map[string]interface{}{
			"id":         id,
			"name":       authN.Name(),
			"desc":       authN.Description(),
			"type":       authN.Type(),
			"url":        authN.LoginURL(),
			"icon":       authN.IconURL(),
			"post_creds": authN.PostWithCredentials(),
		})
	}
	resp := map[string]interface{}{
		"login_methods": loginMethods,
	}
	return json.Marshal(&resp)
}

// RegisterAuthenticator registers an authentication provider
func (m *Manager) RegisterAuthenticator(authn Authenticator) error {
	key := fmt.Sprintf("%s:%s", authn.Type(), authn.Name())
	m.mutex.Lock()
	defer m.mutex.Unlock()
	if _, ok := m.authenticators[key]; ok {
		return fmt.Errorf("An authenticator already exists with key '%s'", key)
	}
	m.authenticators[key] = authn

	var handlerFunc http.HandlerFunc = func(w http.ResponseWriter, r *http.Request) {
		sessionToken, err := authn.Authenticate(w, r)
		if err != nil {
			log.Error(err)
		} else if sessionToken != nil {
			m.completeAuthentication(sessionToken, w, r)
		}
	}
	http.HandleFunc(authn.LoginURL(), handlerFunc)

	var err error
	m.loginMethodsResponse, err = m.buildLoginMethodsResponse()
	if err != nil {
		return fmt.Errorf("Problem marshalling cached authenticators response: %v", err)
	}
	log.Infof("Enabled authenticator: %s => %s", key, authn.LoginURL())

	return nil
}

func (m *Manager) listLoginMethods(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(m.loginMethodsResponse)))
	w.Write(m.loginMethodsResponse)
}

type userInfo struct {
	User           string `json:"user,omitempty"`
	Groups         string `json:"groups,omitempty"`
	SessionExpires string `json:"session_expires,omitempty"`
}

func (m *Manager) userInfo(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
	}

	session, _ := m.ParseSessionToken(r)
	m.keepSessionAlive(session, w)
	m.respondWithUserInfo(session, w)
}

func (m *Manager) respondWithUserInfo(session *SessionToken, w http.ResponseWriter) {
	var resp userInfo
	if session != nil {
		resp.User = session.User()
		resp.Groups = session.Groups()
		resp.SessionExpires = time.Unix(session.Expires(), 0).Format(time.RFC3339)
	}
	data, err := json.Marshal(resp)
	if err != nil {
		http.Error(w, "Failed marshalling user response", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(data)))
	w.Write(data)
}

func (m *Manager) keepSessionAlive(session *SessionToken, w http.ResponseWriter) {
	// If the session expires in less than 1 minute, renew it
	if session != nil && session.Valid && session.Expires() < (time.Now().Unix()-int64(time.Minute.Seconds())) {
		session = NewSessionToken(session.User(), []string{}, session.claims)
		m.writeSessionCookie(session, w)
		if log.GetLevel() >= log.DebugLevel {
			log.Debugf("Renewed session for %s: expires %d -> %d", session.User(), session.Expires())
		}
	}
}

func (m *Manager) writeSessionCookie(session *SessionToken, w http.ResponseWriter) {
	signedJWT, err := session.SignedString(m.hmac)
	if err != nil {
		http.Error(w, "Failed to sign JWT: "+err.Error(), http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     sessionTokenName,
		Value:    signedJWT,
		HttpOnly: true,
		Path:     "/",
	})
}

// TODO: this should be re-worked so that it wraps authenticators' authenticate methods
func (m *Manager) completeAuthentication(session *SessionToken, w http.ResponseWriter, r *http.Request) {

	m.writeSessionCookie(session, w)

	targetURL := r.URL.Query().Get("target")
	if len(targetURL) > 0 {
		http.Redirect(w, r, targetURL, http.StatusFound)
	} else {
		m.respondWithUserInfo(session, w)
	}
}

// SessionToken is a wrapper around JWT with methods for easy user/group access
type SessionToken struct {
	*jwt.Token
	claims jwt.MapClaims
}

// User recovers the userID from a session token
func (s *SessionToken) User() string {
	return s.claims[claimUserID].(string)
}

// Expires returns the expiration of the token in Unix time, the number of seconds elapsed
// since January 1, 1970 UTC.
func (s *SessionToken) Expires() int64 {
	expires := s.claims[claimExpires]
	if intVal, ok := expires.(int64); ok {
		return intVal
	}
	return int64(expires.(float64))
}

// Groups recovers the groups from a session token
func (s *SessionToken) Groups() []string {
	return strings.Split(s.claims[claimGroups].(string), ",")
}

// NewSessionToken generates a new auth token suitable for storing user session state
func NewSessionToken(user string, groups []string, additionalClaims map[string]interface{}) *SessionToken {
	csrfToken, _ := uuid.NewV4()
	claims := jwt.MapClaims{
		claimNotBefore: time.Now().Unix(),
		claimExpires:   time.Now().Add(time.Minute * 15).Unix(),
		claimCSRFToken: csrfToken.String(),
		claimUserID:    user,
		claimGroups:    strings.Join(groups, ","),
	}
	if additionalClaims != nil {
		for k, v := range additionalClaims {
			claims[k] = v
		}
	}
	return &SessionToken{Token: jwt.NewWithClaims(jwt.SigningMethodHS256, claims), claims: claims}
}

// ParseSessionToken recovers the session
func (m *Manager) ParseSessionToken(r *http.Request) (*SessionToken, error) {

	cookie, err := r.Cookie(sessionTokenName)
	if cookie == nil || err != nil {
		return nil, nil
	}

	if log.GetLevel() >= log.DebugLevel {
		log.Debugf("Found cookie for %s; %s: %s", r.URL, sessionTokenName, cookie.Value)
	}

	token, err := jwt.Parse(cookie.Value, func(token *jwt.Token) (interface{}, error) {
		// Don't forget to validate the alg is what you expect:
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("Unexpected signing method: %v", token.Header["alg"])
		}
		return m.hmac, nil
	})

	if err != nil {
		return nil, err
	} else if claims, ok := token.Claims.(jwt.MapClaims); ok {
		st := &SessionToken{Token: token, claims: claims}
		if log.GetLevel() >= log.DebugLevel {
			log.Debugf("Resolved session token %v", st)
		}
		return st, nil
	}
	return nil, fmt.Errorf("Failed to parse token claims")
}
