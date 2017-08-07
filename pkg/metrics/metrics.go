package metrics

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"math"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	log "github.com/Sirupsen/logrus"
	"github.com/alecthomas/units"
	"github.com/ericchiang/k8s"
	apiv1 "github.com/ericchiang/k8s/api/v1"
	"github.com/ghodss/yaml"
	"github.com/matt-deboer/kapow/pkg/auth"
	"k8s.io/kubernetes/pkg/kubelet/api/v1alpha1/stats"
)

const serviceAccountTokenFile = "/var/run/secrets/kubernetes.io/serviceaccount/token"

// Provider gathers metrics from the underlying kubernetes cluster
type Provider struct {
	summary     *Summaries
	mutex       sync.RWMutex
	client      *k8s.Client
	killSwitch  chan struct{}
	bearerToken string
}

// NewMetricsProvider returns a Provider capable of returning metrics for the cluster
func NewMetricsProvider(kubeconfig string) (*Provider, error) {

	var client *k8s.Client
	var err error
	var bearerToken []byte
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

		log.Infof("Using kubeconfig %s", kubeconfig)
		client, err = k8s.NewClient(&config)
		if err != nil {
			return nil, err
		}
	} else {
		log.Infof("Using in-cluster kubeconfig")
		client, err = k8s.NewInClusterClient()
		if err != nil {
			return nil, err
		}
		bearerToken, err = ioutil.ReadFile(serviceAccountTokenFile)
		if err != nil {
			return nil, fmt.Errorf("Failed to read service account token file %s: %v", serviceAccountTokenFile, err)
		}
		if log.GetLevel() >= log.DebugLevel {
			log.Debugf("Got serviceaccount token: '%s'", string(bearerToken))
		}
	}

	m := &Provider{
		client:      client,
		killSwitch:  make(chan struct{}, 1),
		bearerToken: string(bearerToken),
	}

	m.summary = m.summarize()

	go func() {
		for {
			select {
			case _ = <-m.killSwitch:
				return
			default:
				time.Sleep(15 * time.Second)

				summary := m.summarize()

				m.mutex.Lock()
				m.summary = summary
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

func (m *Provider) summarize() *Summaries {

	summary := &Summaries{
		Namespace: make(map[string]*Summary),
		Node:      make(map[string]*Summary),
	}
	aggregates := make(map[string]uint64)
	namespaces := make(map[string]bool)

	for _, node := range m.listNodes() {
		nodeName := *node.Metadata.Name
		nodeSummary := m.readNodeSummary(fmt.Sprintf("%s/api/v1/proxy/nodes/%s:10255/stats/summary", m.client.Endpoint, nodeName))
		if nodeSummary != nil {

			convertedSummary := convertSummary(nodeSummary, node)
			// aggregate at the cluster level
			// aggregates["Cluster:usageCoreNanoSeconds"] += safeGet(nodeSummary.Node.CPU.UsageCoreNanoSeconds)

			aggregates["Cluster:totalMillicores"] += convertedSummary.CPU.Total
			aggregates["Cluster:memTotalBytes"] += convertedSummary.Memory.Total

			aggregates["Cluster:usageNanoCores"] += safeGet(nodeSummary.Node.CPU.UsageNanoCores)
			// aggregates["Cluster:memAvailableBytes"] += safeGet(nodeSummary.Node.Memory.AvailableBytes)
			aggregates["Cluster:memUsageBytes"] += safeGet(nodeSummary.Node.Memory.UsageBytes)
			// aggregates["Cluster:memRSSBytes"] += safeGet(nodeSummary.Node.Memory.RSSBytes)
			// aggregates["Cluster:memWorkingSetBytes"] += safeGet(nodeSummary.Node.Memory.WorkingSetBytes)
			aggregates["Cluster:networkTxBytes"] += safeGet(nodeSummary.Node.Network.TxBytes)
			aggregates["Cluster:networkRxBytes"] += safeGet(nodeSummary.Node.Network.RxBytes)
			aggregates["Cluster:networkSeconds"] += uint64(nodeSummary.Node.Network.Time.Sub(nodeSummary.Node.StartTime.Time).Seconds())
			aggregates["Cluster:fsCapacityBytes"] += safeGet(nodeSummary.Node.Fs.CapacityBytes)
			aggregates["Cluster:fsUsedBytes"] += safeGet(nodeSummary.Node.Fs.UsedBytes)
			// aggregate at the namespace level
			for _, podStats := range nodeSummary.Pods {
				ns := podStats.PodRef.Namespace
				aggregates["Namespace:"+ns+":pods"]++
				aggregates["Cluster:pods"]++
				convertedSummary.Pods.Usage++
				namespaces[ns] = true
				for _, volStats := range podStats.VolumeStats {
					aggregates["Cluster:volCapacityBytes"] += safeGet(volStats.CapacityBytes)
					aggregates["Cluster:volUsedBytes"] += safeGet(volStats.UsedBytes)
					aggregates["Namespace:"+ns+":volCapacityBytes"] += safeGet(volStats.CapacityBytes)
					aggregates["Namespace:"+ns+":volUsedBytes"] += safeGet(volStats.UsedBytes)
				}

				for _, c := range podStats.Containers {
					aggregates["Namespace:"+ns+":containers"]++
					aggregates["Cluster:containers"]++
					convertedSummary.Containers.Usage++
					if c.CPU != nil {
						aggregates["Namespace:"+ns+":usageCoreNanoSeconds"] += safeGet(c.CPU.UsageCoreNanoSeconds)
						aggregates["Namespace:"+ns+":usageNanoCores"] += safeGet(c.CPU.UsageNanoCores)
					}
					if c.Memory != nil {
						aggregates["Namespace:"+ns+":memAvailableBytes"] += safeGet(c.Memory.AvailableBytes)
						aggregates["Namespace:"+ns+":memUsageBytes"] += safeGet(c.Memory.UsageBytes)
						aggregates["Namespace:"+ns+":memRSSBytes"] += safeGet(c.Memory.RSSBytes)
						aggregates["Namespace:"+ns+":memWorkingSetBytes"] += safeGet(c.Memory.WorkingSetBytes)
					}
				}
				if podStats.Network != nil {
					aggregates["Namespace:"+ns+":networkTxBytes"] += safeGet(podStats.Network.TxBytes)
					aggregates["Namespace:"+ns+":networkRxBytes"] += safeGet(podStats.Network.RxBytes)
					aggregates["Namespace:"+ns+":networkSeconds"] += uint64(podStats.Network.Time.Unix() - podStats.StartTime.Time.Unix())
				}
			}
			summary.Node[*node.Metadata.Name] = convertedSummary
		}
	}

	summary.Cluster = makeSummary("Cluster", aggregates)
	for ns := range namespaces {
		prefix := "Namespace:" + ns
		nsSummary := makeSummary(prefix, aggregates)

		// To be replaced by resource quota for the NS, should one exist
		nsSummary.CPU.Total = summary.Cluster.CPU.Total
		nsSummary.CPU.Ratio = float64(nsSummary.CPU.Usage) / float64(nsSummary.CPU.Total)
		nsSummary.Memory.Total = summary.Cluster.Memory.Total
		nsSummary.Memory.Ratio = float64(nsSummary.Memory.Usage) / float64(nsSummary.Memory.Total)

		summary.Namespace[ns] = nsSummary
	}

	return summary
}

func safeGet(ref *uint64) uint64 {
	if ref != nil {
		return *ref
	}
	return 0
}

func convertSummary(summary *stats.Summary, node *apiv1.Node) *Summary {

	networkSeconds := uint64(summary.Node.Network.Time.Unix() - summary.Node.StartTime.Time.Unix())
	volCapacityBytes := uint64(0)
	volUsageBytes := uint64(0)
	for _, podStats := range summary.Pods {
		for _, volStats := range podStats.VolumeStats {
			volUsageBytes += safeGet(volStats.CapacityBytes)
			volCapacityBytes += safeGet(volStats.UsedBytes)
		}
	}

	totalCPUCores, err := strconv.Atoi(*node.Status.Allocatable["cpu"].String_)
	if err != nil {
		log.Errorf("Failed to parse allocatable.cpu; %v", err)
	}
	allocatableBytesString := *node.Status.Allocatable["memory"].String_
	if strings.HasSuffix(allocatableBytesString, "i") {
		allocatableBytesString += "B"
	}
	totalMemoryBytes, err := units.ParseStrictBytes(allocatableBytesString)
	if err != nil {
		log.Errorf("Failed to parse allocatable.memory; %v", err)
	}

	return &Summary{
		CPU: newSummaryStat(
			safeGet(summary.Node.CPU.UsageNanoCores)/1000000,
			uint64(totalCPUCores*1000),
			"millicores"),
		Memory: newSummaryStat(
			safeGet(summary.Node.Memory.UsageBytes),
			uint64(totalMemoryBytes),
			"bytes"),
		Disk: newSummaryStat(
			safeGet(summary.Node.Fs.UsedBytes),
			safeGet(summary.Node.Fs.CapacityBytes),
			"bytes"),
		Volumes: newSummaryStat(
			volUsageBytes,
			volCapacityBytes,
			"bytes"),
		NetRx: newSummaryStat(
			safeGet(summary.Node.Network.RxBytes)/networkSeconds,
			1,
			"bytes/sec"),
		NetTx: newSummaryStat(
			safeGet(summary.Node.Network.TxBytes)/networkSeconds,
			1,
			"bytes/sec"),
		Pods: &SummaryStat{
			Usage: 0,
		},
		Containers: &SummaryStat{
			Usage: 0,
		},
	}
}

func makeSummary(prefix string, aggregates map[string]uint64) *Summary {

	usageNanoCores := aggregates[prefix+":usageNanoCores"]
	totalMillicores := aggregates[prefix+":totalMillicores"]
	memUsageBytes := aggregates[prefix+":memUsageBytes"]
	memTotalBytes := aggregates[prefix+":memTotalBytes"]
	networkTxBytes := aggregates[prefix+":networkTxBytes"]
	networkRxBytes := aggregates[prefix+":networkRxBytes"]
	// We create a fake timespan here with the current time as the endpoint;
	// the important part is that the duration is correct
	networkSeconds := aggregates[prefix+":networkSeconds"]
	if networkSeconds == 0 {
		networkSeconds = math.MaxUint64
	}

	fsCapacityBytes := aggregates[prefix+":fsCapacityBytes"]
	fsUsedBytes := aggregates[prefix+":fsUsedBytes"]
	volCapacityBytes := aggregates[prefix+":volCapacityBytes"]
	volUsedBytes := aggregates[prefix+":volUsedBytes"]
	podCount := aggregates[prefix+":pods"]
	containerCount := aggregates[prefix+":containers"]

	return &Summary{

		CPU: newSummaryStat(
			usageNanoCores/1000000,
			totalMillicores,
			"millicores"),
		Memory: newSummaryStat(
			memUsageBytes,
			memTotalBytes,
			"bytes"),
		Disk: newSummaryStat(
			fsUsedBytes,
			fsCapacityBytes,
			"bytes"),
		Volumes: newSummaryStat(
			volUsedBytes,
			volCapacityBytes,
			"bytes"),
		NetRx: newSummaryStat(
			networkRxBytes/networkSeconds,
			1,
			"bytes/sec"),
		NetTx: newSummaryStat(
			networkTxBytes/networkSeconds,
			1,
			"bytes/sec"),
		Pods: &SummaryStat{
			Usage: podCount,
		},
		Containers: &SummaryStat{
			Usage: containerCount,
		},
	}
}

func (m *Provider) readNodeSummary(path string) *stats.Summary {

	req, err := http.NewRequest("GET", fmt.Sprintf("%s", path), nil)
	if err != nil {
		log.Errorf("Failed to create request for path %s: %v", path, err)
		return nil
	}
	if len(m.bearerToken) > 0 {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", m.bearerToken))
	}

	resp, err := m.client.Client.Do(req)
	if err == nil {
		if resp.StatusCode != http.StatusOK {
			log.Errorf("Failed to read node summary response from '%s'; %s: %v", path, resp.Status, err)
		}
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
		log.Errorf("Failed to read node summary from '%s': %v", path, err)
	}
	return nil
}

func (m *Provider) listNodes() []*apiv1.Node {
	nodes, err := m.client.CoreV1().ListNodes(context.Background())
	if err == nil {
		return nodes.Items
	}
	log.Error(err)
	return []*apiv1.Node{}
}
