package helpers

import (
	"net/http"

	"github.com/matt-deboer/kuill/pkg/version"
)

// ServeVersion provides version information for kuill
func ServeVersion() {
	http.HandleFunc("/version", serveVersion)
}

func serveVersion(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte(version.Version))
}
