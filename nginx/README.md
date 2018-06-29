Nginx and certificate management
================================

## Install Nginx

```
sudo apt install nginx
```
test with

```
wget -O- "http://localhost"
```

## Install certbot:

```
sudo apt-get update
sudo apt-get install software-properties-common
sudo add-apt-repository ppa:certbot/certbot
sudo apt-get update
sudo apt-get install python-certbot-nginx
```

Add the following line to root's crontab (`crontab -e`):

```
15 3 * * * /usr/bin/certbot renew --quiet
```

## Configure generic Nginx

```
sudo mkdir /etc/nginx/includes_tfc
sudo cp /home/tfc_prod/tfc_prod/nginx/sites-available/* /etc/nginx/sites-available
sudo cp /home/tfc_prod/tfc_prod/nginx/includes_tfc/* /etc/nginx/includes_tfc
sudo rm /etc/nginx/sites-enabled/*
sudo ln -s /etc/nginx/sites-available/tls-bootstrap.conf /etc/nginx/sites-enabled/
sudo service nginx restart
```

Make a certificate for this server's hostname (e.g. `tfc-app1.cl.cam.ac.uk`), replacing \<hostname\> appropriately.
DO NOT omit the `--cert-name` option.

```
sudo certbot certonly --nginx --cert-name tfc_prod -d <hostname>
```

Restart nginx with a new configuration:

```
sudo rm /etc/nginx/sites-enabled/tls-bootstrap.conf
sudo ln -s /etc/nginx/sites-available/tfc_prod2.conf /etc/nginx/sites-enabled/
sudo service nginx restart
```

## Configure nginx supporting smartcambridge.org

There are two different strategies:

### For a machine currently responding to requests to smartcambridge.org/www.smartcambridge.org

```
sudo certbot certonly --nginx --cert-name smartcambridge -d smartcambridge.org -d www.smartcambridge.org
sudo ln -s /etc/nginx/sites-available/smartcambridge.conf /etc/nginx/sites-enabled/
sudo service nginx restart
```

### For a machine NOT currently responding to requests to smartcambridge.org/www.smartcambridge.org

Create `/etc/letsencrypt/live/fullchain.pem` and `/etc/letsencrypt/live/privkey.pem`,
by copying them from the machine that is currently running smartcambridge.org/www.smartcambridge.org,
or from a backup. If this isn't possible then you'll need to update the DNS so the machine does respond to
smartcambridge.org/www.smartcambridge.org and folow the instructions above.

```
sudo ln -s /etc/nginx/sites-available/smartcambridge.conf /etc/nginx/sites-enabled/
sudo service nginx restart
```

**TODO:** enable renewal if this machine will be running this for long. Will copying
actual files to /etc/letsencrypt/live/ mess this up?

**TODO:** automatically transfer keys and certificates as they are regenerated
from the machine responding to smartcambridge.org/www.smartcambridge.org onto any
other machines that might run these sites in future. Requires infrastructure for securely
transferring root-owned secrets between our servers.

**TODO:** alternatively, we could use certbot manual mode and arrange to transfer the CERTBOT_VALIDATION
and CERTBOT_TOKEN values to whichever machine *is* responding to smartcambridge.org/www.smartcambridge.org
using `--manual-auth-hook` (and cleaning up with `--manual-cleanup-hook`). This still requires infrastructure
for transferring files but a) they would only be short-term secrets, and b) the destination doesn't need to be run as root.


## Configure nginx supporting carrier.csi.cam.ac.uk

```
sudo mkdir /etc/nginx/ssl
sudo cp carrier.pem /etc/nginx/ssl
sudo cp carrier.key /etc/nginx/ssl
sudo chmod 600 /etc/nginx/ssl/*
sudo chmod 700 /etc/nginx/ssl
sudo ln -s /etc/nginx/sites-available/carrier.csi.cam.ac.uk.conf /etc/nginx/sites-enabled/
sudo service nginx restart
```

**TODO:** store backup copies of carrier.pem/carrier.key somewhere so they don't get lost.
Needs infrastructure for securely storing and transfering root-owned secrets between our servers.
