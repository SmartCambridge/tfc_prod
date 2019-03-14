#!/bin/bash
echo "Comparing your current directory with the /home/tfc_prod/tfc_prod directory (i.e. you should probably be in ~/tfc_prod)"
diff -r --exclude=".git" --exclude=".vertx" --exclude="*~" --exclude="#*#" /home/tfc_prod/tfc_prod /home/ijl20/tfc_prod

