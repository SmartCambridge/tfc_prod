Nginx and certificate management
================================

## Install Software

```
sudo apt install software-properties-common
sudo add-apt-repository ppa:certbot/certbot
sudo apt update
sudo apt install nginx python-certbot-nginx userv

```
At this point (after the `sudo apt install nginx`) nginx will be running, i.e. serving web pages
so you can test you receive a default home page with:

```
wget -O- "http://localhost"
```

## Summary letsencrypt/certbot system

The certificates are installed e.g. with
```
nginx/scripts/request-smartcambridge-certificate.sh
```
which does
```
certbot certonly --certname X --domains X --manual-auth-hook X --manual-cleanup-hook X
```

Installed certificates can be listed with `sudo ls -l /etc/letsencrypt/live/` or
`sudo certbot certificates` with the latter showing expiry dates.

Certificates can be checked *remotely* with e.g.
```
openssl s_client -showcerts -servername smartcambridge.org -connect smartcambridge.org:443 </dev/null
```

**For the regular updates** the letsencrypt/certbot installation will add a cron job at `/etc/cron.d/certbot`
which will run `certbot -q renew` every 12 hours.

During that certificate renewal process, the cloud letsencrypt service will validate 'ownership'
of each domain requested by:
* responding to the certificate request with a key/value pair.
* making a request to `http://<domain>/.well-known/acme-challenge/<key>`and checking the returned content
  is `<value>`.

This means the server making the request has to *create* that file immediately on receiving the response
to the certificate renewal request.

The main complexity for this platform is that *all* servers need to collect the *prod-domain*
`smartcambridge.org` (or `cdbb.uk`) certificate which requires our requesting server to pass that
`<key>/<value>` to the *prod-domain* server and have our code on that server create the required
file such that the letsencrypt check http 'get' succeeds.

The communication with the *prod-domain* is initiated by the `--manual-auth-hook` script given when the
certificate was created: `nginx/scripts/authenticator.sh`.

This `authenticator.sh` script sends the `<key>/<value>` pair to the *prod-domain* via an ssh login:
```
key="/root/acme-challenge-keys/acme-challenge-key"

( echo "auth"
  echo "${CERTBOT_DOMAIN}"
  echo "${CERTBOT_TOKEN}"
  echo "${CERTBOT_VALIDATION}"
) | ssh -i "${key}" acme-challenge@"${CERTBOT_DOMAIN}" acme-challenge
```

*Crucially* this requires the requesting server to have the required
```
/root/acme-challenge-keys/acme-challenge-key
```
and the *prod-domain* already have the requesting server in its system-wide
`/etc/ssh/ssh_known_hosts` file which can be created with the
`tfc_prod/scripts/update_known_hosts.sh` script.

The `acme-challenge` *command* on that `ssh -i` remote login is piped the `<key>/<value>` and creates
the required file via:
```
echo "${certbot_validation}" > "/var/www/acme-challenge/${certbot_token}"
```

And taa-daa! The validation http request from the letsencrypt cloud should then succeed, and the updated
certificate will be granted.

## Update server `/etc/ssh/ssh_known_hosts`

If this hasn't already been done in the tfc_prod setup, as a sudoer run
```
~tfc_prod/tfc_prod/scripts/update_known_hosts.sh >ssh_known_hosts
sudo mv ssh_known_hosts /etc/ssh/
```
If you inspect the ssh_known_hosts file, you should see an entry for each `tfc-appX` server followed
by an identical entry with the `smartcambridge.org` hostname.

## Setup support for forwarding certificate challenges from letsencrypt

We use a special account (`acme-challenge`) to transfer the challenges created by `certbot`
so that we can apply for certificates on one machine while the domain is being services by another one.

The _challenge_ is that letsencrypt will provide a file-name/file-content pair and the
certificate-requesting host is required to create a file with that name and content at
the location `http://<hostname>/.well-known/acme-challenge/<file-name>`.

For testing, we will place a test file accessible as
`http://<hostname>/.well-known/acme-challenge/test.html`.

First collect the `acme-challenge` ssh keypair from a machine that already has them and
set permissions e.g. via

```
sudo scp root@<other-server>:/root/acme-challenge-keys /root/acme-challenge-keys
sudo chmod 644 /root/acme-challenge-keys/*
sudo chmod 600 /root/acme-challenge-keys/acme-challenge-key
sudo chmod 755 /root/acme-challenge-keys

```

Set up the userv scripts to be triggered by a key-based logon to user `acme-challenge`:

```
sudo mkdir /usr/local/lib/userv/
sudo cp ~tfc_prod/tfc_prod/nginx/scripts/acme-challenge.target /usr/local/lib/userv/
sudo cp ~tfc_prod/tfc_prod/nginx/scripts/acme-challenge /etc/userv/services.d/
```

Setup a script that will be run following successful certificate renewal
which will reload nginx

```
sudo cp ~tfc_prod/tfc_prod/nginx/scripts/deploy.sh /etc/letsencrypt/renewal-hooks/deploy/
```

Create the user `acme-challenge`. The `authorized_keys` file will enforce the userv execution
of the script `acme-challenge` on any logon to this user:

```
sudo useradd --create-home acme-challenge
sudo mkdir ~acme-challenge/.ssh
sudo cp /root/acme-challenge-keys/authorized_keys ~acme-challenge/.ssh/
```

Create the webspace that letsencrypt will use for the challenge:

```
sudo mkdir /var/www/acme-challenge
sudo cp ~tfc_prod/tfc_prod/nginx/www-acme-challenge/* /var/www/acme-challenge/
```

