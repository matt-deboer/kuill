changelog
===
v0.2-b9
---

2018-01-04

**fixes:**

- fix to status display for job and cronjob
- fix for deleting/recreating the same resource

---

v0.2-b8
---

2018-01-02

**features:**

- #40: CronJob support

**fixes:**

- #80: Related resources tab doesn't update properly for ChronJobs
- #81: Logs and Terminal handling is incorrect for completed pods
- #82: Resources that become deleted while being viewed are not handled properly


---

v0.2-b7
---

2017-12-28

**fixes:**

- #76: Loading spinner hangs when requesting url for a resource user is not permitted to get 
- #77: Logout should reset URL to the application root
- #25: Resources created outside of dashboard do not auto update the resource list

---

v0.2-b6
---

2017-12-27

**fixes:**

- Fix to regression in applying global filters for namespaces
- Fix to namespace barchart which was displaying an 'undefined' namespace

---

v0.2-b5 
---

2017-12-26

**fixes:**

- Fix to log-tailing behavior for deployments/replicasets/etc.

---

v0.2-b4 
---

2017-12-24

**fixes:**

- Add bearer token to proxy requests

---

v0.2-b3 
---

2017-12-24

**fixes:**

- Removed unnecessary additional options related to client certificates; now, the TLS config from kube client is also used for the proxy
- Made `server-cert` and `server-key` flags optional/ignored when `disable-tls` is specified

---

v0.2-b2
---

_2017-12-22_

**features:**

- Move entirely to user impersonation; abandon authenticating proxy mode. This allows us to install into existing kube
clusters without modifications to the apiserver flags, while still maintaining essentially equivalent user-impersonation
behavior. This means that the following command line flags are no longer valid: `requestheader-username-headers`, `requestheader-group-headers`,
and `requestheader-extra-headers-prefix`.

**fixes:**

- The `authenticated-groups` flag is now honored properly.

---

v0.2-b1 
---

2017-12-18

**features:**

- Added initial set of working acceptance tests using cypress.io

**fixes:**

- Watching for resources updates now combined into a single 'multi-watch' websocket to overcome open connection limits in some browsers,
and to avoid extra permissions checks before creating watches
- Resource fetching now combined into a single fetch, where allowed access is computed on the server side to avoid client-side errors
in the normal display process
- Moved from ericchiang/k8s to kubernetes/client-go for better dynamic resource support
- #72: Don't try to follow logs for containers that are not started
- #74: aggregate resource watches into a single websocket for the client to overcome browser limits 

---

v0.1-a6 
---

2017-09-09

**features:**

- Added validation of manifests against swagger 2.0 spec published by the Kubernetes API when editing or creating resources

