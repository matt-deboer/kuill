package types

import (
	"fmt"
	"regexp"

	meta_v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

var possibleNamespace = regexp.MustCompile("([a-z]+-?)+")

type KubeKind struct {
	Plural        string `json:"plural"`
	Name          string `json:"name"`
	Version       string `json:"version"`
	ResourceGroup string `json:"resourceGroup"`
	Abbreviation  string `json:"abbrev"`
	APIBase       string `json:"base"`
	meta_v1.APIResource
}

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

// GetResource returns this KubeKind as a GroupVersionResource
func (k *KubeKind) GetResource() schema.GroupVersionResource {
	return schema.GroupVersionResource{Group: k.ResourceGroup, Version: k.Version, Resource: k.Name}
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
