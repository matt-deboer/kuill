kapow
==============

<!--[![Build Status](https://travis-ci.org/matt-deboer/kapow.svg?branch=master)](https://travis-ci.org/matt-deboer/kapow)
[![Docker Pulls](https://img.shields.io/docker/pulls/mattdeboer/kapow.svg)](https://hub.docker.com/r/mattdeboer/kapow/)-->

**_kubernetes authenticating proxy operations window !_**
Ok, it's not just for _ops_, but I was already committed to the acronym :)


## **~~ This project is in an early alpha state; use it to your own risk/surprise! ~~**

Motivation
---

To create a Kubernetes UI experience capable of integrating with popular enterprise authentication mechanisms,
and provide a focused but functional introduction to Kubernetes that prioritizes developer onboarding speed.

### Why create another dashboard?

Other than gaining more experience in Golang and React, and learning a lot about kubernetes itself, it seemed worthwhile to have a dashboard that supports user authentication though the browser, and executes all actions **as** the authenticated user (as opposed to executing them as a privileged service account).

See [this discussion](https://github.com/kubernetes/dashboard/issues/574#issuecomment-282360783) for details surrounding the vulnerabilities introduced by running the existing dashboard in a multi-tenant environment.

### What makes Kapow different?

Other than the purely cosmetic differences, **Kapow** acts as an authenticating proxy, sending every request using the identity of the authenticated user; this means that a user of Kapow has the same privileges they would have using `kubectl` in their shell.

Setup
---

Since **kapow** works by acting as an authenticating-proxy, you must configure your cluster to use an authenticating proxy; see [the kubernetes docs](https://kubernetes.io/docs/admin/authentication/#authenticating-proxy) for details.

Part of this equation involves configuring **kapow** to use a certificate having a CN matching one of the `--requestheader-allowed-names` values you specified above, and signed by the `--requestheader-client-ca-file` you specified.

Usage
---

```

```

Developing
---

You can run a local development version of the dashboard using:
```
make dev-ui
```
The mock API responses are stored in the file `pkg/ui/test-proxy/data.json`; there are some requests
sill missing a mock response--just add a key to the json object matching the path of the request, and
fill in the JSON response as the value.
_Mocks for the web-socket APIs and POST/PUT/DELETE methods are not yet supported._
