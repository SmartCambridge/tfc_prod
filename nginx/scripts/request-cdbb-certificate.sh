#!/bin/bash

# For [www.]cdbb.uk
certbot certonly \
    --manual \
    --cert-name cdbb.uk \
    --domains www.cdbb.uk,cdbb.uk \
    --manual-auth-hook /home/tfc_prod/tfc_prod/nginx/scripts/authenticator.sh \
    --manual-cleanup-hook /home/tfc_prod/tfc_prod/nginx/scripts/cleanup.sh

