#!/bin/bash
set -e

KUILL_PORT=${KUILL_PORT:-8888}
KUILL_FRONTEND_PORT=${KUILL_FRONTEND_PORT:-3000}
SCRIPT_DIR=$(cd $(dirname $0) && pwd)
ROOT=$(cd ${SCRIPT_DIR}/.. && pwd)

# starts up kuill locally, pointed at the apiserver from minikube
${SCRIPT_DIR}/test-drive-minikube.sh nodeploy

kubectl config use-context minikube
apiserver=$(kubectl config view --flatten --minify -o json | jq -r '.clusters[0].cluster.server')
echo "Kube apiserver is at ${apiserver}"

echo "Waiting for kubernetes-api at ${apiserver}..."
while ! curl -skL --fail "${apiserver}/healthz"; do sleep 2; done

echo "Pulling certificates for use by kuill..."
${SCRIPT_DIR}/get-certs.sh "minikube"

JSONPATH='{range .items[*]}{@.metadata.name}:{range @.status.conditions[*]}{@.type}={@.status};{end}{end}'
until kubectl get nodes -o jsonpath="$JSONPATH" 2>&1 | grep -q "Ready=True"; do sleep 1; done

echo "Waiting for kube-dns"
while [ "$(kubectl get deploy -n kube-system kube-dns -o json | jq '.status.readyReplicas')" != "1" ]; do sleep 2; done


UI_PID=""
if [ "${CI}" != "true" ]; then
  PORT=${KUILL_FRONTEND_PORT} make -s -C ${ROOT} start-ui &
  UI_PID=$!
fi

verbose=""
if [ -n "${VERBOSE}" ]; then
  verbose="--verbose --trace-requests --trace-websockets"
fi

disable_tls=""
if [ -n "${DISABLE_TLS}" ]; then
  disable_tls="--disable-tls"
fi

echo "Launching kuill..."
${ROOT}/bin/kuill \
  --port ${KUILL_PORT} \
  $verbose $disable_tls \
  --server-cert ${ROOT}/certs/minikube/server-cert.pem \
  --server-key ${ROOT}/certs/minikube/server-key.pem \
  --password-file hack/test-users.tsv \
  --kubernetes-client-ca ${ROOT}/certs/minikube/ca.pem \
  --kubernetes-client-cert ${ROOT}/certs/minikube/server-cert.pem \
  --kubernetes-client-key ${ROOT}/certs/minikube/server-key.pem \
  --kubernetes-api $apiserver \
  --anonymous-groups system:masters \
  --kubeconfig ~/.kube/config

function finish {
  kill -9 $UI_PID 2>/dev/null
}

trap finish EXIT