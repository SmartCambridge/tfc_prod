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
`/etc/monit`

Copy TFC monitoring configurations into conf-available:
```
sudo cp conf-available/* /etc/monit/conf-available
```

Link required ones into conf-available, e.g.:
```
sudo ln -s /etc/conf-available/tfc_web_servers /etc/conf-enabled/tfc_web_servers
sudo ln -s /etc/conf-available/tfc_web_cronjobs /etc/conf-enabled/tfc_web_cronjobs

```

Check status of running monit:
```
sudo monit status
```
also:
```
sudo service monit status
```

To add additional checks, edit tfc_prod/monit/monitrc and copy to /etc/monit

To check monit configutation;
```
sudo monit -t
```

Restart monit with
```
sudo monit start all
```

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

