changelog
===

v0.2-b2 [2017-12-22]
---

**features:**

- Move entirely to user impersonation; abandon authenticating proxy mode. This allows us to install into existing kube
clusters without modifications to the apiserver flags, while still maintaining essentially equivalent user-impersonation
behavior. This means that the following command line flags are no longer valid: `requestheader-username-headers`, `requestheader-group-headers`,
and `requestheader-extra-headers-prefix`.

**fixes:**

- The `authenticated-groups` flag is now honored properly.

v0.2-b1 [2017-12-18]
---

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

v0.1-a6 [2017-09-09]
---

**features:**

- Added validation of manifests against swagger 2.0 spec published by the Kubernetes API when editing or creating resources

