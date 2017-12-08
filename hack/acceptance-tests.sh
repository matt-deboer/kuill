#!/bin/bash

KUILL_PORT=8889
SCRIPT_DIR=$(cd $(dirname $0) && pwd)
MINIKUBE_SUDO=${MINIKUBE_SUDO:-}
VERBOSE=${VERBOSE:-}

# launch a new minikube environment
CI=true KUILL_PORT=${KUILL_PORT} VERBOSE="${VERBOSE}" ${MINIKUBE_SUDO} ${SCRIPT_DIR}/minikube-dev.sh &

# Save the PID of the server to a variable
KUILL_PID=$!
echo "KUILL pid: ${KUILL_PID}"

echo "Waiting for minikube context..."
while [ "$(${MINIKUBE_SUDO} kubectl config current-context)" != "minikube" ]; do sleep 2; done

apiserver=$(${MINIKUBE_SUDO} kubectl config view --flatten --minify -o json | jq -r '.clusters[0].cluster.server')
echo "Waiting for minikube to be available at ${apiserver}..."
while ! curl -skL --fail "${apiserver}/healthz"; do sleep 2; done

echo "Installing manifests:"
ls -la ${SCRIPT_DIR}/acceptance-tests/manifests/
${MINIKUBE_SUDO} kubectl --context minikube apply -f ${SCRIPT_DIR}/acceptance-tests/manifests/

export KUILL_URL="http://localhost:${KUILL_PORT}"
echo "Waiting for kuill to be available at ${KUILL_URL}..."
while ! curl -skL --fail "${KUILL_URL}/"; do sleep 2; done

# Execute tests
pushd ${SCRIPT_DIR}/../pkg/ui > /dev/null
CYPRESS_baseUrl="${KUILL_URL}" npm run cypress:run
TEST_RESULTS=$?
popd > /dev/null

# Kill the server
kill $KUILL_PID
kill $(pgrep kuill)

exit $TEST_RESULTS