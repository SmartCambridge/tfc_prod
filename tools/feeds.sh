#!/bin/bash

TODAY=$(date +'%Y/%m/%d')

FEEDS=(
/media/tfc/sirivm_json/data_monitor
/media/tfc/cam_park_rss/data_monitor
/media/tfc/cam_park_rss/data_monitor_json
/media/tfc/csn_ttn/data_monitor
/media/tfc/google_traffic_map/cambridge/$TODAY
)

date
for f in ${FEEDS[@]}
do
    ts=$(stat --printf='%Z' $f)
    printf "%12s %s\n" "$(date -d @$ts)" $f
done


