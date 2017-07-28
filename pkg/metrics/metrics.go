package metrics

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"sync"
	"time"

	log "github.com/Sirupsen/logrus"
	"github.com/ericchiang/k8s"
	"github.com/ghodss/yaml"
	"github.com/matt-deboer/kapow/pkg/auth"
	"k8s.io/kubernetes/pkg/kubelet/api/v1alpha1/stats"
)

// Provider gathers metrics from the underlying kubernetes cluster
type Provider struct {
	summary    map[string]*stats.Summary
	mutex      sync.RWMutex
	client     *k8s.Client
	killSwitch chan struct{}
}

// NewMetricsProvider returns a Provider capable of returning metrics for the cluster
func NewMetricsProvider(kubeconfig string) (*Provider, error) {

	var client *k8s.Client
	var err error
	if len(kubeconfig) > 0 {
		data, err := ioutil.ReadFile(kubeconfig)
		if err != nil {
			return nil, fmt.Errorf("read kubeconfig: %v", err)
		}

		// Unmarshal YAML into a Kubernetes config object.
		var config k8s.Config
		if err := yaml.Unmarshal(data, &config); err != nil {
			return nil, fmt.Errorf("unmarshal kubeconfig: %v", err)
		}

		client, err = k8s.NewClient(&config)
		if err != nil {
			return nil, err
		}
	} else {
		client, err = k8s.NewInClusterClient()
		if err != nil {
			return nil, err
		}
	}

	m := &Provider{
		client:     client,
		killSwitch: make(chan struct{}, 1),
	}

	m.summary = m.summarize()

	go func() {
		for {
			select {
			case _ = <-m.killSwitch:
				return
			default:
				time.Sleep(15 * time.Second)
				m.mutex.Lock()

				m.summary = m.summarize()

				m.mutex.Unlock()
			}
		}
	}()

	return m, nil
}

// Close shuts down the metrics provider's background worker(s)
func (m *Provider) Close() {
	m.killSwitch <- struct{}{}
}

// GetMetrics returns a summarized metrics bundle for the entire cluster
func (m *Provider) GetMetrics(w http.ResponseWriter, r *http.Request, context auth.Context) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	data, err := json.Marshal(m.summary)
	if err != nil {
		log.Error(err)
		http.Error(w, "Failed to marshall metrics", http.StatusInternalServerError)
	} else {
		w.Header().Set("Content-Type", "application/json")
		w.Write(data)
	}
}

func (m *Provider) summarize() map[string]*stats.Summary {

	summary := make(map[string]*stats.Summary)

	aggregates := make(map[string]uint64)
	namespaces := make(map[string]bool)

	for _, nodeName := range m.listNodes() {
		nodeSummary := m.readNodeSummary(fmt.Sprintf("%s/api/v1/proxy/nodes/%s:10255/stats/summary", m.client.Endpoint, nodeName))
		if nodeSummary != nil {
			// aggregate at the cluster level
			aggregates["Cluster:usageCoreNanoSeconds"] += *nodeSummary.Node.CPU.UsageCoreNanoSeconds
			aggregates["Cluster:usageNanoCores"] += *nodeSummary.Node.CPU.UsageNanoCores
			aggregates["Cluster:memAvailableBytes"] += *nodeSummary.Node.Memory.AvailableBytes
			aggregates["Cluster:memUsageBytes"] += *nodeSummary.Node.Memory.UsageBytes
			aggregates["Cluster:memRSSBytes"] += *nodeSummary.Node.Memory.RSSBytes
			aggregates["Cluster:memWorkingSetBytes"] += *nodeSummary.Node.Memory.WorkingSetBytes

			// aggregate at the namespace level
			for _, podStats := range nodeSummary.Pods {
				ns := podStats.PodRef.Namespace
				namespaces[ns] = true
				for _, c := range podStats.Containers {
					if c.CPU.UsageCoreNanoSeconds != nil {
						aggregates["Namespace:"+ns+":usageCoreNanoSeconds"] += *c.CPU.UsageCoreNanoSeconds
					}
					if c.CPU.UsageNanoCores != nil {
						aggregates["Namespace:"+ns+":usageNanoCores"] += *c.CPU.UsageNanoCores
					}
					if c.Memory.AvailableBytes != nil {
						aggregates["Namespace:"+ns+":memAvailableBytes"] += *c.Memory.AvailableBytes
					}
					if c.Memory.UsageBytes != nil {
						aggregates["Namespace:"+ns+":memUsageBytes"] += *c.Memory.UsageBytes
					}
					if c.Memory.RSSBytes != nil {
						aggregates["Namespace:"+ns+":memRSSBytes"] += *c.Memory.RSSBytes
					}
					if c.Memory.WorkingSetBytes != nil {
						aggregates["Namespace:"+ns+":memWorkingSetBytes"] += *c.Memory.WorkingSetBytes
					}
				}
			}
			summary["Node:"+nodeName] = nodeSummary
		}
	}

	summary["Cluster"] = makeSummary("Cluster", aggregates)
	for ns := range namespaces {
		prefix := "Namespace:" + ns
		summary[prefix] = makeSummary(prefix, aggregates)
	}

	return summary
}

func makeSummary(prefix string, aggregates map[string]uint64) *stats.Summary {

	usageCoreNanoSeconds := aggregates[prefix+":usageCoreNanoSeconds"]
	usageNanoCores := aggregates[prefix+":usageNanoCores"]
	memAvailableBytes := aggregates[prefix+":memAvailableBytes"]
	memUsageBytes := aggregates[prefix+":memUsageBytes"]
	memRSSBytes := aggregates[prefix+":memRSSBytes"]
	memWorkingSetBytes := aggregates[prefix+":memWorkingSetBytes"]

	return &stats.Summary{
		Node: stats.NodeStats{
			NodeName: prefix,
			CPU: &stats.CPUStats{
				UsageCoreNanoSeconds: &usageCoreNanoSeconds,
				UsageNanoCores:       &usageNanoCores,
			},
			Memory: &stats.MemoryStats{
				AvailableBytes:  &memAvailableBytes,
				UsageBytes:      &memUsageBytes,
				RSSBytes:        &memRSSBytes,
				WorkingSetBytes: &memWorkingSetBytes,
			},
		},
	}
}

func (m *Provider) readNodeSummary(path string) *stats.Summary {

	resp, err := m.client.Client.Get(fmt.Sprintf("%s", path))
	if err == nil {
		b, err := ioutil.ReadAll(resp.Body)
		if err == nil {
			var data stats.Summary
			if err = json.Unmarshal(b, &data); err == nil {
				return &data
			}
			log.Errorf("Failed to unmarshal node summary response from '%s'; %v", path, string(b))
		} else {
			log.Errorf("Failed to read node summary response from '%s'; %v", path, err)
		}
	} else {
		log.Errorf("Failed to read node summary from '%s'; %d: %v", path, resp.StatusCode, err)
	}
	return nil
}

func (m *Provider) listNodes() []string {
	names := []string{}
	nodes, err := m.client.CoreV1().ListNodes(context.Background())
	if err != nil {
		log.Error(err)
	} else {
		for _, node := range nodes.Items {
			names = append(names, *node.Metadata.Name)
		}
	}
	return names
}
