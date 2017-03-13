#!/bin/bash

# run.sh - run a working set of Rita modules in 'production' mode
#
# These modules configured to use
#
# feedhandler.vix:
#   /media/tfc/vix/data_bin
#   /media/tfc/vix/data_cache
#   /media/tfc/vix/data_monitor
#
# msgfiler.vix.zone_cambridge:
#   /media/tfc/vix/data_bin_json
#   /media/tfc/vix/data_monitor_json
#   /media/tfc/vix/data_zone
#
# dataserver.vix READS:
#   /media/tfc/vix/data_*
#   /media/tfc/vix/data_zone_config (for zone app config files)
#
# feedmaker.cam:
#   /media/tfc/cam/cam_park_local/data_bin
#   /media/tfc/cam/cam_park_local/data_monitor
#   /media/tfc/cam/cam_park_rss/data_bin
#   /media/tfc/cam/cam_park_rss/data_monitor
#
# msgfiler.cam_to_json (for feed_id = cam_park_local & cam_park_rss):
#   /media/tfc/cam/{{feed_id}}/data_bin_json/{{filepath}}
#   /media/tfc/cam/{{feed_id}}/data_monitor_json
#   /media/tfc/cam/{{feed_id}}/data_park/{{ts|yyyy}}/{{ts|MM}}/{{ts|dd}}
#

# start vix modules

# If an argument has been given, use tfc<argument>.jar, e.g. ./run.sh _2017-03-31, and this will use tfc_2017-03-31.jar
# Otherwise run.sh will simply use tfc.jar

nohup java -cp tfc$1.jar io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.feedhandler.vix" -cluster >/dev/null 2>>/var/log/tfc_prod/feedhandler.vix.err &

nohup java -cp tfc$1.jar io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.console.A" -cluster >/dev/null 2>>/var/log/tfc_prod/console.AOB.err &

nohup java -cp tfc$1.jar io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.dataserver.vix" -cluster >/dev/null 2>>/var/log/tfc_prod/dataserver.vix.err &

nohup java -cp tfc$1.jar io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.feedmaker.park_local_rss" -cluster >/dev/null 2>>/var/log/tfc_prod/feedmaker.park_local_rss.err &

nohup java -cp tfc$1.jar io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.msgfiler.vix.zone_cambridge" -cluster >/dev/null 2>>/var/log/tfc_prod/msgfiler.vix.zone_cambridge.err &

nohup java -cp tfc$1.jar io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.msgfiler.vix.feed_json" -cluster >/dev/null 2>>/var/log/tfc_prod/msgfiler.vix.feed_json.err &

nohup java -cp tfc$1.jar io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.msgfiler.cam.to_json" -cluster >/dev/null 2>>/var/log/tfc_prod/msgfiler.cam.to_json.err &

nohup java -cp tfc$1.jar io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.rita.vix" -cluster >/dev/null 2>>/var/log/tfc_prod/rita.vix.err &

nohup java -cp tfc$1.jar io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.staticserver.A" -cluster >/dev/null 2>>/var/log/tfc_prod/staticserver.A.err &


