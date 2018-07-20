#!/bin/bash

# For test.smartcambridge.org
certbot certonly \
    --manual \
    --cert-name test.smartcambridge \
    --domains test.smartcambridge.org \
    --manual-auth-hook /home/tfc_prod/tfc_prod/nginx/scripts/authenticator.sh \
    --manual-cleanup-hook /home/tfc_prod/tfc_prod/nginx/scripts/cleanup.sh \
    --staging
