package metrics

// Summaries is an aggregate of all summaries
type Summaries struct {
	Namespace map[string]*Summary `json:"namespace"`
	Node      map[string]*Summary `json:"node"`
	Cluster   *Summary            `json:"cluster"`
}

// Summary is a metric summary value for a specific context
type Summary struct {
	CPU        *SummaryStat `json:"cpu"`
	Memory     *SummaryStat `json:"memory"`
	Disk       *SummaryStat `json:"disk"`
	Volumes    *SummaryStat `json:"volumes"`
	NetRx      *SummaryStat `json:"netRx"`
	NetTx      *SummaryStat `json:"netTx"`
	Pods       *SummaryStat `json:"pods"`
	Containers *SummaryStat `json:"containers"`
}

// SummaryStat is a general summary statistic
type SummaryStat struct {
	Usage uint64  `json:"usage"`
	Total uint64  `json:"total"`
	Ratio float64 `json:"ratio"`
	Units string  `json:"units"`
}

func newSummaryStat(usage, total uint64, units string) *SummaryStat {
	stat := &SummaryStat{
		Usage: usage,
		Total: total,
		Units: units,
	}
	if total > 0 {
		stat.Ratio = float64(stat.Usage) / float64(stat.Total)
	}

	return stat
}
