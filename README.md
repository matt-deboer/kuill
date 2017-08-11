kapow
==============

[![Build Status](https://travis-ci.org/matt-deboer/kapow.svg?branch=master)](https://travis-ci.org/matt-deboer/kapow)
[![Docker Pulls](https://img.shields.io/docker/pulls/mattdeboer/kapow.svg)](https://hub.docker.com/r/mattdeboer/kapow/)

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

---

Setup
---

As **kapow** works by acting as an authenticating-proxy, you must configure your cluster to use an authenticating proxy; see [the kubernetes docs](https://kubernetes.io/docs/admin/authentication/#authenticating-proxy) for details.

Part of this equation involves configuring **kapow** to use a certificate having a CN matching one of the `--requestheader-allowed-names` values you specified above, and signed by the `--requestheader-client-ca-file` you specified.

Additionally, `kapow` must be configured to integrate with one or more identity providers, of which SAML2 and
OpenID+Connect are currently supported.

---

Test Drive
---

### Getting Started On `minikube`

Prerequisites:

- `minikube`
- `docker`

<div style="padding: 10px; background-color: rgba(99,99,99,0.5);">
TL;DR ? -> clone the repo, and run: &nbsp; <code>hack/test-drive-minikube.sh</code>
</div>
<div style="padding: 10px; background-color: #7a612e;">
TL;DR, and also super-trusting of strangers ? run: &nbsp; <code>sh -c "$(curl -sL https://raw.githubusercontent.com/matt-deboer/kapow/master/hack/test-drive-minikube.sh)"</code>
</div>

1. Start a new `minikube` cluster.

    You'll need to add some additional flags on creation (due to the fact that `kapow` acts
    as an authenticating proxy--configured by flags on the apiserver):

    ```sh
    minikube start \
    --kubernetes-version v1.7.0 \
    --extra-config apiserver.Authorization.Mode=RBAC \
    --extra-config apiserver.Authentication.RequestHeader.AllowedNames=auth-proxy \
    --extra-config apiserver.Authentication.RequestHeader.ClientCAFile=/var/lib/localkube/certs/ca.crt \
    --extra-config apiserver.Authentication.RequestHeader.UsernameHeaders=X-Remote-User \
    --extra-config apiserver.Authentication.RequestHeader.GroupHeaders=X-Remote-Group \
    --extra-config apiserver.Authentication.RequestHeader.ExtraHeaderPrefixes=X-Remote-Extra-
    ```
    _**note**: the command-line flags above are different than would be used to configure the apiserver
    on a standard deployment_


1. Create a clusterrolebinding for kube-system:default service account (allows kube-dns to work in minikube+RBAC)

    ```sh
    kubectl create clusterrolebinding kube-system-admin --clusterrole=cluster-admin --serviceaccount=kube-system:default
    ```

1. Generate certificates for `kapow` using the minikube cluster ca (and a little help from the `cfssl` docker image)

    ```sh
    mkdir -p ~/.minikube/certs/auth-proxy
    ```
    ```sh
    minikube ssh 'sudo cat /var/lib/localkube/certs/ca.key' > ~/.minikube/certs/auth-proxy/ca.key
    ```
    ```sh
    minikube ssh 'sudo cat /var/lib/localkube/certs/ca.crt' > ~/.minikube/certs/auth-proxy/ca.crt
    ```
    ```sh
    docker run --rm \
      -v ~/.minikube/certs/auth-proxy:/certs/auth-proxy \
      -w /certs/auth-proxy --entrypoint sh cfssl/cfssl \
      -c 'echo "{\"signing\":{\"default\":{\"expiry\":\"43800h\",\"usages\":[\"signing\",\"key encipherment\",\"server auth\",\"client auth\"]}}}" > /ca-config.json && \
        echo "{\"CN\":\"auth-proxy\",\"hosts\":[\"\"],\"key\":{\"algo\":\"rsa\",\"size\":2048}}" | \
        cfssl gencert -ca /certs/auth-proxy/ca.crt -ca-key /certs/auth-proxy/ca.key -config /ca-config.json - | \
        cfssljson -bare auth-proxy - && rm -f auth-proxy.csr && rm -f ca.key && mv ca.crt ca.pem'
    ```

1. Create a secret containing the certs (for use by `kapow`)

    ```sh
    kubectl --context minikube create secret generic auth-proxy-certs \
      --from-file  ~/.minikube/certs/auth-proxy -n kube-system
    ```

1. Deploy `kapow`

    ```sh
    curl -sL https://raw.githubusercontent.com/matt-deboer/kapow/master/hack/deploy/kapow-minikube.yml | \
       kubectl --context minikube apply -f -
    ```

1. View it in your browser

    ```sh
    open "https://$(minikube ip):30443/"
    ```

---

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


---

Roadmap:
---


### 1.0 Release

- [ ] General:
  - [ ] Create e2e tests for the most basic features
  - [ ] Working minikube example deployment/guide
  - [ ] Test on GKE deployments--can we even have an authenticating proxy configured?
  - [ ] Come up with a better name !
  - [ ] Support for Third Party Resources / Custom Resource Definitions
- [ ] Overview/Homepage:
  - [ ] Local storage (or cookies) used to remember previous selected namespaces for a given user
  - [ ] Provide better hints/tool-tips to explain what functions are available, and what they mean
- [ ] Workloads:
  - [ ] Provide validation of resource creation/modification
  - [ ] Test authorization for edit/create/delete actions using kube apis before
        displaying/enabling the associated controls
  - [ ] Provide utilization metrics with pods/deployments/etc., and corresponding summaries by selection
- [ ] Cluster:
  - [ ] Use tabs for PersistentVolumes, StorageClasses, TPRs(CustomResources)
- [ ] Access Controls:
  - [ ] Update styles to be consistent with Workloads/Cluster
  - [ ] Add 'Can user X do action Y on resource Z?' button/check to aid with permissions
        checks
  - [ ] Add 'What can user X do?' view which lists a summary of a given user's permissions 