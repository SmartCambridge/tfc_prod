# smartcambridge.org backups

These are the evolving scripts that backup data from smartcambridge.org to other servers.

## Summary

```amc203 script``` that makes /backups/*.bz2 daily backup files.

```/backups/purge.sh``` daily cron job (sudo) that deletes some old backup files.

```/backups/rsync.sh``` daily cron job on tfc-app2,3,4 (as tfc_prod) that copies backups from smartcambridge.org.

## On smartcambridge.org

(to be updated) A script written by amc puts a database backup .bz2 file into /backups nightly (~1am - local time issue?)

```~tfc_prod/.ssh/authorized_keys``` contains pub keys for ```tfc_prod``` user on tfc-app2, tfc-app3 and tfc-app4.

Root, i.e. ```sudo crontab -e``` daily runs the script (by ijl20) ```/backups/purge.sh``` which clears old .bz2 backups
 out of the /backups directory. It keeps backups for 10 days, and keeps older backups one backup every 10 days.

Usage is ```sudo purge.sh <backup directory>``` i.e. on smartcambridge.org is  
```
sudo /backups/purge.sh /backups
```

## On tfc-app2,3,4

Each server contains a directory ```/mnt/sdd1/smartcambridge.org/backups```

```(user tfc_prod) crontab -e``` daily runs the script (by ijl20) /mnt/sdd1/smartcambridge.org/backups/rsync.sh```
to rsync the files from smartcambridge.org/backups to /mnt/sdd1/smartcambridge.org/backups

Usage is ```rsync.sh <backup directory>``` i.e. in this case 
```
/mnt/sdd1/smartcambridge.org/backups/rsync.sh /mnt/sdd1/smartcambridge.org/backups/
```

Note the backups directory parameter to rsync.sh *requires* a trailing slash.

tfc-app2,3,4 (user tfc_prod) can also run ```purge.sh``` i.e.
```
/mnt/sdd1/smartcambridge.org/backups/purge.sh /mnt/sdd1/smartcambridge.org/backups
```
but this is currently manual rather than a regular cron job.

