package auth

import (
	"bufio"
	"net/http"
	"os"
	"path"
	"strings"

	log "github.com/sirupsen/logrus"
)

type pwfileHandler struct {
	users       map[string][]string
	name        string
	authManager *Manager
}

// NewPasswordFileHandler creates a new passworkd file authenticator; only
// suitable for testing scenarios.
// The expected format of the file is TSV
// {username}[TAB]{password}[TAB]{group}[TAB]{group}...
func NewPasswordFileHandler(authManager *Manager, name, pwfile string) (Authenticator, error) {
	file, err := os.Open(pwfile)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	users := make(map[string][]string)
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		parts := strings.Split(scanner.Text(), "\t")
		users[parts[0]] = parts[1:]
		if log.GetLevel() >= log.DebugLevel {
			log.Debugf("Added user: %s", parts[0])
		}
	}

	return &pwfileHandler{
		authManager: authManager,
		users:       users,
		name:        name,
	}, nil
}

// Name returns the name of this authenticator
func (p *pwfileHandler) Name() string {
	return p.name
}

// Description returns the user-friendly description of this authenticator
func (p *pwfileHandler) Description() string {
	return p.name
}

// Type returns the type of this authenticator
func (p *pwfileHandler) Type() string {
	return "pwfile"
}

// LoginURL returns the initial login URL for this handler
func (p *pwfileHandler) LoginURL() string {
	return path.Join("/", "auth", p.Type(), p.Name())
}

// PostWithCredentials returns true if this authenticator expects username/password credentials be POST'd
func (p *pwfileHandler) PostWithCredentials() bool {
	return true
}

// IconURL returns an icon URL to signify this login method; empty string implies a default can be used
func (p *pwfileHandler) IconURL() string {
	return ""
}

func (p *pwfileHandler) Authenticate(w http.ResponseWriter, r *http.Request) (*SessionToken, error) {
	username := r.FormValue("username")
	if len(username) == 0 {
		username = r.URL.Query().Get("username")
	}
	password := r.FormValue("password")
	if len(password) == 0 {
		password = r.URL.Query().Get("password")
	}

	if pw, ok := p.users[username]; ok {
		if pw[0] == password {
			if log.GetLevel() >= log.DebugLevel {
				log.Debugf("Logged in: %s", username)
			}
			return NewSessionToken(username, pw[1:], nil), nil
		}
	}
	if log.GetLevel() >= log.DebugLevel {
		log.Debugf("Invalid login; username: '%s', password: '%s'", username, password)
	}
	msg := "Invalid username and/or password"
	http.Error(w, msg, http.StatusUnauthorized)
	return nil, nil
}
