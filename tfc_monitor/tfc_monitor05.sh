#!/bin/bash

# tfc_monitor.sh
#
# Usage:
# tfc_monitor.sh <filename>
#
# This bash script listens (using inotifywait) for the creation of
# the file given as its first parameter, and each time a new file is
# detected this script will execute all executable scripts in the
# sub-folder "monitor.d", passing the filename as first argument.
#
# E.g. with "monitor.d/send_to_a.sh" and "monitor.d/send_to_b.sh":

# $> nohup ./tfc_monitor.sh /home/fred/data_file.bin &
#
# will call
# monitor.d/send_to_a.sh /home/fred/data_file.bin
# and
# monitor.d/send_to_b.sh /home/fred/data_file.bin
#

trap "echo tfc_monitor.sh Signalled; exit 0" 10

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

#FILE_DIR=$(dirname "$1")
FILE_DIR=${1%/*}
FILE_NAME=$(basename "$1")

echo tfc_monitor.sh monitoring +$FILE_NAME+ in +$FILE_DIR+

echo $$ $1 >> $SCRIPT_DIR/monitor.pid

while read x; do
    echo tfc_monitor +$1+ awoke with +$x+
    for SCRIPT in $SCRIPT_DIR/monitor.d/*
    do
	if [ -f $SCRIPT -a -x $SCRIPT ]
	    then
	    $SCRIPT $x
	    fi
	done

done < <(inotifywait --format "%w%f" -mq -e close_write $FILE_DIR)

echo tfc_monitor.sh normal exit

