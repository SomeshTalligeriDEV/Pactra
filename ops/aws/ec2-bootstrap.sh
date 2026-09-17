#!/usr/bin/env bash
#
# EC2 user-data: runs once, as root, on first boot of the Ubuntu instance
# provision.sh creates. Installs Node, nginx and certbot, clones the repo,
# and installs the systemd units for meter + attest — the same two services
# ops/README.md documents for a hand-run box, unchanged.
#
# What this deliberately does not do: install or start the daemon. That
# holds the operator key, and ops/README.md is explicit that a key never
# lands on a web-facing box. If this script is ever edited to add it, that
# edit is the bug, not a feature.
#
# Two things this can't finish unattended, matching ops/README.md's own
# first-install steps: DNS has to point at this box before certbot can issue
# certificates, and .env.attest (the one key this box does hold) has to be
# typed in by hand rather than baked into an image or user-data, which is
# visible to anyone who can call DescribeInstanceAttribute on this instance.
set -euo pipefail
exec > >(tee -a /var/log/pactra-bootstrap.log) 2>&1
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) bootstrap starting"

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y nginx certbot python3-certbot-nginx git curl rsync

# Node 23.6+: the repo's .ts sources run directly via type stripping, no
# build step in the payment/read path.
curl -fsSL https://deb.nodesource.com/setup_23.x | bash -
apt-get install -y nodejs

id ubuntu >/dev/null 2>&1 || useradd -m -s /bin/bash ubuntu

sudo -u ubuntu git clone https://github.com/SomeshTalligeriDEV/pactra.git /home/ubuntu/pactra
cd /home/ubuntu/pactra
sudo -u ubuntu npm ci --prefix packages/meter
sudo -u ubuntu npm ci --prefix packages/attest
sudo -u ubuntu npm ci --prefix packages/site
sudo -u ubuntu npm ci --prefix packages/console

mkdir -p /var/www/pactra
chown ubuntu:ubuntu /var/www/pactra

cp ops/systemd/pactra-meter.service ops/systemd/pactra-attest.service /etc/systemd/system/
systemctl daemon-reload

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) bootstrap done — repo cloned, services installed, not started"
echo "remaining, done by hand once (see ops/README.md):"
echo "  1. point DNS at this box's public IP"
echo "  2. umask 077 && \$EDITOR /home/ubuntu/pactra/.env.attest   # PACTRA_ATTEST_KEY=0x..."
echo "  3. sudo certbot --nginx -d pactra.example -d attest.pactra.example"
echo "  4. sudo systemctl enable --now pactra-meter pactra-attest"
echo "  5. ./ops/bin/pactra-publish.sh"
