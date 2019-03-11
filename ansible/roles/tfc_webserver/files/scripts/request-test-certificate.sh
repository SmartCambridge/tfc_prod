#!/bin/bash

# For test.smartcambridge.org
certbot certonly \
    --manual \
    --cert-name test.smartcambridge \
    --domains test.smartcambridge.org \
    --manual-auth-hook /etc/nginx/acme-challenge/bin/authenticator.sh \
    --manual-cleanup-hook /etc/nginx/acme-challenge/bin/cleanup.sh \
    --staging
