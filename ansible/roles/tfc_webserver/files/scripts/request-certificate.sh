#!/bin/bash

# For the current host

domain=$(hostname)
if [[ ! "${domain}" =~ "." ]]
then
    domain="${domain}.cl.cam.ac.uk"
fi

certbot certonly \
    --quiet \
    --manual \
    --cert-name tfc_prod \
    --domains "${domain}" \
    --manual-auth-hook /etc/nginx/acme-challenge/bin/authenticator.sh \
    --manual-cleanup-hook /etc/nginx/acme-challenge/bin/cleanup.sh \
    --manual-public-ip-logging-ok
