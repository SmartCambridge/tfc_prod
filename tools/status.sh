#!/bin/bash

# Find the directory this script is being run from, because that will contain the JAR files
# typically "/home/tfc_prod/tfc_prod/"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

cd $SCRIPT_DIR

./ps.sh

./feeds.sh

echo Now: $(date)

