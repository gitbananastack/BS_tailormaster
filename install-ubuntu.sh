#!/usr/bin/env bash
set -Eeuo pipefail

# StitchFlow single-file installer for Ubuntu 22.04/24.04.
# Run from the project directory:
#   sudo bash install-ubuntu.sh
# Non-interactive example:
#   sudo DOMAIN=stitch.example.com LETSENCRYPT_EMAIL=admin@example.com \
#     ADMIN_USERNAME=BSadmin ADMIN_PASSWORD='change-me-now' bash install-ubuntu.sh

APP_NAME="stitchflow"
APP_USER="${APP_USER:-stitchflow}"
APP_DIR="${APP_DIR:-/opt/stitchflow}"
APP_PORT="${APP_PORT:-3000}"
DB_NAME="${DB_NAME:-stitchflow}"
DB_USER="${DB_USER:-stitchflow_app}"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

die() { echo "ERROR: $*" >&2; exit 1; }
log() { echo; echo "==> $*"; }
random_value() { openssl rand -hex "$1"; }

[[ "${EUID}" -eq 0 ]] || die "Run this installer with sudo."
source /etc/os-release
[[ "${ID}" == "ubuntu" && ( "${VERSION_ID}" == "22.04" || "${VERSION_ID}" == "24.04" ) ]] || die "Use a fresh Ubuntu 22.04 or 24.04 VPS."
[[ ! -e "${APP_DIR}/.env" && ! -e /etc/systemd/system/stitchflow.service ]] || die "Existing installation detected. This installer is for fresh servers only."
[[ "${APP_USER}" =~ ^[a-z_][a-z0-9_-]*$ ]] || die "Invalid APP_USER."
[[ "${APP_DIR}" =~ ^/[A-Za-z0-9_/-]+$ && "${APP_DIR}" != "/" && "${APP_DIR}" != "${SOURCE_DIR}" ]] || die "Use a separate absolute APP_DIR containing only letters, numbers, underscores, slashes or hyphens."
[[ -f "${SOURCE_DIR}/package.json" && -f "${SOURCE_DIR}/prisma/schema.prisma" ]] || die "Place this file in the StitchFlow project folder before running it."
[[ "${APP_PORT}" =~ ^[0-9]+$ && "${APP_PORT}" -ge 1024 && "${APP_PORT}" -le 65535 ]] || die "APP_PORT must be a number."
[[ "${DB_NAME}" =~ ^[A-Za-z0-9_]+$ ]] || die "DB_NAME may contain only letters, numbers, and underscores."
[[ "${DB_USER}" =~ ^[A-Za-z0-9_]+$ ]] || die "DB_USER may contain only letters, numbers, and underscores."

if [[ -z "${DOMAIN:-}" && -t 0 ]]; then read -r -p "Public domain (leave blank to use this server's IP): " DOMAIN; fi
DOMAIN="${DOMAIN:-}"
DOMAIN="${DOMAIN#http://}"; DOMAIN="${DOMAIN#https://}"; DOMAIN="${DOMAIN%/}"
if [[ -n "${DOMAIN}" && ! "${DOMAIN}" =~ ^[A-Za-z0-9.-]+$ ]]; then die "DOMAIN must be a hostname such as stitch.example.com."; fi

if [[ -z "${ADMIN_USERNAME:-}" && -t 0 ]]; then read -r -p "Initial admin username [BSadmin]: " ADMIN_USERNAME; fi
ADMIN_USERNAME="${ADMIN_USERNAME:-BSadmin}"
if [[ -z "${ADMIN_PASSWORD:-}" && -t 0 ]]; then
  read -r -s -p "Initial admin password (leave blank to generate): " ADMIN_PASSWORD; echo
