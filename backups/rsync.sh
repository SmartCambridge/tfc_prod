# ijl20 - rsync the smartcambridge.org:/backups directory to local /mnt/sdd1/smartcambridge.org/backups

# this assumes the ssh key for local is in smartcambridge.org tfc_prod authorized_keys

if [ -z "$1" ]; then
  echo "No destination directory given as first argument (/mnt/sdd1/smartcambridge.org/backups/ ?)"
  exit 1
fi

rsync -haz --ignore-existing tfc_prod@smartcambridge.org:/backups/ $1


