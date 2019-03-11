#!/bin/bash

# For tsmartcambridge.org/www.smartcambridge.org
certbot certonly \
    --manual \
    --cert-name smartcambridge.org \
    --domains www.smartcambridge.org,smartcambridge.org \
    --manual-auth-hook /etc/nginx/acme-challenge/bin/authenticator.sh \
    --manual-cleanup-hook /etc/nginx/acme-challenge/bin/cleanup.sh