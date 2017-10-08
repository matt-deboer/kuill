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

	"github.com/alecthomas/units"
	"github.com/ericchiang/k8s"
	apiv1 "github.com/ericchiang/k8s/api/v1"
	"github.com/matt-deboer/kuill/pkg/auth"
	"github.com/matt-deboer/kuill/pkg/helpers"
	log "github.com/sirupsen/logrus"
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

	client, bearerToken, err := helpers.NewKubeClient(kubeconfig)
	if err != nil {
		return nil, err
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
			// aggregates["Cluster:usageCoreNanoSeconds"] += nodeSummary.Node.CPU.UsageCoreNanoSeconds

			aggregates["Cluster:totalMillicores"] += convertedSummary.CPU.Total
			aggregates["Cluster:memTotalBytes"] += convertedSummary.Memory.Total

			aggregates["Cluster:usageNanoCores"] += nodeSummary.Node.CPU.UsageNanoCores
			// aggregates["Cluster:memAvailableBytes"] += nodeSummary.Node.Memory.AvailableBytes
			aggregates["Cluster:memUsageBytes"] += nodeSummary.Node.Memory.UsageBytes
			// aggregates["Cluster:memRSSBytes"] += nodeSummary.Node.Memory.RSSBytes
			// aggregates["Cluster:memWorkingSetBytes"] += nodeSummary.Node.Memory.WorkingSetBytes
			aggregates["Cluster:networkTxBytes"] += nodeSummary.Node.Network.TxBytes
			aggregates["Cluster:networkRxBytes"] += nodeSummary.Node.Network.RxBytes
			aggregates["Cluster:networkSeconds"] += uint64(nodeSummary.Node.Network.Time.Sub(nodeSummary.Node.StartTime).Seconds())
			aggregates["Cluster:fsCapacityBytes"] += nodeSummary.Node.Fs.CapacityBytes
			aggregates["Cluster:fsUsedBytes"] += nodeSummary.Node.Fs.UsedBytes
			// aggregate at the namespace level
			for _, podStats := range nodeSummary.Pods {
				ns := podStats.PodRef.Namespace
				aggregates["Namespace:"+ns+":pods"]++
				aggregates["Cluster:pods"]++
				convertedSummary.Pods.Usage++
				namespaces[ns] = true
				for _, volStats := range podStats.VolumeStats {
					aggregates["Cluster:volCapacityBytes"] += volStats.CapacityBytes
					aggregates["Cluster:volUsedBytes"] += volStats.UsedBytes
					aggregates["Namespace:"+ns+":volCapacityBytes"] += volStats.CapacityBytes
					aggregates["Namespace:"+ns+":volUsedBytes"] += volStats.UsedBytes
				}

				for _, c := range podStats.Containers {
					aggregates["Namespace:"+ns+":containers"]++
					aggregates["Cluster:containers"]++
					convertedSummary.Containers.Usage++
					if c.CPU != nil {
						aggregates["Namespace:"+ns+":usageCoreNanoSeconds"] += c.CPU.UsageCoreNanoSeconds
						aggregates["Namespace:"+ns+":usageNanoCores"] += c.CPU.UsageNanoCores
					}
					if c.Memory != nil {
						aggregates["Namespace:"+ns+":memAvailableBytes"] += c.Memory.AvailableBytes
						aggregates["Namespace:"+ns+":memUsageBytes"] += c.Memory.UsageBytes
						aggregates["Namespace:"+ns+":memRSSBytes"] += c.Memory.RSSBytes
						aggregates["Namespace:"+ns+":memWorkingSetBytes"] += c.Memory.WorkingSetBytes
					}
				}
				if podStats.Network != nil {
					aggregates["Namespace:"+ns+":networkTxBytes"] += podStats.Network.TxBytes
					aggregates["Namespace:"+ns+":networkRxBytes"] += podStats.Network.RxBytes
					aggregates["Namespace:"+ns+":networkSeconds"] += uint64(podStats.Network.Time.Unix() - podStats.StartTime.Unix())
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

func convertSummary(summary *KubeletStatsSummary, node *apiv1.Node) *Summary {

	networkSeconds := uint64(summary.Node.Network.Time.Unix() - summary.Node.StartTime.Unix())
	volCapacityBytes := uint64(0)
	volUsageBytes := uint64(0)
	for _, podStats := range summary.Pods {
		for _, volStats := range podStats.VolumeStats {
			volUsageBytes += volStats.CapacityBytes
			volCapacityBytes += volStats.UsedBytes
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

	if summary.Node.CPU == nil {
		summary.Node.CPU = &CPUStats{}
	}

	if summary.Node.Memory == nil {
		summary.Node.Memory = &MemoryStats{}
	}

	if summary.Node.Fs == nil {
		summary.Node.Fs = &FsStats{}
	}

	return &Summary{
		CPU: newSummaryStat(
			summary.Node.CPU.UsageNanoCores/1000000,
			uint64(totalCPUCores*1000),
			"millicores"),
		Memory: newSummaryStat(
			summary.Node.Memory.UsageBytes,
			uint64(totalMemoryBytes),
			"bytes"),
		Disk: newSummaryStat(
			summary.Node.Fs.UsedBytes,
			summary.Node.Fs.CapacityBytes,
			"bytes"),
		Volumes: newSummaryStat(
			volUsageBytes,
			volCapacityBytes,
			"bytes"),
		NetRx: newSummaryStat(
			summary.Node.Network.RxBytes/networkSeconds,
			1,
			"bytes/sec"),
		NetTx: newSummaryStat(
			summary.Node.Network.TxBytes/networkSeconds,
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

func (m *Provider) readNodeSummary(path string) *KubeletStatsSummary {

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
			// var data stats.Summary
			var data KubeletStatsSummary
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
