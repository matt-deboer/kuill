package version

import (
	"net/http"
)

var (
	// Name is set at compile time based on the git repository
	Name string
	// Version is set at compile time with the git version
	Version string
	// Branch is set at compile time with the git version
	Branch string
	// Revision is set at compile time with the git version
	Revision string
)

// Serve presents the version as text response from the /version path
func Serve() {
	http.HandleFunc("/version", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(Version))
	})
}
