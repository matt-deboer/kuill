package metrics

// import (
// 	"encoding/json"
// 	"fmt"
// 	"io/ioutil"
// 	"net/http"
// 	"net/http/httptest"
// 	"testing"
// )

// type metricsTestHandler struct {
// 	adapter *Adapter
// }

// func (h *metricsTestHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
// 	h.adapter.GetMetrics(w, r, nil)
// }

// func TestGetMetrics(t *testing.T) {

// 	testHeapster := httptest.NewServer(&heapsterTestHandler{})
// 	defer testHeapster.Close()

// 	server := httptest.NewServer(
// 		&metricsTestHandler{
// 			&Adapter{
// 				provider: newHeapsterMetricsProvider(testHeapster.URL),
// 			},
// 		})
// 	defer server.Close()

// 	// Now, actually test
// 	resp, err := http.Get(fmt.Sprintf("%s/metrics", server.URL))
// 	if err != nil {
// 		t.Error(err)
// 	}
// 	if resp.StatusCode != http.StatusOK {
// 		t.Errorf("Exepcted 200; got %d", resp.StatusCode)
// 	}

// 	b, err := ioutil.ReadAll(resp.Body)
// 	if err != nil {
// 		t.Errorf("Failed to parse response: %v", err)
// 	}

// 	var metrics Metrics
// 	err = json.Unmarshal(b, &metrics)
// 	if err != nil {
// 		t.Errorf("Failed to unmarshal response: %v", err)
// 	}

// 	if metrics.CPU == nil {
// 		t.Errorf("metrics.cpu should not be nil")
// 	}
// 	if len(metrics.CPU) != 3 {
// 		t.Errorf("metrics.cpu should have 3 entries")
// 	}
// 	for k, v := range metrics.CPU {
// 		for _, d := range v.Limit {
// 			if len(d.Timestamp) == 0 {
// 				t.Errorf("missing timestamp for metrics.cpu[%s].limit", k)
// 			}
// 		}
// 		for _, d := range v.Request {
// 			if len(d.Timestamp) == 0 {
// 				t.Errorf("missing timestamp for metrics.cpu[%s].request", k)
// 			}
// 		}
// 		for _, d := range v.Usage {
// 			if len(d.Timestamp) == 0 {
// 				t.Errorf("missing timestamp for metrics.cpu[%s].usage", k)
// 			}
// 		}
// 	}

// 	if metrics.Memory == nil {
// 		t.Errorf("metrics.memory should not be nil")
// 	}
// 	if len(metrics.Memory) != 3 {
// 		t.Errorf("metrics.memory should have 3 entries")
// 	}
// 	for k, v := range metrics.Memory {
// 		for _, d := range v.Limit {
// 			if len(d.Timestamp) == 0 {
// 				t.Errorf("missing timestamp for metrics.memory[%s].limit", k)
// 			}
// 		}
// 		for _, d := range v.Request {
// 			if len(d.Timestamp) == 0 {
// 				t.Errorf("missing timestamp for metrics.memory[%s].request", k)
// 			}
// 		}
// 		for _, d := range v.Usage {
// 			if len(d.Timestamp) == 0 {
// 				t.Errorf("missing timestamp for metrics.memory[%s].usage", k)
// 			}
// 		}
// 	}

// }
