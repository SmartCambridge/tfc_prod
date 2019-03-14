#!/bin/bash

# run as user tfc_prod

# create tfc/vix directory and sub-dirs on sdb1

mkdir /mnt/sdb1/tfc/vix

mkdir /mnt/sdb1/tfc/vix/data_bin
mkdir /mnt/sdb1/tfc/vix/data_bin_json
mkdir /mnt/sdb1/tfc/vix/data_zone
mkdir /mnt/sdb1/tfc/vix/data_cache
mkdir /mnt/sdb1/tfc/vix/data_monitor
mkdir /mnt/sdb1/tfc/vix/data_monitor_json

# create links to all vix directories from /media/tfc

mkdir /media/tfc/vix

ln -sfn /mnt/sdb1/tfc/vix/data_bin /media/tfc/vix/data_bin
ln -sfn /mnt/sdb1/tfc/vix/data_bin_json /media/tfc/vix/data_bin_json
ln -sfn /mnt/sdb1/tfc/vix/data_zone /media/tfc/vix/data_zone
ln -sfn /mnt/sdb1/tfc/vix/data_cache /media/tfc/vix/data_cache
ln -sfn /mnt/sdb1/tfc/vix/data_monitor /media/tfc/vix/data_monitor
ln -sfn /mnt/sdb1/tfc/vix/data_monitor_json /media/tfc/vix/data_monitor_json

# set up 'tfc/sys' directory

mkdir /mnt/sdb1/tfc/sys
ln -sfn /mnt/sdb1/tfc/sys /media/tfc/sys

# set up 'tfc/cam_park_local' directory

mkdir /mnt/sdb1/tfc/cam_park_local
ln -sfn /mnt/sdb1/tfc/cam_park_local /media/tfc/cam_park_local

# set up 'tfc/cam_park_rss' directory

mkdir /mnt/sdb1/tfc/cam_park_rss
ln -sfn /mnt/sdb1/tfc/cam_park_rss /media/tfc/cam_park_rss

# set up 'tfc/cam_aq' directory

mkdir /mnt/sdb1/tfc/cam_aq
ln -sfn /mnt/sdb1/tfc/cam_aq /media/tfc/cam_aq

# copy data into tfc/sys

cp -r /home/tfc_prod/tfc_prod/config/sys/* /media/tfc/sys
