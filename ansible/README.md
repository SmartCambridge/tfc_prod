TFC Server installation with Ansible
====================================

This Ansible configuration can initially install and subsequently manage
any number of TFC servers. It can't sensibly manage servers that were
installed by hand, and will probably make a mess of them if it tries.

Prerequisites - managed machines
================================

* Basic Ubuntu 18.04 install
* Networkig configured
* The `openssh-server` and `python` packages installed
* At least one key in `/root/.ssh/authorized_keys` (which will be replaced as part of the install)
* An entry for the server being installed in the Ansible inventory file

Prerequisites - control machine
===============================

Almost anything can be used as a control machine if it has the
prerequisites below, including individual workstations. If using a
remote machine then there can be issues making the necessary SSH and GPG
keys available. The control machine will have root access to all the
servers being managed while they are being managed so its security is
important. However it's no more important than on any machine used to
access root on the servers.

Prerequisites:

* A copy of the `ansible` directory from the tfc_prod repository
* Ansible (known to work with Ansible 2.7, others may work)
    * Test with `ansible-playbook --version`
* SSH with working SSH agent support
* A private key and pass phrase corresponding to a key in
  `/root/.ssh/authorized_keys` on every managed machine __and__ a private key and pass phrase
  corresponding to a key in `roles/users/files/priv_keys` in the repository (if not the same - see 'User management' below)
    * Test with `ssh root@<host>` which shouldn't require a password
* GPG with working GPG agent support (known to work with with GnuPG/MacGPG2 2.0.30)
* A GPG key and pass phrase corresponding to a public
  key in the regpg keyring (see secrets management
  below).
    * Test with `gpg --decrypt gpg-preload.asc`

Installation and update process
===============================

From the `tfc_prod/ansible` directory, run

    ansible-playbook --limit <server> site.yml

for example

    ansible-playbook --limit tfc-app5 site.yml

Post-install steps
==================

Some aspects of setting up and managing servers are not handled by
Ansible and may need to be completed manually after setting up a new
server or subsequently:

User passwords
--------------

A set of user accounts are created with apropriate SSH `authorized_keys`,
but they have no passwords which in particular means `sudo` won't work.
Some users have root access authorized by SSH key (see 'User management'
below) and thay can set their own passwords and those of others.

tfc_web and tfc_server software
-------------------------------

The Ansible script installs a snapshot of the current `master` branch of
tfc_web and tfc_server if one isn't already present, but that may not be
what's wanted. Different versions can be chacked out, built (in the case
of tfc_server) and installed manually. The Ansible script won't
subsequently touch them.

Database and data files
-----------------------

Ansible doesn't copy any 'state' data from elsewhere. Depending on you plans,
you may want to copy over

  * The tfcweb database
  * Media files used by the forum in `/tfc_web/media`
  * Data files in /media/tfc

Bus stop and timetable data
---------------------------

Ansible installs cron jobs to retrieve bus stop and timetable information
but doesn't immediatly run them. See the output of `crontab -l` for the
`tfc_prod` user for the commands needed to do this manually. Both commands
take a long time.

Differences from a manual tfc\_prod install
===========================================

* `tfc_prod` user is a system with uid < 1000
* The same `tfc_prod` SSH keypair is installed across all Ansible-installed hosts
* `/etc/ssh/ssh_known_hosts` is installed/managed by Ansible
* The document root for static files is in `/var/www/tfc_prod`, not `~tfc_prod/tfc_prod/www`.
* SSH keys for privileged admin users are added to `~root/.ssh/authorized keys`
* The `tfc_prod` repository isn't checked out to `~tfc_prod/tfc_prod`, though
  some content is installed there
* A copy of the `tfc_server` repository is checked out by the `tfc_prod` user as
  `~tfc_prod/tfc-server` on newly-installed servers but can be deleted

User management
===============

* Accounts are created for all userids listed in `admin_users` (see
`group_vars/tfc_servers.yml`).
* For all such user where there's a corresponding file in
`roles/users/files/mortal_keys` then that file is copied as their
`.ssh/authorized_keys`.
* These accounts don't have passwords initially so can only be accessed
by key and can't initially `sudo`. Passwords need to be set via root
access.
* An account is created for `tfc_prod`. A standard keypair is
installed as `tfc_prod`'s `id_rsa`.
* All the files in `roles/users/files/mortal_keys` (which includes one
for `tfc_prod` itself) are concatenated into
`~tfc_prod/.ssh/authorised_keys` so anyone with access to the
coresponding private keys can log in as `tfc_prod`.
* All the files in `roles/users/files/priv_keys` (which are typically a
subset of those in `roles/users/files/mortal_keys`) are concatenated
into `~root/.ssh/authorised_keys` so anyone with access to the
coresponding private keys can log in as `root`. In particular, this
alows such users to run Ansible.

Secret management
=================

All secrets are stored in the repository but managed wih Tony Finch's
`regpg` tool (https://dotat.at/prog/regpg/).

All the `reggp` components needed to run the playbooks are built-in to
the repository. There's a copy of the `regpg` script itself in `/bin/`
in case it's useful, though you might want to install a copy somewhere
on your PATH for convenience. `regpg` has to be run from the `ansible`
folder for it to find its support files.

See the `regpg` web page for information, and in particular
https://dotat.at/prog/regpg/doc/tutorial.html for information on how
`reggp` works.

Before anyone can run the playbooks for the first time they need to
generate a GPG key, add it to the `regpg` keyring with `regpg add`, and
get someone with a key already on the keyring to run `regpg recrypt -r`.

Repository structure
====================
```
.
├── README.md              # This file
├── ansible.cfg            # Ansible configuration
├── bin
│   └── regpg              # Copy of the regpg script
├── gpg-preload.asc        # regpg support
├── gpg-preload.yml        # regpg support
├── group_vars
│   └── tfc_servers.yml    # Pre-defined variables for tfc_server group
├── host_vars              # Pre-defined variables for individual server (empty a.t.m.)
├── inventory              # List of hosts managed
├── library                # regpg support
│   └── gpg_d.py
├── plugins                # regpg support
│   ├── action
│   │   └── gpg_d.py
│   └── filter
│       └── gpg_d.py
├── pubring.gpg            # regpg user keyring
├── roles
│   ├── common             # Common setup for every server
│   │   ├── files
│   │   └── tasks
│   ├── file_systems       # LVM and filesystem setup
│   │   ├── defaults
│   │   └── tasks
│   ├── monit              # monit install and config
│   │   ├── files
│   │   ├── handlers
│   │   ├── meta
│   │   └── tasks
│   ├── system_metrics     # Prometheus/Grafana install and setup
│   │   ├── files
│   │   ├── handlers
│   │   ├── meta
│   │   └── tasks
│   ├── tfc_prod           # tfc_prod user setup
│   │   ├── files
│   │   └── tasks
│   ├── tfc_server         # tfc_server setup
│   │   ├── files
│   │   ├── meta
│   │   └── tasks
│   ├── tfc_web            # tfc_web setup
│   │   ├── files
│   │   ├── meta
│   │   └── tasks
│   ├── tfc_webserver      # General nginx setup
│   │   ├── files
│   │   ├── files
│   │   ├── handlers
│   │   └── tasks
│   └── users              # Create users
│       ├── defaults
│       ├── files
│       └── tasks
├── site.yml               # Playbook for *everything*
└── tfc_servers.yml        # Playbook for tfc servers (currently the only group)
```
