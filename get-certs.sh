#!/bin/bash
mkdir -p ./certs
kubectl get secret -n kube-system auth-proxy-certs -o json | jq -r '.data."auth-proxy.pem"' | base64 -D > ./certs/server-cert.pem
kubectl get secret -n kube-system auth-proxy-certs -o json | jq -r '.data."auth-proxy-key.pem"' | base64 -D > ./certs/server-key.pem
kubectl get secret -n kube-system auth-proxy-certs -o json | jq -r '.data."ca.pem"' | base64 -D > ./certs/ca.pem