
![](./docs/logo.png)
===

[![Build Status](https://travis-ci.org/matt-deboer/kuill.svg?branch=master)](https://travis-ci.org/matt-deboer/kuill)
[![Docker Pulls](https://img.shields.io/docker/pulls/mattdeboer/kuill.svg)](https://hub.docker.com/r/mattdeboer/kuill/)

A new UI for kubernetes.

Goal
---

To provide an open source Kubernetes UI experience capable of integrating with popular enterprise authentication mechanisms,
and providing a focused but functional introduction to Kubernetes that prioritizes developer onboarding speed.

### Why create another dashboard?

Other than gaining more experience in Golang and React, and learning a lot about kubernetes itself, there is value in a dashboard that supports user authentication though the browser--executing all actions **as** the authenticated user (as opposed to executing them under a privileged service account). See [this discussion](https://github.com/kubernetes/dashboard/issues/574#issuecomment-282360783) for details surrounding the vulnerabilities introduced by running the existing dashboard in a multi-tenant environment.

### What makes kuill different?

Other than the purely cosmetic differences, **kuill** integrates with the most common modern enterprise authentication mechanisms (OpenID+Connect and SAML2), and acts as an authenticating proxy to Kubernetes--sending every request using the identity of the authenticated user; this means that a user of kuill has the same privileges** as they would have using `kubectl`.

** _There is a service account which grants kuill access to proxy requests to nodes in order to access their status summary endpoints_

What does it look like?
---

For the impatient, see the [preview](./docs/preview.md) page for few screen-shots and gifs of the current state.

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
TL;DR, and also super-trusting of strangers ? run: &nbsp; <code>sh -c "$(curl -sL https://raw.githubusercontent.com/matt-deboer/kuill/master/hack/test-drive-minikube.sh)"</code>
</div>

1. Start a new `minikube` cluster.

    You'll need to add some additional flags on creation (due to the fact that `kuill` acts
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

1. Generate certificates for `kuill` using the minikube cluster ca (and a little help from the `cfssl` docker image)

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

1. Create a secret containing the certs (for use by `kuill`)

    ```sh
    kubectl --context minikube create secret generic auth-proxy-certs \
      --from-file  ~/.minikube/certs/auth-proxy -n kube-system
    ```

1. Deploy `kuill`

    ```sh
    curl -sL https://raw.githubusercontent.com/matt-deboer/kuill/master/hack/deploy/kuill-minikube.yml | \
       kubectl --context minikube apply -f -
    ```

1. View it in your browser

    ```sh
    open "https://$(minikube ip):30443/"
    ```

---

Setup
---

As **kuill** works by acting as an authenticating-proxy, you must configure your cluster to use an authenticating proxy; see [the kubernetes docs](https://kubernetes.io/docs/admin/authentication/#authenticating-proxy) for details.

Part of this equation involves configuring **kuill** to use a certificate having a CN matching one of the `--requestheader-allowed-names` values you specified above, and signed by the `--requestheader-client-ca-file` you specified.

Additionally, `kuill` must be configured to integrate with one or more identity providers, of which SAML2 and
OpenID+Connect are currently supported.

---

Developing
---

Run `make minidev` locally to:

1. Spin up (if not already started) a `minikube` setup similar to the test-drive script above.
1. Start a local HMR web dev environment

Code away--PR's welcome!

---

Roadmap:
---

### 1.0 Release (no date yet)

- [ ] General:
  - [ ] Create e2e tests for the most basic features
  - [ ] Working minikube example deployment/guide
  - [ ] Test on GKE deployments--can we even have an authenticating proxy configured?
  - [x] Come up with a better name ! (kuill)
  - [ ] Support for Third Party Resources / Custom Resource Definitions
  - [ ] Create/Edit validation for all resources
  - [ ] Provide better hints/tool-tips to explain what functions are available, and what they mean

- [ ] Overview/Homepage:
  - [ ] Local storage (or cookies) used to remember previous selected namespaces for a given user
  - [ ] Integrate resource quotas into cluster resource stats
  - [ ] Handling for large numbers of namespaces

- [ ] Workloads:
  - [ ] Provide validation of resource creation/modification
  - [ ] Test authorization for edit/create/delete actions using kube apis before
        displaying/enabling the associated controls
  - [ ] Provide utilization metrics with pods/deployments/etc., and corresponding summaries by selection

- [ ] Cluster:
  - [x] Use tabs for PersistentVolumes, StorageClasses, TPRs(CustomResources)

- [ ] Access Controls:
  - [ ] Update styles to be consistent with Workloads/Cluster
  - [ ] Add 'Can user X do action Y on resource Z?' button/check to aid with permissions
        checks
  - [ ] Add 'What can user X do?' view which lists a summary of a given user's permissions 