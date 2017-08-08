package metrics

import (
	"time"
)

// Note: structures here are based on the kubelet stats structures in
// kubernets/kubernetes/pkg/kubelet/apis/stats/v1alpha1/types.go
// That package is not imported directly in order to avoid massive inclusion
// of (and dependency on) the kubernetes codebase and all its deps
// This does pose a risk in that if the stats summary api is updated in a non-compatible
// way, our metrics are broken as well--but that would break other clients at the same time.

// KubeletStatsSummary is a top-level container for holding NodeStats and PodStats.
type KubeletStatsSummary struct {
	Node NodeStats  `json:"node"`
	Pods []PodStats `json:"pods"`
}

// NodeStats holds node-level unprocessed sample stats.
type NodeStats struct {
	NodeName         string           `json:"nodeName"`
	SystemContainers []ContainerStats `json:"systemContainers"`
	StartTime        time.Time        `json:"startTime"`
	CPU              *CPUStats        `json:"cpu"`
	Memory           *MemoryStats     `json:"memory"`
	Network          *NetworkStats    `json:"network"`
	Fs               *FsStats         `json:"fs"`
	Runtime          *RuntimeStats    `json:"runtime"`
}

// RuntimeStats pertain to the underlying container runtime.
type RuntimeStats struct {
	ImageFs *FsStats `json:"imageFs"`
}

// PodStats holds pod-level unprocessed sample stats.
type PodStats struct {
	PodRef      PodReference     `json:"podRef"`
	StartTime   time.Time        `json:"startTime"`
	Containers  []ContainerStats `json:"containers"`
	Network     *NetworkStats    `json:"network"`
	VolumeStats []VolumeStats    `json:"volume"`
}

// ContainerStats holds container-level unprocessed sample stats.
type ContainerStats struct {
	Name      string       `json:"name"`
	StartTime time.Time    `json:"startTime"`
	CPU       *CPUStats    `json:"cpu"`
	Memory    *MemoryStats `json:"memory"`
	Rootfs    *FsStats     `json:"rootfs"`
	Logs      *FsStats     `json:"logs"`
}

// PodReference contains enough information to locate the referenced pod.
type PodReference struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	UID       string `json:"uid"`
}

// NetworkStats contains data about network resources.
type NetworkStats struct {
	Time     time.Time `json:"time"`
	RxBytes  uint64    `json:"rxBytes"`
	RxErrors uint64    `json:"rxErrors"`
	TxBytes  uint64    `json:"txBytes"`
	TxErrors uint64    `json:"txErrors"`
}

// CPUStats contains data about CPU usage.
type CPUStats struct {
	Time                 time.Time `json:"time"`
	UsageNanoCores       uint64    `json:"usageNanoCores"`
	UsageCoreNanoSeconds uint64    `json:"usageCoreNanoSeconds"`
}

// MemoryStats contains data about memory usage.
type MemoryStats struct {
	Time            time.Time `json:"time"`
	AvailableBytes  uint64    `json:"availableBytes"`
	UsageBytes      uint64    `json:"usageBytes"`
	WorkingSetBytes uint64    `json:"workingSetBytes"`
	RSSBytes        uint64    `json:"rssBytes"`
	PageFaults      uint64    `json:"pageFaults"`
	MajorPageFaults uint64    `json:"majorPageFaults"`
}

// VolumeStats contains data about Volume filesystem usage.
type VolumeStats struct {
	FsStats
	Name string `json:"name"`
}

// FsStats contains data about filesystem usage.
type FsStats struct {
	Time           time.Time `json:"time"`
	AvailableBytes uint64    `json:"availableBytes"`
	CapacityBytes  uint64    `json:"capacityBytes"`
	UsedBytes      uint64    `json:"usedBytes"`
	InodesFree     uint64    `json:"inodesFree"`
	Inodes         uint64    `json:"inodes"`
	InodesUsed     uint64    `json:"inodesUsed"`
}
