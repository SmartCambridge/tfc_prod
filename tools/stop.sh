#!/bin/bash

# Find the directory this script is being run from, because that will contain the JAR files
# typically "/home/tfc_prod/tfc_prod/"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

cd $SCRIPT_DIR

echo Currently running acp_server verticles:

./ps.sh

echo Killing all verticles...

pkill -9 -f vertx

sleep 3

echo After kill, running verticles list:

./ps.sh

