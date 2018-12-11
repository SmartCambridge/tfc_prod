#!/bin/bash

# Reload nginx following certificate renewal

logger -p daemon.error -t deploy.sh "Restarting nginx for certificate change"
ls -lR /etc/letsencrypt/live/ | logger -p daemon.error -t cleanup.sh
service nginx reload
