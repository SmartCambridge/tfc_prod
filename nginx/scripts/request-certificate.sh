#!/bin/bash

# For the current host

domain=$(hostname)
if [[ ! "${domain}" =~ "." ]]
then
    domain="${domain}.cl.cam.ac.uk"
fi

certbot certonly \
    --manual \
    --cert-name tfc_prod \
    --domains "${domain}" \
    --manual-auth-hook /home/tfc_prod/tfc_prod/nginx/scripts/authenticator.sh \
    --manual-cleanup-hook /home/tfc_prod/tfc_prod/nginx/scripts/cleanup.sh
