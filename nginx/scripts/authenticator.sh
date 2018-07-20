#!/bin/bash

# Forward an ACME HTTP-01 challenge to whichever machine is
# hosting the relevant domain

key="/root/acme-challenge-keys/acme-challenge-key"

( echo "auth"
  echo "${CERTBOT_DOMAIN}"
  echo "${CERTBOT_TOKEN}"
  echo "${CERTBOT_VALIDATION}"
) | ssh -i "${key}" acme-challenge@"${CERTBOT_DOMAIN}" acme-challenge

