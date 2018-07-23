Nginx and certificate management
================================

## Install Software

```
sudo apt install software-properties-common
sudo add-apt-repository ppa:certbot/certbot
sudo apt update
sudo apt install nginx
sudo apt install python-certbot-nginx
sudo apt install userv

```
test with

```
wget -O- "http://localhost"
```

## Setup support for forwarding certificate challenges

We use a special account (`certbot-challenge`) to transfer the challenges created by `certbot` so that we can apply for certificates on one machine while the domain is being services by another one.

First collect the `certbot-challenge` ssh keypair from a machine that already has them

```
sudo scp root@<other-server>:/root/acme-challenge-keys /root/acme-challenge-keys
```

then

```
sudo mkdir /usr/local/lib/userv/
sudo cp ~tfc_prod/tfc_prod/nginx/scripts/acme-challenge.target /usr/local/lib/userv/
sudo cp ~tfc_prod/tfc_prod/nginx/scripts/acme-challenge /etc/userv/services.d/
sudo mkdir /var/www/acme-challenge
sudo useradd --create-home acme-challenge
sudo mkdir ~acme-challenge/.ssh
sudo cp /root/acme-challenge-keys/authorized_keys ~acme-challenge/.ssh/
```

## Setup initial Nginx, get certifictes

```
sudo mkdir /etc/nginx/includes2
sudo cp /home/tfc_prod/tfc_prod/nginx/sites-available/* /etc/nginx/sites-available
sudo cp /home/tfc_prod/tfc_prod/nginx/includes2/* /etc/nginx/includes2
sudo rm /etc/nginx/sites-enabled/*
sudo ln -s /etc/nginx/sites-available/tls-bootstrap.conf /etc/nginx/sites-enabled/
sudo service nginx restart
```

Get certificates for this server, and for smartcambridge.org

```
sudo ~tfc_prod/tfc_prod/nginx/scripts/request-certificate.sh
sudo ~tfc_prod/tfc_prod/nginx/scripts/request-smartcambridge-certificate.sh
```

Collect certificates for carrier.csi.cam.ac.uk from another machine that already has them

```
sudo mkdir /etc/nginx/ssl
sudo scp root@<other-server>:/etc/nginx/ssl/carrier.pem /etc/nginx/ssl
sudo scp root@<other-server>:/etc/nginx/ssl/carrier.key /etc/nginx/ssl
sudo chmod 600 /etc/nginx/ssl/*
sudo chmod 700 /etc/nginx/ssl
```

## Restart nginx with production configuration:

```
sudo rm /etc/nginx/sites-enabled/tls-bootstrap.conf
sudo ln -s /etc/nginx/sites-available/tfc_prod2.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/smartcambridge.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/carrier.csi.cam.ac.uk.conf /etc/nginx/sites-enabled/
sudo service nginx restart
```

Note this enables `smartcambridge.org`/`www.smartcambridge.org`/`carrier.csi.cam.ac.uk` on every
machine, but only the machine coresponding to those names in the DNS will actually recieve traffic for
those hosts.

## Setup certificate renewals:

Add the following line to root's crontab (`sudo crontab -e`):

```
15 3 * * * /usr/bin/certbot renew --quiet
```
