#!/bin/bash

KUILL_PORT=8889
SCRIPT_DIR=$(cd $(dirname $0) && pwd)

# launch a new minikube environment
CI=true KUILL_PORT=${KUILL_PORT} ${SCRIPT_DIR}/minikube-dev.sh &

# Save the PID of the server to a variable
MINIDEV_PID=$(echo $!)

kubectl --context minikube apply -f ${SCRIPT_DIR}/aceptance-tests/manifests/

# Execute tests
pushd ${SCRIPT_DIR}/../pkg/ui > /dev/null
PROTOCOL=https PORT=${KUILL_PORT} npm run cypress:run
TEST_RESULTS=$?
popd > /dev/null

# Kill the server
kill $MINIDEV_PID

return $TEST_RESULTS