fi
ADMIN_PASSWORD="${ADMIN_PASSWORD:-$(random_value 12)}"
[[ ${#ADMIN_PASSWORD} -ge 8 ]] || die "ADMIN_PASSWORD must contain at least 8 characters."

DB_PASSWORD="${DB_PASSWORD:-$(random_value 16)}"
[[ "${DB_PASSWORD}" =~ ^[A-Za-z0-9_]+$ ]] || die "DB_PASSWORD may contain only letters, numbers, and underscores. Omit it to generate a secure value."
AUTH_SECRET="${AUTH_SECRET:-$(random_value 32)}"
[[ "${AUTH_SECRET}" =~ ^[A-Za-z0-9_-]{32,}$ ]] || die "AUTH_SECRET must be at least 32 letters, numbers, underscores or hyphens."

log "Installing Node.js, MySQL, Nginx, and required tools"
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl gnupg nginx mysql-server openssl rsync sudo
if ! command -v node >/dev/null || [[ "$(node -p 'Number(process.versions.node.split(`.`)[0])')" -ne 22 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
npm install --global pnpm@9
systemctl enable --now mysql nginx

TABLE_COUNT="$(mysql --protocol=socket --batch --skip-column-names -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}' AND table_name <> '_prisma_migrations';")"
[[ "${TABLE_COUNT}" == "0" ]] || die "Database ${DB_NAME} already contains tables. This fresh-install script stopped without changing its schema. Use the release migration instructions for an existing installation."

log "Creating the application account and copying files"
if ! id "${APP_USER}" >/dev/null 2>&1; then useradd --system --create-home --home-dir "/var/lib/${APP_USER}" --shell /usr/sbin/nologin "${APP_USER}"; fi
mkdir -p "${APP_DIR}"
rsync -a --delete \
  --exclude '.git' --exclude '.env' --exclude '.env.local' --exclude '.next' \
  --exclude '.next-stale-*' --exclude 'node_modules' --exclude '*.log' \
  --exclude '.env.*' --exclude 'public/uploads' --exclude 'output' --exclude 'tmp' \
  "${SOURCE_DIR}/" "${APP_DIR}/"
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

log "Creating the MySQL database and least-privilege user"
mysql --protocol=socket <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL


if [[ -n "${DOMAIN}" ]]; then
  if [[ -n "${APP_SCHEME:-}" ]]; then
    [[ "${APP_SCHEME}" == "http" || "${APP_SCHEME}" == "https" ]] || die "APP_SCHEME must be http or https."
  elif [[ -n "${LETSENCRYPT_EMAIL:-}" ]]; then APP_SCHEME="https"
  else APP_SCHEME="http"
  fi
  APP_URL="${APP_SCHEME}://${DOMAIN}"
else
  SERVER_IP="$(hostname -I | awk '{print $1}')"
  [[ -n "${SERVER_IP}" ]] || SERVER_IP="127.0.0.1"
  APP_URL="http://${SERVER_IP}"
fi

cat > "${APP_DIR}/.env" <<ENV
DATABASE_URL="mysql://${DB_USER}:${DB_PASSWORD}@localhost:3306/${DB_NAME}"
AUTH_SECRET="${AUTH_SECRET}"
APP_URL="${APP_URL}"
NODE_ENV="production"
ENV
chown "${APP_USER}:${APP_USER}" "${APP_DIR}/.env"
chmod 600 "${APP_DIR}/.env"

log "Installing application packages and creating the current database schema"
sudo -u "${APP_USER}" bash -lc "cd '${APP_DIR}' && pnpm install --frozen-lockfile && pnpm exec prisma generate && pnpm exec prisma db push"

log "Recording the bundled migrations as the fresh-install baseline"
while IFS= read -r migration; do
  migration_name="$(basename "${migration}")"
  sudo -u "${APP_USER}" bash -lc "cd '${APP_DIR}' && pnpm exec prisma migrate resolve --applied '${migration_name}'" >/dev/null
done < <(find "${APP_DIR}/prisma/migrations" -mindepth 1 -maxdepth 1 -type d | sort)

log "Creating the initial administrator and production build"
sudo -u "${APP_USER}" env ADMIN_USERNAME="${ADMIN_USERNAME}" ADMIN_INITIAL_PASSWORD="${ADMIN_PASSWORD}" bash -lc "cd '${APP_DIR}' && pnpm seed:admin"
sudo -u "${APP_USER}" bash -lc "cd '${APP_DIR}' && pnpm build"

log "Creating the systemd service"
cat > "/etc/systemd/system/${APP_NAME}.service" <<SERVICE
[Unit]
Description=StitchFlow production application
After=network.target mysql.service
Requires=mysql.service

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=/usr/bin/node ${APP_DIR}/node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port ${APP_PORT}
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
SERVICE
systemctl daemon-reload
systemctl enable --now "${APP_NAME}"

log "Configuring Nginx"
SERVER_NAME="${DOMAIN:-_}"
cat > "/etc/nginx/sites-available/${APP_NAME}" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${SERVER_NAME};
    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX
ln -sfn "/etc/nginx/sites-available/${APP_NAME}" "/etc/nginx/sites-enabled/${APP_NAME}"
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

if [[ -n "${DOMAIN}" && -n "${LETSENCRYPT_EMAIL:-}" ]]; then
  log "Enabling HTTPS with Let's Encrypt"
  apt-get install -y certbot python3-certbot-nginx
  certbot --nginx --non-interactive --agree-tos --redirect -m "${LETSENCRYPT_EMAIL}" -d "${DOMAIN}"
elif [[ -n "${DOMAIN}" ]]; then
  echo "HTTPS was not requested. After DNS points to this server, run:"
  echo "  sudo apt-get install -y certbot python3-certbot-nginx"
  echo "  sudo certbot --nginx -d ${DOMAIN}"
  echo "After enabling HTTPS, change APP_URL in ${APP_DIR}/.env to https://${DOMAIN} and restart ${APP_NAME}."
fi

systemctl --no-pager --full status "${APP_NAME}" | sed -n '1,12p'

echo
echo "StitchFlow installation completed."
echo "Application: ${APP_URL}"
echo "Admin username: ${ADMIN_USERNAME}"
echo "Admin password: ${ADMIN_PASSWORD}"
echo "Application directory: ${APP_DIR}"
echo "Service commands: sudo systemctl status|restart ${APP_NAME}"
echo "Save the displayed admin password now and change it after the first login."
