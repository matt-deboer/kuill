package proxy

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/matt-deboer/kuill/pkg/clients"
	log "github.com/sirupsen/logrus"
	meta_v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

var accessControls = map[string]bool{
	"Role":               true,
	"ClusterRole":        true,
	"RoleBinding":        true,
	"ClusterRoleBinding": true,
	"ServiceAccount":     true,
}

var namespacedCluster = map[string]bool{
	"ResourceQuota":      true,
	"NetworkPolicy":      true,
	"RoleBinding":        true,
	"ClusterRoleBinding": true,
	"ServiceAccount":     true,
}

type KindsProxy struct {
	kubeClients   *clients.KubeClients
	mutex         sync.RWMutex
	kinds         map[string]*KubeKind
	kindNames     []string
	kindsResponse []byte
	frequency     time.Duration
}

type KubeKind struct {
	Plural        string `json:"plural"`
	Name          string `json:"name"`
	Version       string `json:"version"`
	ResourceGroup string `json:"resourceGroup"`
	Abbreviation  string `json:"abbrev"`
	APIBase       string `json:"base"`
	meta_v1.APIResource
}

var possibleNamespace = regexp.MustCompile("([a-z]+-?)+")

// GetPath returns the path for the given kind in the specified namespace;
// if the namespace value is not recognized as a possible valid namespace, then the
// path returned is for the resource at the cluster scope
func (k *KubeKind) GetPath(namespace string) string {
	path := k.APIBase
	if possibleNamespace.MatchString(namespace) {
		path += fmt.Sprintf("/namespaces/%s", namespace)
	}
	path += "/" + k.Plural
	return path
}

// GetWatchPath returns the watch path for the given kind in the specified namespace;
// if the namespace value is not recognized as a possible valid namespace, then the
// path returned is for the resource at the cluster scope
// If 'watch' is not contained among the verbs for the kind, then "" is returned
func (k *KubeKind) GetWatchPath(namespace string) string {
	canWatch := false
	for _, v := range k.Verbs {
		if v == "watch" {
			canWatch = true
			break
		}
	}
	if !canWatch {
		return ""
	}

	path := fmt.Sprintf("%s/watch", k.APIBase)
	if possibleNamespace.MatchString(namespace) {
		path += fmt.Sprintf("/namespaces/%s", namespace)
	}
	path += "/" + k.Plural
	return path
}

type KindList struct {
	Items []*KubeKind `json:"items"`
}

// NewKindsProxy creates a new kinds proxy
func NewKindsProxy(kubeClients *clients.KubeClients) (*KindsProxy, error) {

	k := &KindsProxy{kubeClients: kubeClients, frequency: time.Minute * 10}
	err := k.update()
	if err != nil {
		return nil, err
	}
	go k.doUpdates()
	return k, nil
}

// GetKind returns the kind mapped to the provided name,
// or nil if no such kind exists
func (k *KindsProxy) GetKind(name string) *KubeKind {
	k.mutex.RLock()
	defer k.mutex.RUnlock()
	return k.kinds[name]
}

func (k *KindsProxy) doUpdates() {
	for {
		time.Sleep(k.frequency)
		k.update()
	}
}

// initialize the set of kinds
func (k *KindsProxy) update() error {

	kinds := make(map[string]*KubeKind)
	d := k.kubeClients.Standard.Discovery()

	preferredResourceLists, err := d.ServerPreferredResources()
	if err != nil {
		return fmt.Errorf("Failed to get server preferred resources; %v", err)
	}

	for _, resourceList := range preferredResourceLists {

		if log.GetLevel() >= log.DebugLevel {
			log.Debugf("Processing API Group: %s ...", resourceList)
		}
		version := resourceList.GroupVersion
		for _, apiResource := range resourceList.APIResources {
			if containsVerb(apiResource.Verbs, "list") {
				var apiBase string
				if strings.Contains(version, "/") {
					apiBase = "apis/"
				} else {
					apiBase = "api/"
				}
				k := &KubeKind{
					APIBase:       apiBase + version,
					Plural:        apiResource.Name,
					Name:          apiResource.Kind,
					Version:       version,
					Abbreviation:  toAbbreviation(apiResource.Kind),
					ResourceGroup: resolveResourceGroup(apiResource.Kind, apiResource.Namespaced),
					APIResource:   apiResource,
				}
				kinds[apiResource.Kind] = k
			}
		}

	}

	kindList := &KindList{}
	for _, k := range kinds {
		kindList.Items = append(kindList.Items, k)
	}
	data, err := json.Marshal(kindList)
	if err != nil {
		return fmt.Errorf("Failed to serialize kinds")
	}

	k.mutex.Lock()
	defer k.mutex.Unlock()
	k.kindsResponse = data
	k.kinds = kinds

	return nil
}

var camelcasePattern = regexp.MustCompile(`([A-Z])(?:[a-z])`)

func toAbbreviation(kind string) string {
	firstLetters := camelcasePattern.FindAllStringSubmatch(kind, -1)
	var abbrev string
	if len(firstLetters) > 1 {
		abbrev = firstLetters[0][1] + strings.ToLower(firstLetters[1][1])
	} else {
		abbrev = firstLetters[0][0]
	}
	return abbrev
}

func resolveResourceGroup(kind string, namespaced bool) string {
	if _, ok := accessControls[kind]; ok {
		return "access"
	} else if _, ok := namespacedCluster[kind]; namespaced && !ok {
		return "workloads"
	}
	return "cluster"
}

func containsVerb(verbs []string, verb string) bool {
	for _, v := range verbs {
		if v == verb {
			return true
		}
	}
	return false
}

// Serve returns a cached copy of all known resource kinds
func (k *KindsProxy) Serve(w http.ResponseWriter, r *http.Request) {

	k.mutex.RLock()
	defer k.mutex.RUnlock()

	if k.kindsResponse != nil {
		w.Header().Set("Content-Type", "application/json")
		w.Write(k.kindsResponse)
	} else {
		log.Errorf("No kindList response available")
		w.WriteHeader(500)
	}
}
