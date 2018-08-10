# Intelligent City Platform production server build and system installation

These steps describe the process of getting from a bare brand new server to a running Rita
platform. The specific machine comments, e.g. regarding iTrac relate to a Dell PowerEdge server.

### Install Ubuntu on the server
Dell F11 - enter boot manager

One-shot UEFI Boot
Disk connected to front USB 1

##### Installation options:
Install Ubuntu
+ Download while installing
+ Install 3rd party
+ Erase Disk and Install
+ Use LVM
> Continue in UEFI mode
> Write changed to disk
> London timezone
+ English (UK) Extended winkeys
+ Enter user details, e.g. for Computer Name use 'tfc-appN'

### Apply immediate updates
```
sudo apt-get update
sudo apt-get upgrade
```

### Install openSSH
```
sudo apt-get install openssh-server
```

### Create local ssh key
```
ssh-keygen -t rsa -b 4096 -C "username@tfc-appN"
```

### Install emacs
```
sudo apt-get install emacs
```

### Add emacs/ssh config files

Now is an opportunity to sftp .emacs.el and .ssh/authorized_keys from your other servers.

### Configure disks as LVM volumes

Run ```tfc_prod/tools/mkdisks.sh``` (as below):
```
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
```
These steps are listed in more detail (for a single disk /dev/sdb) below.
If you have already run the script above then skip to "Mount drives" section.

E.g. with new 4TB drive as /dev/sdb, check with:
```
sudo fdisk -l
```
Create one LV per disk with:
Create PV:
```
sudo pvcreate /dev/sdb
```
View with:
```
sudo pvdisplay
sudo pvs
```
Create VG:
```
sudo vgcreate sdb-vg /dev/sdb
```
Create LV:
```
sudo lvcreate -L 3.5T -n sdb1 sdb-vg
```
Check with:
```
sudo fdisk -l /dev/sdb-vg/sdb1
```
New LV is now accessible as /dev/sdb-vg/sdb1
Add ext4 filesystem to LV:
```
sudo mkfs.ext4 /dev/sdb-vg/sdb1
```

Set up permanent mount:
Create mount point:
```
sudo mkdir /mnt/sdb1
```
### Mount Drives

Get LV /dev/mapper location:
```
ll /dev/mapper
```
Create fstab entry
```
sudo emacs /etc/fstab
```
adding (e.g.):
```
/dev/mapper/sdb--vg-sdb1 /mnt/sdb1               ext4    defaults 0       2
/dev/mapper/sdc--vg-sdc1 /mnt/sdc1               ext4    defaults 0       2
/dev/mapper/sdd--vg-sdd1 /mnt/sdd1               ext4    defaults 0       2

```
Re-initialize mounts and check filesystem mounted ok:
```
sudo mount -a
df -h
ll /mnt/sdb1
```

### Install Dell OpenManage

On the management desktop:
Dell OpenManage DRAC Tools, includes Racadm (64bit),v8.3
http://www.dell.com/support/home/us/en/19/product-support/servicetag/3FJ5KF2/drivers?os=ws8r2

On the linux server:
https://oitibs.com/dell-openmanage-on-ubuntu-16-04/

### set fixed IP

```
sudo emacs /etc/NetworkManager/NetworkManager.conf
```

```
[main]
plugins=ifupdown,keyfile
#dns=dnsmasq

[ifupdown]
managed=false
```

```
sudo emacs /etc/network/interfaces
```

```
auto lo
iface lo inet loopback

auto eno1
iface eno1 inet static
address 128.232.98.198
gateway 128.232.98.1
netmask 255.255.255.0
dns-nameservers 128.232.1.1 128.232.1.2
```

```
sudo service network-manager restart
sudo service networking restart
sudo service resolvconf restart
sudo ifdown eno1
sudo ifup eno1
```

To confirm:
```
ip address list
```
### Install Java 8 SDK (JRE?)

```
sudo apt-get install default-jdk
```
test with
```
java -version
```
You should see the SDK version 1.8.xxx or higher.

### Install Nginx

See nginx/README.md

### Install Monit (?)

PENDING

### Create (non-sudo) tfc_prod user

```
sudo adduser tfc_prod
```

### Install git
```
sudo apt install git
```

### Get latest tfc_prod build

