#!/bin/bash

# Delete old .bz2 backups from the directory
# All other files are unaffected
# Keep .bz2 files newer than 10 days
# If older than 10 days, only keep files with date days ending in "1" (i.e 01, 11, 21, 31)

if [ -z "$1" ]; then
    echo "No backup directory given as first argument - quitting"
    exit 1
fi

for filepath in $1/*.bz2
do
  f=$(basename $filepath)
  file_date=${f:9:4}${f:14:2}${f:17:2} 
  file_s=$(date --date="$file_date" +%s)

  now_s=$(date +%s)

  delta_d=$(( ($now_s - $file_s) / (60*60*24) ))

  dd=${f:17:2}

  dd=${dd#0}

  if (( delta_d <= 10 || $dd == "1" || $dd == "11" || $dd == "21" )); then
    echo keeping $f
  else
    echo DELETING $f
    rm $filepath
  fi
done

