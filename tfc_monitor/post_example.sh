#!/bin/bash

# send_to_<example>.sh
# Example bash script to POST file (given as arg $1 to script) to a remote http/https server

# Note any script beginning "send_to_" in this directory will be ignored by GIT

echo $(date) send_to_bi.sh sending $1 >/home/ijl20/log/send_to_bi.log

curl -X POST -m 15 --header "X-Auth-Token: example-token" --data-binary "@$1" http://bi-load-balancer-1288888845.eu-west-1.elb.amazonaws.com:8080/insert/cambridge >/dev/null 2>/dev/null

