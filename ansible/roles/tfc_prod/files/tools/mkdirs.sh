#!/bin/bash

# create log directory for tfc_prod user

sudo mkdir /var/log/tfc_prod
sudo chown tfc_prod:tfc_prod /var/log/tfc_prod
sudo chmod a+w /var/log/tfc_prod

echo Log directory /var/log/tfc_prod is setup

# create basic tfc directories in /mnt/sdb1 and /media

sudo mkdir /media/tfc
sudo chown tfc_prod:tfc_prod /media/tfc

sudo mkdir /mnt/sdb1/tfc
sudo chown tfc_prod:tfc_prod /mnt/sdb1/tfc

echo Data directories /media/tfc and /mnt/sdb1/tfc setup