```
su tfc_prod
cd ~

git clone https://github.com/ijl20/tfc_prod.git
```

Alternatively, copy directly from tfc-app2.cl.cam.ac.uk:

This requires access to the tfc_prod account on that server.
```
rsync -chavzP --stats tfc_prod@tfc-app2.cl.cam.ac.uk:tfc_prod /home/tfc_prod
```
Check with
```
ll tfc_prod
```

### Add the tfc_server JAR file to the tfc_prod directory

Ideally, install the tfc_server source [https://github.com/ijl20/tfc_server](https://github.com/ijl20/tfc_server)

Run ```mvn clean package``` in the tfc_server directory to create the fat jar.

Copy the fat jar file (such as ~/tfc_server/target/tfc_server-1.0-SNAPSHOT-fat.jar) to (say) ~/tfc_prod/tfc_2017-09-27.jar.


### Create data directory links

#### Run ```tfc_prod/tools/mkdirs.sh``` as below:
```
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

```
#### Create remainder of directories as tfc_prod user

```
sudo su tfc_prod
```
Then run ```tfc_prod/tools/mkdirs_tfc_prod.sh``` as below:
```
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

ln -s /mnt/sdb1/tfc/vix/data_bin /media/tfc/vix/data_bin
ln -s /mnt/sdb1/tfc/vix/data_bin_json /media/tfc/vix/data_bin_json
ln -s /mnt/sdb1/tfc/vix/data_zone /media/tfc/vix/data_zone
ln -s /mnt/sdb1/tfc/vix/data_cache /media/tfc/vix/data_cache
ln -s /mnt/sdb1/tfc/vix/data_monitor /media/tfc/vix/data_monitor
ln -s /mnt/sdb1/tfc/vix/data_monitor_json /media/tfc/vix/data_monitor_json

# set up 'tfc/sys' directory

mkdir /mnt/sdb1/tfc/sys
ln -s /mnt/sdb1/tfc/sys /media/tfc/sys

# set up 'tfc/cam_park_local' directory

mkdir /mnt/sdb1/tfc/cam_park_local
ln -s /mnt/sdb1/tfc/cam_park_local /media/tfc/cam_park_local

# set up 'tfc/cam_park_rss' directory

mkdir /mnt/sdb1/tfc/cam_park_rss
ln -s /mnt/sdb1/tfc/cam_park_rss /media/tfc/cam_park_rss

# copy data into tfc/sys

cp -r /home/tfc_prod/tfc_prod/config/sys/* /media/tfc/sys
```

### Test run Rita Console

```
java -cp tfc.jar io.vertx.core.Launcher run "service:uk.ac.cam.tfc_server.console.A" -cluster -cluster-port 10081 >/dev/null 2>>/var/log/tfc_prod/tfc_console.A.err &
```

Test by browsing to ```http://localhost:8081/console``` and ```http://localhost/backdoor/console```.
(Note for localhost you may use the remote server name if necessary).

## Install tfc_web

### Download tfc_web
```
git clone https://github.com/ijl20/tfc_web.git
```
### See tfc_web/README.md

### Configure email (for Monit alerts)

Get the ```ssmtp.conf``` file (from tfc_prod@tfc-app2.cl.cam.ac.uk:~/tfc_prod/ssmtp/ssmtp.conf)

Install/configure ssmtp:
```
sudo apt install ssmtp
sudo cp ssmtp.conf /etc/ssmtp
```
Test by sending an email:
```
ssmtp foo@cam.ac.uk
To: foo@cam.ac.uk
From: bah@cam.ac.uk
Subject: test email from ssmtp

hello world?

```
Note blank lines above, and finish email with CTRL-D.

### Install/configure Monit
Get the ```monitrc``` file  (from tfc_prod@tfc-app2.cl.cam.ac.uk:~/tfc_prod/monit/monitrc)
Note the monitrc file contains
1. The email address alerts will be sent to (and from)
2. The username/password for the web access

```
sudo apt install monit
sudo cp monitrc /etc/monit
sudo service monit restart
```
Note that monitrc contains the email address Alerts should be sent to, so check that.
An alert should be set as soon as Monit is restarted (testfile does not exist) so check your inbox.
Final test by visiting the local monit web page (note the username/password from monitrc):
```
https://tfc-appZ.cl.cam.ac.uk/system/monitor/
```
