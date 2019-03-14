# smartcambridge.org backups

These are the evolving scripts that backup data from smartcambridge.org to other servers.

## Summary

* Cron job run by `postgres` that makes `/backups/*.bz2` daily backup files.
* `/backups/purge.sh` daily cron job (root) that deletes some old backup files.
* `/mnt/sdd1/smartcambridge.org/backups/rsync.sh` daily cron job (tfc_prod) that copies latest backups from smartcambridge.org.

## On all servers

A cronjob run by the `postgres` user puts a database backup .bz2 file into `/backups/` nightly at 01:00 local time:

```
0 1 * * * /usr/bin/pg_dumpall --clean | /bin/bzip2 > "/backups/database.$(date +\%Y.\%m.\%d).pgdumpall.bz2"`
```

A cronjob run by root runs the script `/backups/purge.sh` which clears old .bz2 backups
from the /backups/ directory. It keeps backups for 10 days, and keeps older backups one backup every 10 days. Logs actions from last run to `/var/log/tfc_prod/backup_purge.log`.

```
55 05 * * * /backups/purge.sh /backups >/var/log/tfc_prod/backup_purge.log 2>&1 && echo $(date --iso-8601=seconds) > /var/log/tfc_prod/backup_purge.timestamp
```

A cronjob run by the tfc_prod user synchronises the files in the `/backups/` directory on whichever machine is acting as smartcambridge.org to the directory `mnt/sdd1/smartcambridge.org/backups`. The rsync is run with `--ignore-existing` so files already transferred won't be changed or deleted.

```
<xx> 05 * * * /mnt/sdd1/smartcambridge.org/backups/rsync.sh /mnt/sdd1/smartcambridge.org/backups/
```

Note the backups directory parameter to rsync.sh *requires* a trailing slash.

This job is run at different minutes past the hour to spread the load on the smartcambridge.org machine:

```
tfc-app1: 23 mins
tfc-app2: 05 mins
tfc-app3: 33 mins
tfc-app4: 13 mins
```

For this to work, `~tfc_prod/.ssh/authorized_keys` on the smartcambridge.org machine must contain the public keys for the `tfc_prod` user on all the machines, and every machine must have a correct 'known hosts' entry for smartcambridge.org.

The purge script (`/mnt/sdd1/smartcambridge.org/backups/purge.sh`) can be run on any machine against `/mnt/sdd1/smartcambridge.org/backups` to clear out old backups. This is currently manual rather than a regular cron job.
