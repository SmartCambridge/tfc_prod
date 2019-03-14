#!/bin/bash
#
# ijl20 script to list the http ports defined in the various verticle config json files (src/main/resources/*.json)
#
grep http.port ~/tfc_server/src/main/resources/*.json | sort -b -k 3,3

