#!/bin/bash

base64Decode="base64 -d"
if [ "$(uname -s)" == "Darwin" ]; then
  base64Decode="base64 -D"
fi

mkdir -p ./certs
kubectl get secret -n kube-system auth-proxy-certs -o json | jq -r '.data."auth-proxy.pem"' | $base64Decode > ./certs/server-cert.pem
kubectl get secret -n kube-system auth-proxy-certs -o json | jq -r '.data."auth-proxy-key.pem"' | $base64Decode > ./certs/server-key.pem
kubectl get secret -n kube-system auth-proxy-certs -o json | jq -r '.data."ca.pem"' | $base64Decode > ./certs/ca.pem