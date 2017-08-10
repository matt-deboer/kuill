#!/bin/sh

minikube start \
  --kubernetes-version v1.7.0 \
  --extra-config apiserver.Authorization.Mode=RBAC \
  --extra-config apiserver.Authentication.RequestHeader.AllowedNames=auth-proxy \
  --extra-config apiserver.Authentication.RequestHeader.ClientCAFile=/var/lib/localkube/certs/ca.crt \
  --extra-config apiserver.Authentication.RequestHeader.UsernameHeaders=X-Remote-User \
  --extra-config apiserver.Authentication.RequestHeader.GroupHeaders=X-Remote-Group \
  --extra-config apiserver.Authentication.RequestHeader.ExtraHeaderPrefixes=X-Remote-Extra-

# TODO: wait for apiserver ready here...

kubectl create clusterrolebinding kube-system-admin --clusterrole=cluster-admin --serviceaccount=kube-system:default

mkdir -p ~/.minikube/certs/auth-proxy && rm -rf ~/.minikube/certs/auth-proxy/*

minikube ssh 'sudo cat /var/lib/localkube/certs/ca.key' > ~/.minikube/certs/auth-proxy/ca.key
minikube ssh 'sudo cat /var/lib/localkube/certs/ca.crt' > ~/.minikube/certs/auth-proxy/ca.crt

docker run --rm \
  -v ~/.minikube/certs/auth-proxy:/certs/auth-proxy \
  -w /certs/auth-proxy --entrypoint sh cfssl/cfssl \
  -c 'echo "{\"signing\":{\"default\":{\"expiry\":\"43800h\",\"usages\":[\"signing\",\"key encipherment\",\"server auth\",\"client auth\"]}}}" > /ca-config.json && \
    echo "{\"CN\":\"auth-proxy\",\"hosts\":[\"\"],\"key\":{\"algo\":\"rsa\",\"size\":2048}}" | \
    cfssl gencert -ca /certs/auth-proxy/ca.crt -ca-key /certs/auth-proxy/ca.key -config /ca-config.json - | \
    cfssljson -bare auth-proxy - && rm -f auth-proxy.csr && rm -f ca.key && mv ca.crt ca.pem'

kubectl --context minikube create secret generic auth-proxy-certs \
  --from-file  ~/.minikube/certs/auth-proxy -n kube-system

curl -sL https://raw.githubusercontent.com/matt-deboer/kapow/master/hack/deploy/kapow-minikube.yml | \
       kubectl --context minikube apply -f -

# TODO: wait for dashboard to be available, then launch

open "https://$(minikube ip):30443/"
