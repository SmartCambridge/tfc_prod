#!/bin/bash

if [[ "$#" -ne 1 ]]; then
  echo "Wrong number of arguments"
  echo "Usage:"
  echo "./batcher_zones.sh <conf file>"
  echo "e.g. ./batcher_zones.sh tools/batcher_zones.conf"
  echo "Will run Batcher.java with that config file"
  exit 0
fi

java -cp /home/tfc_prod/tfc_prod/tfc.jar io.vertx.core.Launcher run uk.ac.cam.tfc_server.batcher.Batcher -conf $1

