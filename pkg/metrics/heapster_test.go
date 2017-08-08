package metrics

// import (
// 	"net/http"
// 	"net/http/httptest"
// 	"strings"
// 	"testing"
// )

// var metrics = map[string]string{
// 	"/api/v1/model/metrics/cpu/limit": `{
// 			"metrics": [
// 			{
// 				"timestamp": "2017-07-26T05:02:00Z",
// 				"value": 3185
// 			},
// 			{
// 				"timestamp": "2017-07-26T05:03:00Z",
// 				"value": 3185
// 			},
// 			{
// 				"timestamp": "2017-07-26T05:04:00Z",
// 				"value": 3185
// 			}
// 			],
// 			"latestTimestamp": "2017-07-26T05:04:00Z"
// 		}`,
// 	"/api/v1/model/metrics/cpu/usage_rate": `{
//   "metrics": [
//    {
//     "timestamp": "2017-07-26T04:56:00Z",
//     "value": 387
//    },
//    {
//     "timestamp": "2017-07-26T04:57:00Z",
//     "value": 410
//    },
//    {
//     "timestamp": "2017-07-26T04:58:00Z",
//     "value": 412
//    },
//    {
//     "timestamp": "2017-07-26T04:59:00Z",
//     "value": 391
//    },
//    {
//     "timestamp": "2017-07-26T05:00:00Z",
//     "value": 400
//    },
//    {
//     "timestamp": "2017-07-26T05:01:00Z",
//     "value": 391
//    },
//    {
//     "timestamp": "2017-07-26T05:02:00Z",
//     "value": 393
//    },
//    {
//     "timestamp": "2017-07-26T05:03:00Z",
//     "value": 403
//    },
//    {
//     "timestamp": "2017-07-26T05:04:00Z",
//     "value": 380
//    },
//    {
//     "timestamp": "2017-07-26T05:05:00Z",
//     "value": 399
//    },
//    {
//     "timestamp": "2017-07-26T05:06:00Z",
//     "value": 383
//    },
//    {
//     "timestamp": "2017-07-26T05:07:00Z",
//     "value": 396
//    },
//    {
//     "timestamp": "2017-07-26T05:08:00Z",
//     "value": 400
//    },
//    {
//     "timestamp": "2017-07-26T05:09:00Z",
//     "value": 380
//    },
//    {
//     "timestamp": "2017-07-26T05:10:00Z",
//     "value": 405
//    }
//   ],
//   "latestTimestamp": "2017-07-26T05:10:00Z"
//  }`,
// 	"/api/v1/model/metrics/cpu/request": `{
//   "metrics": [
//    {
//     "timestamp": "2017-07-26T05:08:00Z",
//     "value": 3645
//    },
//    {
//     "timestamp": "2017-07-26T05:09:00Z",
//     "value": 3645
//    },
//    {
//     "timestamp": "2017-07-26T05:10:00Z",
//     "value": 3645
//    }
//   ],
//   "latestTimestamp": "2017-07-26T05:10:00Z"
//  }`,
// 	"/api/v1/model/metrics/memory/limit": `{
//   "metrics": [
//    {
//     "timestamp": "2017-07-26T05:09:00Z",
//     "value": 3414163456
//    },
//    {
//     "timestamp": "2017-07-26T05:10:00Z",
//     "value": 3414163456
//    },
//    {
//     "timestamp": "2017-07-26T05:11:00Z",
//     "value": 3414163456
//    }
//   ],
//   "latestTimestamp": "2017-07-26T05:11:00Z"
//  }`,
// 	"/api/v1/model/metrics/memory/usage": `{
//   "metrics": [
//    {
//     "timestamp": "2017-07-26T04:58:00Z",
//     "value": 7373385728
//    },
//    {
//     "timestamp": "2017-07-26T04:59:00Z",
//     "value": 7392526336
//    },
//    {
//     "timestamp": "2017-07-26T05:00:00Z",
//     "value": 7404572672
//    },
//    {
//     "timestamp": "2017-07-26T05:01:00Z",
//     "value": 7407816704
//    },
//    {
//     "timestamp": "2017-07-26T05:02:00Z",
//     "value": 7400804352
//    },
//    {
//     "timestamp": "2017-07-26T05:03:00Z",
//     "value": 7390502912
//    },
//    {
//     "timestamp": "2017-07-26T05:04:00Z",
//     "value": 7360864256
//    },
//    {
//     "timestamp": "2017-07-26T05:05:00Z",
//     "value": 7360593920
//    },
//    {
//     "timestamp": "2017-07-26T05:06:00Z",
//     "value": 7376207872
//    },
//    {
//     "timestamp": "2017-07-26T05:07:00Z",
//     "value": 7379312640
//    },
//    {
//     "timestamp": "2017-07-26T05:08:00Z",
//     "value": 7384141824
//    },
//    {
//     "timestamp": "2017-07-26T05:09:00Z",
//     "value": 7388684288
//    },
//    {
//     "timestamp": "2017-07-26T05:10:00Z",
//     "value": 7389626368
//    },
//    {
//     "timestamp": "2017-07-26T05:11:00Z",
//     "value": 7356788736
//    },
//    {
//     "timestamp": "2017-07-26T05:12:00Z",
//     "value": 7363641344
//    }
//   ],
//   "latestTimestamp": "2017-07-26T05:12:00Z"
//  }`,
// 	"/api/v1/model/metrics/memory/request": `{
//   "metrics": [
//    {
//     "timestamp": "2017-07-26T05:10:00Z",
//     "value": 5039456256
//    },
//    {
//     "timestamp": "2017-07-26T05:11:00Z",
//     "value": 5039456256
//    },
//    {
//     "timestamp": "2017-07-26T05:12:00Z",
//     "value": 5039456256
//    }
//   ],
//   "latestTimestamp": "2017-07-26T05:12:00Z"
//  }`,
// 	"/api/v1/model/nodes/ip-10-253-160-168.us-west-2.compute.internal/metrics/cpu/limit": `{
//   "metrics": [
//    {
//     "timestamp": "2017-07-26T18:20:00Z",
//     "value": 100
//    },
//    {
//     "timestamp": "2017-07-26T18:21:00Z",
//     "value": 100
//    },
//    {
//     "timestamp": "2017-07-26T18:22:00Z",
//     "value": 100
//    }
//   ],
//   "latestTimestamp": "2017-07-26T18:22:00Z"
//  }`,
// 	"/api/v1/model/nodes/ip-10-253-160-168.us-west-2.compute.internal/metrics/cpu/usage_rate": `{
//   "metrics": [
//    {
//     "timestamp": "2017-07-26T18:14:00Z",
//     "value": 83
//    },
//    {
//     "timestamp": "2017-07-26T18:15:00Z",
//     "value": 78
//    },
//    {
//     "timestamp": "2017-07-26T18:16:00Z",
//     "value": 76
//    },
//    {
//     "timestamp": "2017-07-26T18:17:00Z",
//     "value": 81
//    },
//    {
//     "timestamp": "2017-07-26T18:18:00Z",
//     "value": 82
//    },
//    {
//     "timestamp": "2017-07-26T18:19:00Z",
//     "value": 80
//    },
//    {
//     "timestamp": "2017-07-26T18:20:00Z",
//     "value": 81
//    },
//    {
//     "timestamp": "2017-07-26T18:21:00Z",
//     "value": 82
//    },
//    {
//     "timestamp": "2017-07-26T18:22:00Z",
//     "value": 85
//    },
//    {
//     "timestamp": "2017-07-26T18:23:00Z",
//     "value": 79
//    },
//    {
//     "timestamp": "2017-07-26T18:24:00Z",
//     "value": 80
//    },
//    {
//     "timestamp": "2017-07-26T18:25:00Z",
//     "value": 81
//    },
//    {
//     "timestamp": "2017-07-26T18:26:00Z",
//     "value": 83
//    },
//    {
//     "timestamp": "2017-07-26T18:27:00Z",
//     "value": 86
//    },
//    {
//     "timestamp": "2017-07-26T18:28:00Z",
//     "value": 80
//    }
//   ],
//   "latestTimestamp": "2017-07-26T18:28:00Z"
//  }`,
// 	"/api/v1/model/nodes/ip-10-253-160-168.us-west-2.compute.internal/metrics/cpu/request": `{
//   "metrics": [
//    {
//     "timestamp": "2017-07-26T18:30:00Z",
//     "value": 660
//    },
//    {
//     "timestamp": "2017-07-26T18:31:00Z",
//     "value": 660
//    },
//    {
//     "timestamp": "2017-07-26T18:32:00Z",
//     "value": 660
//    }
//   ],
//   "latestTimestamp": "2017-07-26T18:32:00Z"
//  }`,
// 	"/api/v1/model/nodes/ip-10-253-160-168.us-west-2.compute.internal/metrics/memory/limit": `{
//   "metrics": [
//    {
//     "timestamp": "2017-07-26T18:30:00Z",
//     "value": 178257920
//    },
//    {
//     "timestamp": "2017-07-26T18:31:00Z",
//     "value": 178257920
//    },
//    {
//     "timestamp": "2017-07-26T18:32:00Z",
//     "value": 178257920
//    }
//   ],
//   "latestTimestamp": "2017-07-26T18:32:00Z"
//  }`,
// 	"/api/v1/model/nodes/ip-10-253-160-168.us-west-2.compute.internal/metrics/memory/usage": `{
//   "metrics": [
//    {
//     "timestamp": "2017-07-26T18:19:00Z",
//     "value": 3285962752
//    },
//    {
//     "timestamp": "2017-07-26T18:20:00Z",
//     "value": 3291824128
//    },
//    {
//     "timestamp": "2017-07-26T18:21:00Z",
//     "value": 3295936512
//    },
//    {
//     "timestamp": "2017-07-26T18:22:00Z",
//     "value": 3301134336
//    },
//    {
//     "timestamp": "2017-07-26T18:23:00Z",
//     "value": 3302912000
//    },
//    {
//     "timestamp": "2017-07-26T18:24:00Z",
//     "value": 3304169472
//    },
//    {
//     "timestamp": "2017-07-26T18:25:00Z",
//     "value": 3296669696
//    },
//    {
//     "timestamp": "2017-07-26T18:26:00Z",
//     "value": 3304321024
//    },
//    {
//     "timestamp": "2017-07-26T18:27:00Z",
//     "value": 3300163584
//    },
//    {
//     "timestamp": "2017-07-26T18:28:00Z",
//     "value": 3300278272
//    },
//    {
//     "timestamp": "2017-07-26T18:29:00Z",
//     "value": 3300933632
//    },
//    {
//     "timestamp": "2017-07-26T18:30:00Z",
//     "value": 3303534592
//    },
//    {
//     "timestamp": "2017-07-26T18:31:00Z",
//     "value": 3304456192
//    },
//    {
//     "timestamp": "2017-07-26T18:32:00Z",
//     "value": 3304669184
//    },
//    {
//     "timestamp": "2017-07-26T18:33:00Z",
//     "value": 3304284160
//    }
//   ],
//   "latestTimestamp": "2017-07-26T18:33:00Z"
//  }`,
// 	"/api/v1/model/nodes/ip-10-253-160-168.us-west-2.compute.internal/metrics/memory/request": `{
//   "metrics": [
//    {
//     "timestamp": "2017-07-26T18:32:00Z",
//     "value": 115343360
//    },
//    {
//     "timestamp": "2017-07-26T18:33:00Z",
//     "value": 115343360
//    },
//    {
//     "timestamp": "2017-07-26T18:34:00Z",
//     "value": 115343360
//    }
//   ],
//   "latestTimestamp": "2017-07-26T18:34:00Z"
//  }`,
// 	"/api/v1/model/nodes/ip-10-253-159-58.us-west-2.compute.internal/metrics/cpu/limit": `{
//   "metrics": [
//    {
//     "timestamp": "2017-07-26T18:20:00Z",
//     "value": 100
//    },
//    {
//     "timestamp": "2017-07-26T18:21:00Z",
//     "value": 100
//    },
//    {
//     "timestamp": "2017-07-26T18:22:00Z",
//     "value": 100
//    }
//   ],
//   "latestTimestamp": "2017-07-26T18:22:00Z"
//  }`,
// 	"/api/v1/model/nodes/ip-10-253-159-58.us-west-2.compute.internal/metrics/cpu/usage_rate": `{
//   "metrics": [
//    {
//     "timestamp": "2017-07-26T18:14:00Z",
//     "value": 83
//    },
//    {
//     "timestamp": "2017-07-26T18:15:00Z",
//     "value": 78
//    },
//    {
//     "timestamp": "2017-07-26T18:16:00Z",
//     "value": 76
//    },
//    {
//     "timestamp": "2017-07-26T18:17:00Z",
//     "value": 81
//    },
//    {
//     "timestamp": "2017-07-26T18:18:00Z",
//     "value": 82
//    },
//    {
//     "timestamp": "2017-07-26T18:19:00Z",
//     "value": 80
//    },
//    {
//     "timestamp": "2017-07-26T18:20:00Z",
//     "value": 81
//    },
//    {
//     "timestamp": "2017-07-26T18:21:00Z",
//     "value": 82
//    },
//    {
//     "timestamp": "2017-07-26T18:22:00Z",
//     "value": 85
//    },
//    {
//     "timestamp": "2017-07-26T18:23:00Z",
//     "value": 79
//    },
//    {
//     "timestamp": "2017-07-26T18:24:00Z",
//     "value": 80
//    },
//    {
//     "timestamp": "2017-07-26T18:25:00Z",
//     "value": 81
//    },
//    {
//     "timestamp": "2017-07-26T18:26:00Z",
//     "value": 83
//    },
//    {
//     "timestamp": "2017-07-26T18:27:00Z",
//     "value": 86
//    },
//    {
//     "timestamp": "2017-07-26T18:28:00Z",
//     "value": 80
//    }
//   ],
//   "latestTimestamp": "2017-07-26T18:28:00Z"
//  }`,
// 	"/api/v1/model/nodes/ip-10-253-159-58.us-west-2.compute.internal/metrics/cpu/request": `{
//   "metrics": [
//    {
//     "timestamp": "2017-07-26T18:30:00Z",
//     "value": 660
//    },
//    {
//     "timestamp": "2017-07-26T18:31:00Z",
//     "value": 660
//    },
//    {
//     "timestamp": "2017-07-26T18:32:00Z",
//     "value": 660
//    }
//   ],
//   "latestTimestamp": "2017-07-26T18:32:00Z"
//  }`,
// 	"/api/v1/model/nodes/ip-10-253-159-58.us-west-2.compute.internal/metrics/memory/limit": `{
//   "metrics": [
//    {
//     "timestamp": "2017-07-26T18:30:00Z",
//     "value": 178257920
//    },
//    {
//     "timestamp": "2017-07-26T18:31:00Z",
//     "value": 178257920
//    },
//    {
//     "timestamp": "2017-07-26T18:32:00Z",
//     "value": 178257920
//    }
//   ],
//   "latestTimestamp": "2017-07-26T18:32:00Z"
//  }`,
// 	"/api/v1/model/nodes/ip-10-253-159-58.us-west-2.compute.internal/metrics/memory/usage": `{
//   "metrics": [
//    {
//     "timestamp": "2017-07-26T18:19:00Z",
//     "value": 3285962752
//    },
//    {
//     "timestamp": "2017-07-26T18:20:00Z",
//     "value": 3291824128
//    },
//    {
//     "timestamp": "2017-07-26T18:21:00Z",
//     "value": 3295936512
//    },
//    {
//     "timestamp": "2017-07-26T18:22:00Z",
//     "value": 3301134336
//    },
//    {
//     "timestamp": "2017-07-26T18:23:00Z",
//     "value": 3302912000
//    },
//    {
//     "timestamp": "2017-07-26T18:24:00Z",
//     "value": 3304169472
//    },
//    {
//     "timestamp": "2017-07-26T18:25:00Z",
//     "value": 3296669696
//    },
//    {
//     "timestamp": "2017-07-26T18:26:00Z",
//     "value": 3304321024
//    },
//    {
//     "timestamp": "2017-07-26T18:27:00Z",
//     "value": 3300163584
//    },
//    {
//     "timestamp": "2017-07-26T18:28:00Z",
//     "value": 3300278272
//    },
//    {
//     "timestamp": "2017-07-26T18:29:00Z",
//     "value": 3300933632
//    },
//    {
//     "timestamp": "2017-07-26T18:30:00Z",
//     "value": 3303534592
//    },
//    {
//     "timestamp": "2017-07-26T18:31:00Z",
//     "value": 3304456192
//    },
//    {
//     "timestamp": "2017-07-26T18:32:00Z",
//     "value": 3304669184
//    },
//    {
//     "timestamp": "2017-07-26T18:33:00Z",
//     "value": 3304284160
//    }
//   ],
//   "latestTimestamp": "2017-07-26T18:33:00Z"
//  }`,
// 	"/api/v1/model/nodes/ip-10-253-159-58.us-west-2.compute.internal/metrics/memory/request": `{
//   "metrics": [
//    {
//     "timestamp": "2017-07-26T18:32:00Z",
//     "value": 115343360
//    },
//    {
//     "timestamp": "2017-07-26T18:33:00Z",
//     "value": 115343360
//    },
//    {
//     "timestamp": "2017-07-26T18:34:00Z",
//     "value": 115343360
//    }
//   ],
//   "latestTimestamp": "2017-07-26T18:34:00Z"
//  }`,
// 	"/api/v1/model/debug/allkeys": `[
// 		"namespace:kube-system/pod:kube-controller-manager-ip-10-253-160-168.us-west-2.compute.internal",
// 		"namespace:kube-system/pod:kube-dns-688676693-ltxm9/container:sidecar",
// 		"node:ip-10-253-160-168.us-west-2.compute.internal/container:system.slice/docker.service",
// 		"node:ip-10-253-159-58.us-west-2.compute.internal/container:system.slice/rkt-pre-pull.service",
// 		"node:ip-10-253-159-58.us-west-2.compute.internal/container:system.slice/system-systemd\\x2dfsck.slice",
// 		"node:ip-10-253-160-168.us-west-2.compute.internal/container:system.slice/systemd-fsck-root.service"
// 	]`,
// }

