## Monit installation

Install monit:
```
sudo apt install monit
```

Copy config file to prod directory:
```
sudo cp monitrc /etc/monit/
```

Get a copy of `httpd-server.conf` from an already-configured server and copy it to
`/etc/monit` (contains the basic auth password protecting the admin web pages).

Copy the monitoring configurations into conf-available:
```
sudo cp conf-available/* /etc/monit/conf-available
```

Link required ones into conf-enabled, e.g.:
```
cd /etc/monit/conf-enabled/
sudo ln -s ../conf-available/tfc_filespace .
sudo ln -s ../conf-available/tfc_sirivm_json .
sudo ln -s ../conf-available/tfc_web_cronjobs .
sudo ln -s ../conf-available/tfc_servers .
```

also link the web server monitoring configuration for this particular server,
replacing `<n>` as apropriate:

```
sudo ln -s ../conf-available/tfc-app<n>_web_servers .
```

also link the raw SIRIVM monitoring configuration on whichever server
is running as smartcambridge.org (and unlink it on any server that isn't)

```
sudo ln -s ../conf-available/tfc_cloudamber .
```

Create an empty file in `/etc/monit/conf.d`, so the default monitrc include
doesn't complain:
```
sudo touch /etc/monit/conf.d/empty
```

If enabling the `tfc-cloudamber` checks, add the following to root's crontab
to suppress aggressive monitoring overnight when it will otherwise false-positive:
```
00 07 * * * [ -e /etc/monit/conf-enabled/tfc_cloudamber ] && /usr/bin/monit monitor cloudamber_sirivm_data_monitor_fast
00 22 * * * [ -e /etc/monit/conf-enabled/tfc_cloudamber ] && /usr/bin/monit unmonitor cloudamber_sirivm_data_monitor_fast
```

Check monit configuration:
```
sudo monit -t
```

Start or reload monit configuration with:
```
sudo monit reload
```

Check status of running monit:
```
sudo monit status
```
also:
```
sudo service monit status
```
Web console at https://smartcambridge.org/system/monitor/ - see
`/etc/monit/httpd-server.conf` for the credentials

## Adding additional monit checks

To add additional checks, create a new file in `tfc_prod/monit/conf-available`, copy to
`/etc/monit/conf-available` and link it into `/etc/monit/conf-enabled`

### Simple monit example checks

Sample filesystem checks:
```
  check device root-filesystem with path /
    if space usage > 80% then alert

  check device boot-filesystem with path /boot
    if space usage > 80% then alert

  check device tfc-filesystem with path /mnt/sdb1
    if space usage > 80% then alert
```

Sample file timestamp checks:
```
check file data_monitor_json with path /media/tfc/vix/data_monitor_json/post_data.json
      if timestamp > 3 minutes then alert
```

