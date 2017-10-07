#!/bin/bash
SCRIPT_DIR=$(cd $(dirname $0) && pwd)
ROOT=$(cd ${SCRIPT_DIR}/.. && pwd)
KUILL_PORT=${KUILL_PORT:-8888}
KUILL_FRONTEND_PORT=${KUILL_FRONTEND_PORT:-3000}


context=$(kubectl config current-context)
apiserver=$(kubectl config view --flatten --minify -o json | jq -r '.clusters[0].cluster.server')

echo "Pulling certificates for use by kuill..."
${SCRIPT_DIR}/get-certs.sh "${context}"

if [ "${CI}" != "true" ]; then
  PORT=${KUILL_FRONTEND_PORT} make -s -C ${ROOT} start-ui &
fi

echo "Launching kuill..."
${ROOT}/bin/kuill \
  --port ${KUILL_PORT} \
  --verbose \
  --trace-requests \
  --server-cert ${ROOT}/certs/${context}/server-cert.pem \
  --server-key ${ROOT}/certs/${context}/server-key.pem \
  --password-file hack/test-users.tsv \
  --kubernetes-client-ca ${ROOT}/certs/${context}/ca.pem \
  --kubernetes-client-cert ${ROOT}/certs/${context}/server-cert.pem \
  --kubernetes-client-key ${ROOT}/certs/${context}/server-key.pem \
  --kubernetes-api ${apiserver} \
  --anonymous-groups system:masters \
  --kubeconfig ~/.kube/config