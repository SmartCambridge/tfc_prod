#!/bin/bash

# Forward an ACME HTTP-01 cleanup request to whichever machine is
# hosting the relevant domain

key="/root/acme-challenge-keys/acme-challenge-key"

( echo "cleanup"
  echo "${CERTBOT_DOMAIN}"
  echo "${CERTBOT_TOKEN}"
  echo "${CERTBOT_VALIDATION}"
) | ssh -i "${key}" acme-challenge@"${CERTBOT_DOMAIN}" acme-challenge