## Setup initial Nginx, get certificates

```
sudo mkdir /etc/nginx/includes2
sudo cp /home/tfc_prod/tfc_prod/nginx/includes2/* /etc/nginx/includes2
```

Follow the steps in **Option A** or **Option B** as appropriate:

### Option A: for a new install

```
sudo cp /home/tfc_prod/tfc_prod/nginx/sites-available/* /etc/nginx/sites-available
sudo rm /etc/nginx/sites-enabled/*
```

Install a temporary, non-TLS nginx configuration and use this to get certificates
for this server, and for smartcambridge.org

```
sudo ln -s /etc/nginx/sites-available/tls-bootstrap.conf /etc/nginx/sites-enabled/
```

### Option B: migrating from an older install

Firstly check to see if you can already access the following web address:
```
http://<hostname>/.well-known/acme-challenge/test.html
```
If that file is accessible then your nginx configuration required for the letsencrypt
challenge is already in place and you can skip this Option and jump to the next
section 'Continue nginx configuration'

Assuming you are running an existing nginx configuration `tfc_prod.conf`, you can
obtain the letsencrypt certificates by adding an `include` file:

```
sudo cp ~tfc_prod/tfc_prod/nginx/includes/letsencrypt_port_80.conf /etc/nginx/includes/
```

Copy the following files (for each host that is to be supported on your server):

```
sudo cp /home/tfc_prod/tfc_prod/nginx/sites-available/tfc_prod2.conf /etc/nginx/sites-available/
sudo cp /home/tfc_prod/tfc_prod/nginx/sites-available/smartcambridge.conf /etc/nginx/sites-available/
sudo cp /home/tfc_prod/tfc_prod/nginx/sites-available/carrier.csi.cam.ac.uk.conf /etc/nginx/sites-available/
```

After nginx is restarted (see next section) your existing server services should still
be accessible (i.e. you haven't broken anything).

## Continue nginx configuration

Check the nginx configuration is ok, and if so, restart nginx:

```
sudo nginx -t
sudo service nginx restart
```

If you haven't already, check to confirm you can access the following web address:

```
http://<hostname>/.well-known/acme-challenge/test.html
```

If that fails then your nginx configuration for access to `/var/www/acme-challenge`
is not working as is should, so go back and fix that.

## Collect required certificates

Enter these commands and respond when prompted:

```
sudo ~tfc_prod/tfc_prod/nginx/scripts/request-certificate.sh
sudo ~tfc_prod/tfc_prod/nginx/scripts/request-smartcambridge-certificate.sh
```

## If required, configure carrier.csi.cam.ac.uk support

Collect certificates for carrier.csi.cam.ac.uk from another machine that already has them

```
sudo mkdir /etc/nginx/ssl
sudo scp root@<other-server>:/etc/nginx/ssl/carrier.pem /etc/nginx/ssl
sudo scp root@<other-server>:/etc/nginx/ssl/carrier.key /etc/nginx/ssl
sudo chmod 600 /etc/nginx/ssl/*
sudo chmod 700 /etc/nginx/ssl
```

## Restart nginx with production configuration:

If previously installed, remove the tls-bootstrap.conf file:

```
sudo rm /etc/nginx/sites-enabled/tls-bootstrap.conf
```

Link to the chose site configurations in `/etc/nginx/sites-enabled`:

```
sudo ln -s /etc/nginx/sites-available/tfc_prod2.conf /etc/nginx/sites-enabled/
```

For any machine that will or could run `smartcambridge.org`:

```
sudo ln -s /etc/nginx/sites-available/smartcambridge.conf /etc/nginx/sites-enabled/
```

For any machine that will or could run `carrier.csi.cam.ac.uk`:

```
sudo ln -s /etc/nginx/sites-available/carrier.csi.cam.ac.uk.conf /etc/nginx/sites-enabled/
```

Install default vhost config and a 'dummy' ssl key and certificate

```
sudo cp /home/tfc_prod/tfc_prod/nginx/dummy.key /etc/nginx/ssl/
sudo cp /home/tfc_prod/tfc_prod/nginx/dummy.crt /etc/nginx/ssl/
sudo ln -s /etc/nginx/sites-available/000-default.conf /etc/nginx/sites-enabled/
```

Check the file exists:

```
/etc/letsencrypt/options-ssl-nginx.conf
```

If not, then download from
[https://github.com/certbot/certbot/blob/master/certbot-nginx/certbot_nginx/options-ssl-nginx.conf](https://github.com/certbot/certbot/blob/master/certbot-nginx/certbot_nginx/options-ssl-nginx.conf)

and then check and restart nginx:

```
sudo nginx -t
sudo service nginx restart
```

You should be able to confirm access is enabled via https, and http requests are upgraded.

Feeds can be tested with:
```
~tfc_prod/tfc_prod/tools/feeds.sh
```

There are no problems, and some advantages, in enabling `smartcambridge.org`, `www.smartcambridge.org`,
`carrier.csi.cam.ac.uk` on many or all machines. Only the machines coresponding to those names in the
DNS will actually recieve traffic for those hosts.

## Setup certificate renewals:

The certbot package installs both a cronjob (`/etc/cron.d/certbot`) for non-systemd systems
and a pair of systemd units (`certbot.service` and `certbot.timer`), one or other of which
will automatically run `certbot --renew` twice a day to renew any certificates with less that
30 days remaining life. Activity is logged to syslog.
