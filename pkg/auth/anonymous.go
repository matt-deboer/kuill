package auth

import (
	"fmt"
	"net/http"
)

type anonymousHandler struct {
	groups   []string
	username string
}

// NewAnonymousHandler creates a new anonymous authenticator using
// the provided username and groups
func NewAnonymousHandler(username string, groups []string) Authenticator {

	return &anonymousHandler{
		username: username,
		groups:   groups,
	}
}

// Name returns the name of this authenticator
func (a *anonymousHandler) Name() string {
	return a.username
}

// Description returns the user-friendly description of this authenticator
func (a *anonymousHandler) Description() string {
	return "Anonymous access"
}

// Type returns the type of this authenticator
func (a *anonymousHandler) Type() string {
	return "anonymous"
}

// LoginURL returns the initial login URL for this handler
func (a *anonymousHandler) LoginURL() string {
	_type := a.Type()
	name := a.Name()
	return fmt.Sprintf("/auth/%s/%s", _type, name)
	// return path.Join("/", "auth", _type, name)
}

// PostWithCredentials returns true if this authenticator expects username/password credentials be POST'd
func (a *anonymousHandler) PostWithCredentials() bool {
	return false
}

// IconURL returns an icon URL to signify this login method; empty string implies a default can be used
func (a *anonymousHandler) IconURL() string {
	return ""
}

func (a *anonymousHandler) Authenticate(w http.ResponseWriter, r *http.Request, m *Manager) (*SessionToken, error) {
	return m.NewSessionToken(a.username, a.groups, nil), nil
}
