#!/bin/bash

# Forward an ACME HTTP-01 cleanup request to whichever machine is
# hosting the relevant domain

key="/root/acme-challenge-keys/acme-challenge-key"

( echo "cleanup"
  echo "${CERTBOT_DOMAIN}"
  echo "${CERTBOT_TOKEN}"
  echo "${CERTBOT_VALIATION}"
) | ssh -i "${key}" acme-challenge@"${CERTBOT_DOMAIN}" acme-challenge

logger -p daemon.error -t cleanup.sh "Restarting nginx for ${CERTBOT_DOMAIN} certificate change"
ls -lR /etc/letsencrypt/live/ | logger -p daemon.error -t cleanup.sh
service nginx restart
ls -lR /etc/letsencrypt/live/ | logger -p daemon.error -t cleanup.sh
