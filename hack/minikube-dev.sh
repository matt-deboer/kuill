#!/bin/sh
set -e

KUILL_PORT=${KUILL_PORT:-8888}
KUILL_FRONTEND_PORT=${KUILL_FRONTEND_PORT:-3000}
SCRIPT_DIR=$(cd $(dirname $0) && pwd)
ROOT=$(cd ${SCRIPT_DIR}/.. && pwd)
# starts up kuill locally, pointed at the apiserver from minikube

status=$(minikube status)

if [ -z "$(echo $status | grep 'minikube: Running')" ]; then
  echo "Launching minikube cluster..."
  ${SCRIPT_DIR}/test-drive-minikube.sh nodeploy
fi

kubectl config use-context minikube
apiserver=$(kubectl config view --flatten --minify -o json | jq -r '.clusters[0].cluster.server')
echo "Kube apiserver is at ${apiserver}"

echo "Pulling certificates for use by kuill..."
${SCRIPT_DIR}/get-certs.sh "minikube"

if [ "${CI}" != "true" ]; then
  PORT=${KUILL_FRONTEND_PORT} make -s -C ${ROOT} start-ui &
fi

echo "Launching kuill..."
${ROOT}/bin/kuill \
  --port ${KUILL_PORT} \
  --server-cert ${ROOT}/certs/minikube/server-cert.pem \
  --server-key ${ROOT}/certs/minikube/server-key.pem \
  --password-file hack/test-users.tsv \
  --kubernetes-client-ca ${ROOT}/certs/minikube/ca.pem \
  --kubernetes-client-cert ${ROOT}/certs/minikube/server-cert.pem \
  --kubernetes-client-key ${ROOT}/certs/minikube/server-key.pem \
  --kubernetes-api $apiserver \
  --anonymous-groups system:masters \
  --kubeconfig ~/.kube/config
