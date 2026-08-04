#!/bin/bash
# Install the boot-time wake-up on a wireless Reachy Mini.
#
#   scp -r robot/autostart pollen@<robot>:/tmp/ && ssh pollen@<robot> 'sudo bash /tmp/autostart/install.sh'
#
# Idempotent: running it again just refreshes the two files.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

install -m 0755 "$here/mirrorbuddy-autostart.sh" /usr/local/bin/mirrorbuddy-autostart.sh
install -m 0644 "$here/mirrorbuddy-autostart.service" /etc/systemd/system/mirrorbuddy-autostart.service

systemctl daemon-reload
systemctl enable mirrorbuddy-autostart.service

echo "Installed. It will run on the next boot; to try it now:"
echo "  sudo systemctl start mirrorbuddy-autostart.service"
