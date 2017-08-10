#!/bin/sh
set -e

SCRIPT_DIR=$(cd $(dirname $0) && pwd)
ROOT=$(cd ${SCRIPT_DIR}/.. && pwd)
# starts up kapow locally, pointed at the apiserver from minikube
make build

kubectl config use-context minikube

${SCRIPT_DIR}/get-certs.sh

make -s -C ${ROOT} start-ui &

${ROOT}/bin/kapow \
  --port 8888 \
  --verbose --trace-requests \
  --server-cert ${ROOT}/certs/server-cert.pem \
  --server-key ${ROOT}/certs/server-key.pem \
  --password-file ./hack/test-users.tsv \
  --kubernetes-client-ca ${ROOT}/certs/ca.pem \
  --kubernetes-client-cert ${ROOT}/certs/server-cert.pem \
  --kubernetes-client-key ${ROOT}/certs/server-key.pem \
  --kubernetes-api https://master.aws.lab.k8s.getty.im \
  --anonymous-groups system:masters \
  --kubeconfig ~/.kube/config
