System Metrics
==============

*Prometheus* gathers and stores system metrics and *Grafana*
to graph them. These instructions set up Prometheus to gather metrics about
itself, the system it runs on, Nginx, and the Gunicorn process supporting
tfc_web and to make them available in Grafana.

See [TFC Server Monitoring Architecture](tfc_server_monitoring.pdf) for
an overview of the eventual architecture.

Configure Nginx
---------------

Replace the default nginx package with one that includes Lua scripting
support, use this to configure Nginx to provide metrics and configure
Nginx to proxy connections to Prometheus and Grafana (which will be
installed in a moment):

```
sudo apt install nginx-extras
sudo mkdir /etc/nginx/lua
sudo cp prometheus.lua /etc/nginx/lua
sudo cp lua-prometheus.conf /etc/nginx/conf.d/
sudo cp prometheus-metrics.conf prometheus-server.conf grafana.conf /etc/nginx/includes2/
```

`prometheus.lua` comes from https://github.com/knyar/nginx-lua-prometheus/
and can be upgraded by copying a later version. he current version is 0.20181120.

Either copy `/etc/nginx/tfc_admin_htpasswd` from another machine, or
create one from scratch. Either way, create a temporary `admin` user with a
password you know, and add yourself as a user identified by your CrsID
if you are not already in the file:

```
sudo apt install apache2-utils
sudo htpasswd /etc/nginx/tfc_admin_htpasswd admin
sudo htpasswd /etc/nginx/tfc_admin_htpasswd <your crsid>
sudo chown www-data:www-data /etc/nginx/tfc_admin_htpasswd
sudo chmod go= /etc/nginx/tfc_admin_htpasswd
```

Anyone who can authenticate against this file will have access to
the Prometheus console and will have admin access to Grafana.

Restart nginx:

```
sudo nginx -t
systemctl restart nginx
```

Enable metrics from Gunicorn for tfc\_web
-----------------------------------------

Check that the gunicorm command in `~tfc_prod/tfc_web/run.sh` includes the
command-line arguments:

```
--statsd-host=localhost:9125 --statsd-prefix=tfc_web
```

If not, add them, kill the running gunicorm processes and restart it by
running `run.sh`.


Create a prometheus user and some directories
---------------------------------------------

Create a `prometheus` user to own the data files and to run the various
daemons, and create various directories. This set up stores collected data
in `/mnt/sdc1/prometheus` but links this to the expected location of
`/var/lib/prometheus`:

```
sudo useradd --no-create-home --shell /bin/false prometheus
sudo mkdir /etc/prometheus
sudo mkdir /mnt/sdc1/prometheus
sudo ln -s /mnt/sdc1/prometheus /var/lib/prometheus
sudo chown prometheus:prometheus /mnt/sdc1/prometheus
sudo mkdir -p /var/lib/node_exporter/textfile_collector/
sudo chown -R prometheus:prometheus /var/lib/node_exporter/
sudo chmod +t,go+rwx /var/lib/node_exporter/textfile_collector/
```

Install Prometheus
------------------

```
sudo cp prometheus promtool /usr/local/bin/
sudo cp -r consoles /etc/prometheus
sudo cp -r console_libraries /etc/prometheus
```

The Prometheus files come from the
[Prometheus download page](https://prometheus.io/download/). Upgrade
by downloading later versions.

```
sudo cp prometheus.yml /etc/prometheus
sudo cp prometheus.service /etc/systemd/system/
```

Don't start Prometheus just yet.

Install node_exporter
---------------------

node_exporter makes metrics about the host system available to
Prometheus.

```
sudo cp node_exporter /usr/local/bin/
sudo cp node_exporter.service /etc/systemd/system/
```

node_exporter comes from the
[Prometheus download page](https://prometheus.io/download/). Upgrade
by downloading later versions.

Don't start node_exporter just yet.

Install statsd_exporter
-----------------------

statsd_exporter makes metrics exported vis the statds protocol (including
metrics exported by Ginucorn) available to Prometheus.

```
sudo cp statsd_exporter /usr/local/bin/
sudo cp statsd.yml /etc/prometheus
sudo cp statsd_exporter.service /etc/systemd/system/
```

statsd_exporter comes from the
[Prometheus download page](https://prometheus.io/download/). Upgrade
by downloading later versions.

Don't start statsd_exporter just yet.

Start and test prometheus
-------------------------

```
sudo systemctl daemon-reload
sudo systemctl start node_exporter statsd_exporter prometheus
sudo systemctl status node_exporter statsd_exporter prometheus
sudo systemctl enable node_exporter.service statsd_exporter.service prometheus.service
```

Visit `https://<hostname>/system/prometheus`. You should be prompted for a
username and password - use 'admin' and the password you set up with htpasswd
earlier.

You should end up on the prometheus console screen. The drop-down list
entitled '- insert metric at cursor -' should be populated with metrics
including some starting `gunicorn_`, `nginx_`, `node_` and `prometheus_`,
confirming that the three collection routes are working.

The metric `up` (at the end of the list) should result in a list of four
jobs each with a  value of 1:

```
Element                                                 Value
up{instance="localhost:80",job="nginx"}                 1
up{instance="localhost:9090",job="prometheus"}          1
up{instance="localhost:9100",job="node_exporter"}       1
up{instance="localhost:9102",job="statsd_exporter"}     1
```

Install Grafana
---------------

Ubuntu 16.04 comes with a very old Grafana package. We install a later
one from a personal package archive:

```
sudosh -c "echo 'deb [arch=amd64] https://packages.grafana.com/oss/deb stable main' > /etc/apt/sources.list.d/grafana.list"
sudo curl https://packages.grafana.com/gpg.key | sudo apt-key add -
sudo apt-get update
sudo apt-get install grafana
sudo cp grafana.ini /etc/grafana/
sudo cp prometheus-datasource.yaml /etc/grafana/provisioning/datasources/
```

Edit `/etc/grafana/grafana.ini` (with `sudo`). Edit the hostname in the
`root_url` item to match the host name of the server you are installing on.
Then:

```
sudo systemctl daemon-reload
sudo systemctl start grafana-server
sudo systemctl status grafana-server
sudo systemctl enable grafana-server.service
```

Visit `https://<hostname>/system/grafana`. If prompted for a username
and password use 'admin' and the coresponding password you set-up with
htpasswd earlier.

From the **'cog'** icon on the left-hand menu choose **Data Sources**. You
should see one labelled **Local Prometheus**.

From the **'cog'** icon on the left-hand menu choose **Server Admin**. On the
**Users** tab choose **+ Add new user**. Create yourself as a user, setting
at least 'Name', 'Username' to your CrsID, and 'Password' to any random string
(it's required but we won't use it). On the next screen, select the newly-created
user and set 'Grafana Admin'.

Quit your browser, or start another one, or open an incognito window.
Visit `https://<hostname>/system/grafana`. When prompted, login with your
CrsID and the password you set-up with htpasswd earlier. Providing this works,
delete the `admin` user from the htpassword file:

```
sudo htpasswd -D /etc/nginx/tfc_admin_htpasswd admin
```
