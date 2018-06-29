### Install Nginx

```
sudo apt install nginx
```
test with
```
wget -O- "http://localhost"
```

### Install LetsEncrypt certbot:

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

### configure generic nginx

Copy configuration

```
cd /home/tfc_prod
su <your sudo-able account>
sudo mkdir /etc/nginx/includes_tfc
sudo cp /home/tfc_prod/tfc_prod/nginx/sites-available/* /etc/nginx/sites-available
sudo cp /home/tfc_prod/tfc_prod/nginx/includes_tfc/* /etc/nginx/includes_tfc
sudo ln -s /etc/nginx/sites-available/tfc_prod2.conf /etc/nginx/sites-enabled/tfc_prod2.conf
sudo rm /etc/nginx/sites-enabled/default
service nginx stop
```

Make a certificate for this server's hostname, replacing \<hostname\> appropriately

```
certbot certonly --standalone --cert-name tfc_prod -d <hostname>
```

Start nginx:

```
service nginx start
```

Edit `/etc/letsencrypt/renewal/tfc_prod.conf`, replace `authenticator = standalone`
with `authenticator = nginx` so future renewals will work with nginx running.

### nginx supporting smartcambridge.org

For machines that will (or are going to) host smartcambridge.org/www.smartcambridge.org, assuming
nginx is already running

If this machine currently responds to smartcambridge.org/www.smartcambridge.org:

```
certbot certonly --nginx --cert-name smartcambridge -d smartcambridge.org -d www.smartcambridge.org
sudo ln -s /etc/nginx/sites-available/smartcambridge.conf /etc/nginx/sites-enabled/smartcambridge.conf
service nginx restart
```

If this machine **doesn't** currently respond to smartcambridge.org/www.smartcambridge.org but is going to:

Copy /etc/letsencrypt/live/fullchain.pem and /etc/letsencrypt/live/privkey.pem
from the machine that is currently running smartcambridge.org/www.smartcambridge.org, and then

```
sudo ln -s /etc/nginx/sites-available/smartcambridge.conf /etc/nginx/sites-enabled/smartcambridge.conf
service nginx restart
```

**TODO:** enable renewal if this machine will be running this for long





Test with wget (or use browser):
```
wget -O- "http://<hostname>/local_rule"
```
Also browse to ```http://localhost```

### Configure https access

Get the certificate bundle.crt and private.key files (e.g. ```tfc-app1_bundle.crt, tfc_app1_cl_cam_ac_uk.key```)

Create the nginx directory to hold the certificates and copy the certificate files
```
sudo mkdir /etc/nginx/ssl
sudo cp tfc-app1_bundle.crt /etc/nginx/ssl
sudo cp tfc_app1_cl_cam_ac_uk.key /etc/nginx/ssl
sudo chmod 600 /etc/nginx/ssl/*
sudo chmod 700 /etc/nginx/ssl
```
Copy the tfc_prod_ssl.conf nginx config file to /etc/nginx/sites-available, and link
```
sudo cp tfc_prod/nginx/sites-available/tfc_prod_ssl.conf /etc/nginx/sites-available/
cd /etc/nginx/sites-enabled/
sudo ln -s ../sites-available/tfc_prod_ssl.conf tfc_prod_ssl.conf
```
Restart nginx
```
sudo service nginx restart
```
Test by browsing to a locally served nginx test page:
```
https://tfc-app3.cl.cam.ac.uk/test_proxy
```


Run certbot, generate a certificate for smartcambridge.org, www.smartcambridge.org,  carrier.csi.cam.ac.uk

Disable stand-alone SSl configuration:

```
rm /etc/nginx/sites-available/tfc_prod_ssl.conf
```

Note that doing this will _prevent_ direct ssl access via the underlying 
server name.