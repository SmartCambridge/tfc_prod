#!/bin/bash

sudo pvcreate /dev/sdb
sudo pvcreate /dev/sdc
sudo pvcreate /dev/sdd


sudo vgcreate sdb-vg /dev/sdb
sudo vgcreate sdc-vg /dev/sdc
sudo vgcreate sdd-vg /dev/sdd

sudo lvcreate -L 3.5T -n sdb1 sdb-vg
sudo lvcreate -L 3.5T -n sdc1 sdc-vg
sudo lvcreate -L 3.5T -n sdd1 sdd-vg

sudo mkfs.ext4 /dev/sdb-vg/sdb1
sudo mkfs.ext4 /dev/sdc-vg/sdc1
sudo mkfs.ext4 /dev/sdd-vg/sdd1

sudo mkdir /mnt/sdb1
sudo mkdir /mnt/sdc1
sudo mkdir /mnt/sdd1