// type heapsterTestHandler struct{}

// func (h *heapsterTestHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
// 	if body, ok := metrics[r.URL.Path]; ok {
// 		w.Write([]byte(body))
// 	} else {
// 		http.NotFound(w, r)
// 	}
// }

// func TestParseMetrics(t *testing.T) {
// 	th := &heapsterTestHandler{}
// 	server := httptest.NewServer(th)
// 	defer server.Close()

// 	h := newHeapsterMetricsProvider(server.URL)
// 	defer h.Close()

// 	memUtilization := h.GetMemoryUtilization()
// 	if memUtilization == nil {
// 		t.Errorf("memUtilization should not be nil")
// 	}

// 	if u, ok := memUtilization["Cluster"]; ok {
// 		if len(u.Limit) == 0 {
// 			t.Errorf("memUtilization cluster-level limit should not be empty")
// 		} else if len(u.Request) == 0 {
// 			t.Errorf("memUtilization cluster-level request should not be empty")
// 		} else if len(u.Usage) == 0 {
// 			t.Errorf("memUtilization cluster-level usage should not be empty")
// 		}
// 	} else {
// 		t.Errorf("memUtilization should have a cluster-level entry with key ''")
// 	}

// 	nodeLevelEntries := 0
// 	for k, u := range memUtilization {
// 		if strings.HasPrefix(k, "Node:") {
// 			nodeLevelEntries++
// 			if len(u.Limit) == 0 {
// 				t.Errorf("memUtilization cluster-level limit should not be empty")
// 			} else if len(u.Request) == 0 {
// 				t.Errorf("memUtilization cluster-level request should not be empty")
// 			} else if len(u.Usage) == 0 {
// 				t.Errorf("memUtilization cluster-level usage should not be empty")
// 			}
// 		} else {
// 			if u.Usage[len(u.Usage)-1].Value != 7363641344 {
// 				t.Errorf("Expected memUtilization latest limit of %d; got %d", 7363641344, u.Usage[len(u.Usage)-1].Value)
// 			}
// 		}
// 	}

