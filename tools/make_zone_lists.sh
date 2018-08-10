#!/bin/bash

# Generate the list.json and list-all.json files used by the 'old' and
# 'new' traffic zone APIs from individual zone definitions. All files
# are read from and written to current directory

# remove an unwanted zone, if present
rm -f uk.ac.cam.tfc_server.zone.test_vix.json

# merge all the options --> config elements into a new array
# keyed by 'zone_list'
cat uk.ac.cam.tfc_server.zone.*.json\
    | jq -s '{ zone_list: [.[].options.config] }'\
    > list_all.json

# merge all the options --> config elements in which "zone.map" is true
# into a new array keyed by 'zone_list'
cat uk.ac.cam.tfc_server.zone.*.json\
    | jq -s '{ zone_list: [ .[].options.config | if ."zone.map" then . else empty end] }'\
    > list.json
