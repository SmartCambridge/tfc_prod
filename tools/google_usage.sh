#!/bin/bash

# ---------------------------------------------------------------------
# Usage as tfc_prod user: ./google_usage.sh <optional DD/Mmm/YYYY> <optional log filename>
# Usage as root: sudo -u postgres ./google_usage.sh <args>
#
# Default date is TODAY
#
# Bash script to query var/log/tfc_prod/gunicorn.log
# and extract the counts of access to traffic_map.js for given DATE
# as a proxy for how often each SmartPanel display is hitting Google Maps API
#
# In due course we'll want to extend to refer to 'client_id'
# ---------------------------------------------------------------------

# default date is TODAY
DATE=$(date '+%d/%b/%Y')

# default logfile is:
LOGFILE='/var/log/tfc_prod/gunicorn.log'

# default filter string is:
FILTER_STRING='traffic_map/traffic_map.js'

if [ $# -ge 1 ]
then
  DATE=$1
fi

if [ $# -eq 2 ]
then
  LOGFILE=$2
fi

# convert gunicorn log to rows "<access count> <display_id>"
TEMPFILE=$(mktemp)
cat $LOGFILE | grep $FILTER_STRING | grep $DATE | awk '{print $11}' | egrep -o '[A-Z]{4}-[0-9]{4}' | sort | uniq -c | sort -n >$TEMPFILE

# yeah, yeah - I know this could be one SQL statement before loop rather than inside loop
# Use db lookup to expand rows to '<count> <display_id> <username> <email>'
while read -r count display_id || [ -n "$p" ]
do
  SQL="COPY(select slug,name,username,email from smartpanel_display,auth_user where slug='$display_id' and owner_id=auth_user.id) TO STDOUT WITH (FORMAT CSV, FORCE_QUOTE *)"

USERINFO=$(psql -t -d tfcweb -c "$SQL")
  printf '%s,%s\n' "$count" "$USERINFO"
done < $TEMPFILE