// 	if nodeLevelEntries != 2 {
// 		t.Errorf("memUtilization should have 2 node level entries; got %d", nodeLevelEntries)
// 	}

// 	cpuUtilization := h.GetCPUUtilization()
// 	if cpuUtilization == nil {
// 		t.Errorf("cpuUtilization should not be nil")
// 	}

// 	if u, ok := cpuUtilization["Cluster"]; ok {
// 		if len(u.Limit) == 0 {
// 			t.Errorf("cpuUtilization cluster-level limit should not be empty")
// 		} else if len(u.Request) == 0 {
// 			t.Errorf("cpuUtilization cluster-level request should not be empty")
// 		} else if len(u.Usage) == 0 {
// 			t.Errorf("cpuUtilization cluster-level usage should not be empty")
// 		}
// 	} else {
// 		t.Errorf("cpuUtilization should have a cluster-level entry with key ''")
// 	}

// 	nodeLevelEntries = 0
// 	for k, u := range cpuUtilization {
// 		if strings.HasPrefix(k, "Node:") {
// 			nodeLevelEntries++
// 			if len(u.Limit) == 0 {
// 				t.Errorf("cpuUtilization cluster-level limit should not be empty")
// 			} else if len(u.Request) == 0 {
// 				t.Errorf("cpuUtilization cluster-level request should not be empty")
// 			} else if len(u.Usage) == 0 {
// 				t.Errorf("cpuUtilization cluster-level usage should not be empty")
// 			}
// 		} else {
// 			if u.Usage[len(u.Usage)-1].Value != 405 {
// 				t.Errorf("Expected cpuUtilization latest usage of %d; got %d", 7363641344, u.Usage[len(u.Usage)-1].Value)
// 			}
// 		}
// 	}

// 	if nodeLevelEntries != 2 {
// 		t.Errorf("cpuUtilization should have 2 node level entries; got %d", nodeLevelEntries)
// 	}

// }
