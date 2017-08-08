#!/bin/bash

SCRIPT_DIR=$(cd $(dirname $0) && pwd)

pkg="$SCRIPT_DIR/pkg/ui/package.json"

enabledProxy="$(cat $pkg | jq '.proxy')"
disabledProxy="$(cat $pkg | jq '._proxy')"

newPkg=$(cat $pkg | jq "del(.proxy) | del(._proxy) | . + {proxy: ${disabledProxy}, _proxy: ${enabledProxy}}")
echo "$newPkg" > ${pkg}