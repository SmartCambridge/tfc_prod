#!/bin/bash

if [ "$#" -eq 1 ] || [ "$#" -gt 2 ]; then
  echo get_aq.sh will GET air quality data from the CL website and write the files to the local filesystem.
  echo The file source is http://www.cl.cam.ac.uk/meters/airQuality/trial/station_id/yyyy/
  echo and the files are written to /media/tfc/cam_aq/data_bin/yyyy/mm/
  echo
  echo Usage:
  echo get_aq.sh \(will get data for the current year/month\)
  echo or
  echo get_aq.sh YYYY MM \(will get data for the provided year and month\)
  exit 0
fi

if [ "$#" -eq 2 ]; then
  yyyy=$1
  mm=$2
else
  yyyy=$(date +'%Y')
  mm=$(date +'%m')
fi

echo $(date) get_aq.sh running for $yyyy-$mm

for station_dir in /media/tfc/cam_aq/data_bin/2017/01/*/
do 
  station_id=$(basename $station_dir)
  echo $station_id; 
  for sensor_type in  "CO" "NO" "NO2" "O3" "SO2" "Temperature" "Humidity" "Pressure" "PM1" "PM2_5" "PM10" "TSP"
  do
      echo $station_id $sensor_type
      
      url=http://www.cl.cam.ac.uk/meters/airQuality/trial/$station_id/$yyyy/${station_id}-${sensor_type}-${yyyy}-${mm}.json
      filepath=/media/tfc/cam_aq/data_bin/$yyyy/$mm/$station_id/${station_id}_${sensor_type}_${yyyy}-${mm}.json

      echo curl getting $url
      echo saving to $filepath
      
      curl --create-dirs -sS --fail -o $filepath $url >/dev/null
      curl_return=$?
    if [ $curl_return -ne 0 ]; then
        echo curl FAILED with exit code $curl_return
    fi
  done
done
chmod 775 /media/tfc/cam_aq/data_bin/$yyyy
chmod 775 /media/tfc/cam_aq/data_bin/$yyyy/$mm
chmod 775 /media/tfc/cam_aq/data_bin/$yyyy/$mm/*

