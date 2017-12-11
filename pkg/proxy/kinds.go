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

type KindLister struct {
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

// ServeKinds provides swagger information for kuill
func ServeKinds(kubeClients *clients.KubeClients) (*KindLister, error) {

	k := &KindLister{kubeClients: kubeClients, frequency: time.Minute * 10}
	err := k.update()
	if err != nil {
		return nil, err
	}
	go k.doUpdates()

	http.HandleFunc("/proxy/_/kinds", k.serveKinds)
	return k, nil
}

// GetKind returns the kind mapped to the provided name,
// or nil if no such kind exists
func (k *KindLister) GetKind(name string) *KubeKind {
	k.mutex.RLock()
	defer k.mutex.RUnlock()
	return k.kinds[name]
}

func (k *KindLister) doUpdates() {
	for {
		time.Sleep(k.frequency)
		k.update()
	}
}

// initialize the set of kinds
func (k *KindLister) update() error {

	kinds := make(map[string]*KubeKind)
	// ctx := context.Background()
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

	// for _, apiGroup := range apiGroups {

	// 	version := apiGroup.GetPreferredVersion()

	// 	if log.GetLevel() >= log.DebugLevel {
	// 		log.Debugf("Processing API Group: %s ...", apiGroup.GetName())
	// 	}

	// 	var resources *unversioned.APIResourceList
	// 	var err error
	// 	if apiGroup.GetName() == "core" {
	// 		resources, err = k.coreAPIGroup()
	// 	} else {
	// 		resources, err = d.APIResources(ctx, apiGroup.GetName(), version.GetVersion())
	// 		if err != nil && strings.Contains(err.Error(), "406") {
	// 			resources, err = k.fallbackAPIGroup(version.GetGroupVersion())
	// 		}
	// 	}

	// 	if err != nil {
	// 		log.Warnf("Failed to get api resources for group %s, version %s; %v", apiGroup.GetName(), version.GetVersion(), err)
	// 	} else {
	// 		for _, resource := range resources.GetResources() {
	// 			if log.GetLevel() >= log.DebugLevel {
	// 				log.Debugf("Processing Resource %s (for API Group: %s)...", resource.GetName(), apiGroup.GetName())
	// 			}

	// 			verbs := parseVerbs(resource)
	// 			if containsVerb(verbs, "list") {
	// 				kind := resource.GetKind()
	// 				if _, ok := kinds[kind]; !ok {
	// 					plural := strings.Split(resource.GetName(), "/")[0]
	// 					var apiBase string
	// 					var kindVersion string
	// 					if version == nil {
	// 						apiBase = "api/"
	// 						kindVersion = "v1"
	// 					} else {
	// 						apiBase = "apis/"
	// 						kindVersion = version.GetVersion()
	// 					}
	// 					k := &KubeKind{
	// 						APIBase:       apiBase + resources.GetGroupVersion(),
	// 						Plural:        plural,
	// 						Name:          kind,
	// 						Namespaced:    resource.GetNamespaced(),
	// 						Version:       kindVersion,
	// 						Abbreviation:  toAbbreviation(kind),
	// 						ResourceGroup: resolveResourceGroup(kind, resource.GetNamespaced()),
	// 						Verbs:         verbs,
	// 					}
	// 					kinds[kind] = k
	// 				}
	// 			} else if log.GetLevel() >= log.DebugLevel && len(verbs) == 0 {
	// 				log.Warnf("Skipping resource %s (for API Group: %s) with empty verbs...",
	// 					resource.GetName(), apiGroup.GetName())
	// 			}
	// 		}
	// 	}
	// }

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

// var verbsFieldPattern = regexp.MustCompile(`4:"[\S]+"`)
// var individualVerbsPattern = regexp.MustCompile(`(?:\\n\\x\d{2})([a-z]+)`)

// // this is a hack until the k8s client's protobuf is updated to include verbs
// func parseVerbs(resource *unversioned.APIResource) []string {

// 	var verbs []string
// 	unrecognized := string(resource.XXX_unrecognized)
// 	if strings.HasPrefix(unrecognized, "::") {
// 		verbs = strings.Split(unrecognized[2:], ",")
// 	} else {
// 		verbString := verbsFieldPattern.FindString(proto.CompactTextString(resource))
// 		for _, match := range individualVerbsPattern.FindAllStringSubmatch(verbString, -1) {
// 			verbs = append(verbs, match[1])
// 		}
// 	}
// 	return verbs
// }

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

func (k *KindLister) serveKinds(w http.ResponseWriter, r *http.Request) {

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

// func (k *KindLister) coreAPIGroup() (*unversioned.APIResourceList, error) {

// 	r, err := http.NewRequest("GET", fmt.Sprintf(`%s/api/v1`, k.client.Endpoint), nil)
// 	if err != nil {
// 		return nil, err
// 	}
// 	r.Header.Set("Accept", "application/vnd.kubernetes.protobuf")
// 	re, err := k.client.Client.Do(r)
// 	if err != nil {
// 		return nil, err
// 	}
// 	defer re.Body.Close()

// 	respBody, err := ioutil.ReadAll(re.Body)
// 	if err != nil {
// 		return nil, fmt.Errorf("read body: %v", err)
// 	}

// 	if re.StatusCode/100 != 2 {
// 		return nil, fmt.Errorf("Unexpected api response: %s", re.Status)
// 	}
// 	var resourceList unversioned.APIResourceList
// 	err = unmarshalPB(respBody, &resourceList)
// 	if err != nil {
// 		return nil, err
// 	}
// 	return &resourceList, nil
// }

// var magicBytes = []byte{0x6b, 0x38, 0x73, 0x00}

// func unmarshalPB(b []byte, obj interface{}) error {
// 	message, ok := obj.(proto.Message)
// 	if !ok {
// 		return fmt.Errorf("expected obj of type proto.Message, got %T", obj)
// 	}
// 	if len(b) < len(magicBytes) {
// 		return errors.New("payload is not a kubernetes protobuf object")
// 	}
// 	if !bytes.Equal(b[:len(magicBytes)], magicBytes) {
// 		return errors.New("payload is not a kubernetes protobuf object")
// 	}

// 	u := new(runtime.Unknown)
// 	if err := u.Unmarshal(b[len(magicBytes):]); err != nil {
// 		return fmt.Errorf("unmarshal unknown: %v", err)
// 	}
// 	return proto.Unmarshal(u.Raw, message)
// }

// func (k *KindLister) fallbackAPIGroup(groupVersion string) (*unversioned.APIResourceList, error) {

// 	r, err := http.NewRequest("GET", fmt.Sprintf(`%s/apis/%s`, k.client.Endpoint, groupVersion), nil)
// 	if err != nil {
// 		return nil, err
// 	}
// 	r.Header.Set("Accept", "application/json")
// 	re, err := k.client.Client.Do(r)
// 	if err != nil {
// 		return nil, err
// 	}
// 	defer re.Body.Close()

// 	respBody, err := ioutil.ReadAll(re.Body)
// 	if err != nil {
// 		return nil, fmt.Errorf("read body: %v", err)
// 	}

// 	if re.StatusCode/100 != 2 {
// 		return nil, fmt.Errorf("Unexpected api response: %s", re.Status)
// 	}
// 	var resourceList APIResourceList
// 	err = json.Unmarshal(respBody, &resourceList)
// 	if err != nil {
// 		return nil, err
// 	}
// 	uvResourceList := unversioned.APIResourceList{
// 		GroupVersion: resourceList.GroupVersion,
// 	}
// 	for _, r := range resourceList.Resources {
// 		uvResource := r.APIResource
// 		uvResource.XXX_unrecognized = []byte("::" + strings.Join(r.Verbs, ","))
// 		uvResourceList.Resources = append(uvResourceList.Resources, uvResource)
// 	}

// 	return &uvResourceList, nil
// }

// type APIResourceList struct {
// 	GroupVersion *string        `json:"groupVersion"`
// 	Resources    []*APIResource `json:"resources"`
// }

// type APIResource struct {
// 	*unversioned.APIResource
// 	Verbs []string `json:"verbs"`
// }
