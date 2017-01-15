#!/bin/bash

# Renames all TFC 'data_bin' files in a given directory from
# <original filename>.bin as "YYYY-MM-DD-hh-mm-ss.bin"
# to
# <utc timestamp>_<original filename>.bin

if [[ "$1" == "" ]]
then
    echo "Usage :"
    echo "./rename_timestamp.sh <directory name>"
    echo
    echo "Will prepend each filename in directory with UTC timestamp."
    echo "Intended to be used with TFC data_bin files with name format:"
    echo "YYYY-MM-DD-hh-mm-ss.bin"
fi
exit 0

FILES=$1/*.bin

for f in $FILES
do
    b=$(basename $f)
    year=${b:0:4}
    month=${b:5:2}
    day=${b:8:2}
    hour=${b:11:2}
    minute=${b:14:2}
    second=${b:17:2}

    ts=$(date --date="$month/$day/$year $hour:$minute:$second" +"%s")

    mv $1/$b $1/${ts}_${b}

done
