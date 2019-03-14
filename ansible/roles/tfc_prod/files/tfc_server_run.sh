#!/bin/bash

# run.sh - run a working set of Adaptive City Platform modules in 'production' mode
#
# tfc_prod/tools/ps.sh gives:
# tfc_prod  59221   tfc_2017-09-12.jar                        service:uk.ac.cam.tfc_server.console.A
# tfc_prod  3049    tfc_2017-10-19.jar                        service:uk.ac.cam.tfc_server.dataserver.vix
# tfc_prod  142583  tfc_2017-09-13.jar                        service:uk.ac.cam.tfc_server.everynet_feed.A
# tfc_prod  67289   tfc_2017-09-12.jar                        service:uk.ac.cam.tfc_server.feedhandler.vix
# tfc_prod  62992   tfc_2017-10-11.jar                        service:uk.ac.cam.tfc_server.feedmaker.A
# tfc_prod  175782  tfc_2017-10-04.jar                        service:uk.ac.cam.tfc_server.feedmaker.park_local_rss
# tfc_prod  114335  tfc_2017-10-31.jar                        service:uk.ac.cam.tfc_server.feedmaker.vix2
# tfc_prod  139322  tfc_2017-09-13.jar                        service:uk.ac.cam.tfc_server.httpmsg.A
# tfc_prod  176468  tfc_2017-10-04.jar                        service:uk.ac.cam.tfc_server.msgfiler.cam.to_json
# tfc_prod  107869  tfc_2017-10-31.jar                        service:uk.ac.cam.tfc_server.msgfiler.cloudamber.sirivm
# tfc_prod  114504  tfc_2017-10-31.jar                        service:uk.ac.cam.tfc_server.msgfiler.vix2
# tfc_prod  66457   tfc_2017-09-12.jar                        service:uk.ac.cam.tfc_server.msgfiler.vix.feed_json
# tfc_prod  66238   tfc_2017-09-12.jar                        service:uk.ac.cam.tfc_server.msgfiler.vix.zone_cambridge
# tfc_prod  88504   postgresql-42.1.3.jar:tfc_2017-09-21.jar  service:uk.ac.cam.tfc_server.msgrouter.A
# tfc_prod  72216   tfc_2017-10-11c.jar                       service:uk.ac.cam.tfc_server.msgrouter.cloudamber.sirivm
# tfc_prod  67050   tfc_2017-09-12.jar                        service:uk.ac.cam.tfc_server.zonemanager.cambridge.vix
# tfc_prod  68260   tfc_2017-10-20.jar                        service:uk.ac.cam.tfc_server.zonemanager.cloudamber.sirivm
# tfc_prod  114894  tfc_2017-10-31.jar                        service:uk.ac.cam.tfc_server.zonemanager.vix2

# NOTE sirivm 'downstream' sites will run "feedmaker.eventbus" rather than "feedmaker.cloudamber.sirivm"

# start vix modules

# If an argument has been given, use tfc<argument>.jar, e.g. ./run.sh _2017-03-31, and this will use tfc_2017-03-31.jar
# Otherwise run.sh will simply use tfc.jar

# Find the directory this script is being run from, because that will contain the JAR files

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

cd $SCRIPT_DIR

# load secrets - includes RTMONITOR_KEY
source $SCRIPT_DIR/secrets.sh

# CONSOLE
nohup java -cp tfc$1.jar io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.console.A" -cluster >/dev/null 2>>/var/log/tfc_prod/console.A.err & disown

# DATASERVER TO PROVIDE DATA API FOR TFC_WEB
nohup java -cp tfc$1.jar io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.dataserver.vix" -cluster >/dev/null 2>>/var/log/tfc_prod/dataserver.vix.err & disown

# #############################################################################################
# ################  PARK_LOCAL_RSS FEEDMAKER  #################################################
# #############################################################################################

# FEEDMAKER TO SCRAPE CAR PARK WEB SITES
nohup java -cp tfc$1.jar io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.feedmaker.park_local_rss" -cluster >/dev/null 2>>/var/log/tfc_prod/feedmaker.park_local_rss.err & disown

# MSGFILER TO STORE MESSAGES FROM CAR PARKS FEEDMAKER (i.e. from feedmaker.park_local_rss)
nohup java -cp tfc$1.jar io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.msgfiler.cam.to_json" -cluster >/dev/null 2>>/var/log/tfc_prod/msgfiler.cam.to_json.err & disown

# #############################################################################################
# ################  VIX GTFS FEEDHANDLER  #####################################################
# #############################################################################################

