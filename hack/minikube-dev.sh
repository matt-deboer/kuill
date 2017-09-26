#!/bin/sh
set -e

KUILL_PORT=${KUILL_PORT:-8888}
KUILL_FRONTEND_PORT=${KUILL_FRONTEND_PORT:-3000}
SCRIPT_DIR=$(cd $(dirname $0) && pwd)
ROOT=$(cd ${SCRIPT_DIR}/.. && pwd)
# starts up kuill locally, pointed at the apiserver from minikube

status=$(minikube status)

if [ -z "$(echo $status | grep 'minikube: Running')" ]; then
  ${SCRIPT_DIR}/test-drive-minikube.sh nodeploy
fi

kubectl config use-context minikube
apiserver=$(kubectl config view --flatten --minify -o json | jq -r '.clusters[0].cluster.server')


${SCRIPT_DIR}/get-certs.sh

if [ "${CI}" != "true" ]; then
  PORT=${KUILL_FRONTEND_PORT} make -s -C ${ROOT} start-ui &
fi

${ROOT}/bin/kuill \
  --port ${KUILL_PORT} \
  --verbose \
  --trace-requests \
  --server-cert ${ROOT}/certs/server-cert.pem \
  --server-key ${ROOT}/certs/server-key.pem \
  --password-file hack/test-users.tsv \
  --kubernetes-client-ca ${ROOT}/certs/ca.pem \
  --kubernetes-client-cert ${ROOT}/certs/server-cert.pem \
  --kubernetes-client-key ${ROOT}/certs/server-key.pem \
  --kubernetes-api $apiserver \
  --anonymous-groups system:masters \
  --kubeconfig ~/.kube/config
