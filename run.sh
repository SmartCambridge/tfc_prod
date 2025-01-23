#!/bin/bash
#
# Usage:
#  ./run.sh [optional JAR filename]
#
# If no jar filename is given, "./tfc.jar" will be used.
#
# run.sh - run a working set of Adaptive City Platform modules in 'production' mode
#
# start vix modules

# If an argument has been given, use tfc<argument>.jar, e.g. ./run.sh _2017-03-31, and this will use tfc_2017-03-31.jar
# Otherwise run.sh will simply use tfc.jar

# Find the directory this script is being run from, because that will contain the JAR files
# typically "/home/tfc_prod/tfc_prod/"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# set jar filename to arg given on command line OR default to "tfc.jar"
TFC_JAR=${1:-tfc.jar}

cd $SCRIPT_DIR

# load secrets from secrets.sh if it exists - includes RTMONITOR_KEY
SECRETS_FILE=$SCRIPT_DIR/secrets.sh && test -f $SECRETS_FILE && source $SECRETS_FILE

# CONSOLE
nohup java -cp $TFC_JAR io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.console.A" -cluster >/dev/null 2>>/var/log/tfc_prod/console.A.err & disown

# #############################################################################################
# ################  FEED_SWARCO PARKING       #################################################
# #############################################################################################

# FEEDSWARCO TO HTTP TOKEN/DYNAMIC API'S
#nohup java -cp $TFC_JAR io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.feedmaker.park_rss" -cluster >/dev/null 2>>/var/log/tfc_prod/feedmaker.park_rss.err & disown
nohup java -cp "tfc.jar:secrets" -Xmx100m -Xms10m -Xmn2m -Xss10m io.vertx.core.Launcher run "service:feed_swarco" -cluster >/dev/null 2>>/var/log/tfc_prod/feed_swarco.err & disown

# MSGFILER TO STORE MESSAGES FROM CAR PARKS FEEDMAKER (i.e. from feed_swarco.json)
nohup java -cp $TFC_JAR io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.msgfiler.cam.to_json" -cluster >/dev/null 2>>/var/log/tfc_prod/msgfiler.cam.to_json.err & disown

# #############################################################################################
# ################   ITOWORLD SIRIVM FEED         #############################################
# #############################################################################################

# SIRIVM FEEDMAKER FOR ITOWORLD SIRIVM AND SIRIVM_JSON DATA
nohup java -cp $TFC_JAR io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.feedmaker.B" -cluster >/dev/null 2>>/var/log/tfc_prod/feedmaker.B.err & disown

# SIRIVM ZONEMANAGER FOR ITOWORLD SIRIVM DATA
nohup java -cp $TFC_JAR io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.zonemanager.itoworld" -cluster >/dev/null 2>>/var/log/tfc_prod/zonemanager.itoworld.err & disown

# SIRIVM MSGFILER FOR ITOWORLD SIRIVM DATA
nohup java -cp $TFC_JAR io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.msgfiler.itoworld" -cluster >/dev/null 2>>/var/log/tfc_prod/msgfiler.itoworld.err & disown

# SIRIVM MSGROUTER FOR ITOWORLD SIRIVM DATA
nohup java -cp "$TFC_JAR:secrets" -Xmx100m -Xms10m -Xmn2m -Xss10m io.vertx.core.Launcher run "service:msgrouter.itoworld" -cluster >/dev/null 2>>/var/log/tfc_prod/msgrouter.itoworld.err & disown

# #############################################################################################
# ################   DRAKEWELL BTJOURNEY FEED                ##################################
# #############################################################################################

nohup java -cp "$TFC_JAR:secrets" -Xmx100m -Xms10m -Xmn2m -Xss10m io.vertx.core.Launcher run "service:feedmaker.btjourney" -cluster >/dev/null 2>>/var/log/tfc_prod/feedmaker.btjourney.err & disown

nohup java -cp "$TFC_JAR" -Xmx100m -Xms10m -Xmn2m -Xss10m io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.msgfiler.btjourney" -cluster >/dev/null 2>>/var/log/tfc_prod/msgfiler.btjourney.err & disown

# #############################################################################################
# ################   RTMONITOR                    #############################################
# #############################################################################################

# RTMONITOR.ITOWORLD
nohup java -cp $TFC_JAR io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.rtmonitor.itoworld" -cluster >/dev/null 2>>/var/log/tfc_prod/rtmonitor.itoworld.err & disown

