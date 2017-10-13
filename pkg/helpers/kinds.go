package helpers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/ericchiang/k8s"
	"github.com/ericchiang/k8s/api/unversioned"
	"github.com/gogo/protobuf/proto"
	"github.com/prometheus/common/log"
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

type kindLister struct {
	client        *k8s.Client
	mutex         sync.RWMutex
	kindsResponse []byte
	frequency     time.Duration
}

type KubeKind struct {
	Plural        string   `json:"plural"`
	Kind          string   `json:"kind"`
	Version       string   `json:"version"`
	Namespaced    bool     `json:"namespaced"`
	ShortNames    []string `json:"shortNames,omitempty"`
	ResourceGroup string   `json:"resourceGroup"`
	Abbreviation  string   `json:"abbrev"`
	APIBase       string   `json:"base"`
	Verbs         []string `json:"verbs"`
}

type KindList struct {
	Items []*KubeKind `json:"items"`
}

// ServeKinds provides swagger information for kuill
func ServeKinds(kubeconfig string) error {

	client, _, err := NewKubeClient(kubeconfig)
	if err != nil {
		return err
	}
	k := &kindLister{client: client, frequency: time.Minute * 10}
	err = k.update()
	if err != nil {
		return err
	}
	go k.doUpdates()

	http.HandleFunc("/kinds", k.serveKinds)
	return nil
}

func (k *kindLister) doUpdates() {
	for {
		time.Sleep(k.frequency)
		k.update()
	}
}

// initialize the set of kinds
func (k *kindLister) update() error {

	kinds := make(map[string]*KubeKind)
	ctx := context.Background()
	d := k.client.Discovery()
	groupList, err := d.APIGroups(ctx)
	if err != nil {
		return fmt.Errorf("Failed to get api groups; %v", err)
	}
	for _, apiGroup := range groupList.GetGroups() {
		version := apiGroup.GetPreferredVersion()
		resources, err := d.APIResources(ctx, apiGroup.GetName(), version.GetVersion())
		if err != nil {
			log.Warnf("Failed to get api resources for group %s; %v", apiGroup.GetName(), err)
		} else {
			for _, resource := range resources.GetResources() {
				verbs := parseVerbs(resource)
				if containsVerb(verbs, "list") {
					kind := resource.GetKind()
					if _, ok := kinds[kind]; !ok {
						plural := strings.Split(resource.GetName(), "/")[0]
						k := &KubeKind{
							APIBase:       fmt.Sprintf("/apis/%s", resources.GetGroupVersion()),
							Plural:        plural,
							Kind:          kind,
							Namespaced:    resource.GetNamespaced(),
							Version:       version.GetVersion(),
							Abbreviation:  toAbbreviation(kind),
							ResourceGroup: resolveResourceGroup(kind, resource.GetNamespaced()),
							Verbs:         verbs,
						}
						kinds[kind] = k
					}
				}
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

	return nil
}

var verbsFieldPattern = regexp.MustCompile(`4:"[\S]+"`)
var individualVerbsPattern = regexp.MustCompile(`(?:\\n\\x\d{2})([a-z]+)`)

// this is a hack until the k8s client's protobuf is updated to include verbs
func parseVerbs(resource *unversioned.APIResource) []string {
	verbString := verbsFieldPattern.FindString(proto.CompactTextString(resource))
	verbs := []string{}
	for _, match := range individualVerbsPattern.FindAllStringSubmatch(verbString, -1) {
		verbs = append(verbs, match[1])
	}
	return verbs
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

func (k *kindLister) serveKinds(w http.ResponseWriter, r *http.Request) {

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
