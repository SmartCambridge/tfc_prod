#!/bin/bash

if [[ "$#" -ne 2 ]]; then
  echo "Wrong number of arguments"
  echo "Usage:"
  echo "./migrate_dirs.sh <source-pattern> <dest-dir>"
  echo "e.g. ./migrate_dirs.sh /mnt/sdb1/carrier/tfc/data/2015-11 /mnt/sdb1/tfc/vix/data_bin"
  echo "will migrate all dirs beginning that path e.g. /mnt/sdb1/carrier/tfc/data/2015-11-01"
  echo "i.e. will create /mnt/sdb1/tfc/vix/data_bin/2015/11/01"
  echo "Destination files are <utc>_<original name>"
  exit 0
fi

DEST_ROOT=$2
DIRS=$1*

for source_dir in $DIRS; do
    # echo $source_dir
    dest_dir=$(echo $source_dir | awk -F"/" '{print $NF}' | awk -F"-" -v p=$DEST_ROOT '{print p"/"$(NF-2)"/"$(NF-1)"/"$NF}')
    echo Making $dest_dir
    mkdir -p $dest_dir
    
    FILES=$source_dir/*.bin

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

        mv $f $dest_dir/${ts}_${b}

    done

done;

