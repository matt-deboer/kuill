#!/bin/bash
mkdir -p ./certs
kubectl get secret -n kube-system auth-proxy-certs -o json | jq -r '.data."auth-proxy.pem"' | openssl base64 -d > ./certs/server-cert.pem
kubectl get secret -n kube-system auth-proxy-certs -o json | jq -r '.data."auth-proxy-key.pem"' | openssl base64 -d > ./certs/server-key.pem
kubectl get secret -n kube-system auth-proxy-certs -o json | jq -r '.data."ca.pem"' | openssl base64 -d > ./certs/ca.pem