# FEEDHANDLER FOR VIX GTFS DATA
#nohup java -cp tfc$1.jar io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.feedhandler.vix" -cluster >/dev/null 2>>/var/log/tfc_prod/feedhandler.vix.err & disown

# MSGFILER TO STORE VIX ZONE TRANSIT MESSAGES
#nohup java -cp tfc$1.jar io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.msgfiler.vix.zone_cambridge" -cluster >/dev/null 2>>/var/log/tfc_prod/msgfiler.vix.zone_cambridge.err & disown

# MSGFILER TO STORE VIX JSON GTFS MESSAGES (i.e. from feedhandler.vix, parsed from Google Protobuf)
#nohup java -cp tfc$1.jar io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.msgfiler.vix.feed_json" -cluster >/dev/null 2>>/var/log/tfc_prod/msgfiler.vix.feed_json.err & disown

# ZONEMANAGER VIX (launches all the Cambridge zone verticles)
#nohup java -cp tfc$1.jar io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.zonemanager.cambridge.vix" -cluster >/dev/null 2>>/var/log/tfc_prod/zonemanager.cambridge.vix.err & disown

# #############################################################################################
# ################  EVERYNET FEED HANDLER  ####################################################
# #############################################################################################

# EVERYNETFEED (receives http PUSH sensor data messages from EveryNet)
nohup java -cp tfc$1.jar io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.everynet_feed.A" -cluster >/dev/null 2>>/var/log/tfc_prod/everynet_feed.A.err & disown

# MSGROUTER (forwards EveryNet messages to onward destinations)
nohup java -cp "postgresql-42.1.3.jar:tfc$1.jar" io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.msgrouter.A" -cluster >/dev/null 2>>/var/log/tfc_prod/msgrouter.A.err & disown

# HTTPMSG (command API for tfc_web)
nohup java -cp tfc$1.jar io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.httpmsg.A" -cluster >/dev/null 2>>/var/log/tfc_prod/httpmsg.A.err & disown

# #############################################################################################
# ################   VIX GTFS FEEDMAKER  ######################################################
# #############################################################################################

# VIX2 FEEDMAKER FOR GTFS VIX DATA
nohup java -cp tfc$1.jar io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.feedmaker.vix2" -cluster >/dev/null 2>>/var/log/tfc_prod/feedmaker.vix2.err & disown

# VIX2 ZONEMANAGER FOR GTFS VIX DATA
nohup java -cp tfc$1.jar io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.zonemanager.vix2" -cluster >/dev/null 2>>/var/log/tfc_prod/zonemanager.vix2.err & disown

# VIX2 MSGFILER FOR GTFS VIX DATA AND ZONE TRANSITS
nohup java -cp tfc$1.jar io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.msgfiler.vix2" -cluster >/dev/null 2>>/var/log/tfc_prod/msgfiler.vix2.err & disown

# #############################################################################################
# ################   SIRIVM CLOUDAMBER FEEDMAKER  #############################################
# #############################################################################################

# SIRIVM FEEDMAKER FOR CLOUDAMBER SIRIVM AND SIRIVM_JSON DATA
nohup java -cp tfc$1.jar io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.feedmaker.A" -cluster >/dev/null 2>>/var/log/tfc_prod/feedmaker.A.err & disown

# SIRIVM ZONEMANAGER FOR CLOUDAMBER SIRIVM DATA
nohup java -cp tfc$1.jar io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.zonemanager.cloudamber.sirivm" -cluster >/dev/null 2>>/var/log/tfc_prod/zonemanager.cloudamber.sirivm.err & disown

# SIRIVM MSGFILER FOR CLOUDAMBER SIRIVM DATA
nohup java -cp tfc$1.jar io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.msgfiler.cloudamber.sirivm" -cluster >/dev/null 2>>/var/log/tfc_prod/msgfiler.cloudamber.sirivm.err & disown

# SIRIVM MSGROUTER (tfc-app2 only)
if [ "$HOSTNAME" = tfc-app2 ]; then
nohup java -cp tfc$1.jar io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.msgrouter.cloudamber.sirivm" -cluster >/dev/null 2>>/var/log/tfc_prod/msgrouter.cloudamber.sirivm.err & disown
fi

# #############################################################################################
# ################   RTMONITOR                    #############################################
# #############################################################################################

# RTMONITOR.SIRIVM
nohup java -cp tfc$1.jar io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.rtmonitor.sirivm" -cluster >/dev/null 2>>/var/log/tfc_prod/rtmonitor.sirivm.err & disown

