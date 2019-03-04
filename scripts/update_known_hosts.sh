#!/bin/bash

# update_known_hosts.sh
#
# Will collect host ssh keys from tfc-app[1-5] and add those to /etc/ssh/ssh_known_hosts
# A smartcambridge.org entry will be duplicated from each tfc-app[1-5] host key entry in ssh_known_host

for n in 1 2 3 4 5;
do
  name=tfc-app${n}.cl.cam.ac.uk
  entry=$(ssh-keyscan -t ecdsa $name)
  #ssh-keyscan -t ecdsa $name
  entrylength=${#entry}
  if ((entrylength <= 20))
  then
      echo bad exit for $name 1>&2
      continue
  fi
  echo $entry
  echo ${entry/$name/smartcambridge.org}
done
