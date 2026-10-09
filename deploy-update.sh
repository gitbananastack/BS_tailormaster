#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# Safe in-place updater for an existing StitchFlow VPS installation.
# Run from the Git checkout: sudo ./deploy-update.sh

APP_NAME="${APP_NAME:-stitchflow}"
APP_DIR="${APP_DIR:-/opt/stitchflow}"
DB_NAME="${DB_NAME:-stitchflow}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/stitchflow}"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASELINE_LAST_MIGRATION="20260930_add_invoice_client_snapshot"

die() { echo "ERROR: $*" >&2; exit 1; }
log() { echo; echo "==> $*"; }

[[ "${EUID}" -eq 0 ]] || die "Run with sudo."
[[ -d "${SOURCE_DIR}/.git" ]] || die "Run this script from the StitchFlow Git checkout."
[[ -f "${APP_DIR}/.env" ]] || die "Missing ${APP_DIR}/.env. This updater requires an existing installation."
systemctl cat "${APP_NAME}.service" >/dev/null 2>&1 || die "${APP_NAME}.service is not installed."
command -v git >/dev/null || die "git is not installed."
command -v rsync >/dev/null || die "rsync is not installed."
command -v mysql >/dev/null || die "mysql client is not installed."
command -v mysqldump >/dev/null || die "mysqldump is not installed."
command -v pnpm >/dev/null || die "pnpm is not installed."
command -v curl >/dev/null || die "curl is not installed."

SOURCE_OWNER="$(stat -c '%U' "${SOURCE_DIR}")"
APP_USER="$(systemctl show "${APP_NAME}.service" -p User --value)"
[[ -n "${APP_USER}" ]] || die "The service has no configured user."
APP_GROUP="$(systemctl show "${APP_NAME}.service" -p Group --value)"
[[ -n "${APP_GROUP}" ]] || APP_GROUP="${APP_USER}"
APP_HOME="$(getent passwd "${APP_USER}" | cut -d: -f6)"
[[ -n "${APP_HOME}" ]] || die "Cannot determine the home directory for ${APP_USER}."
PNPM_BIN="$(command -v pnpm)"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
SERVICE_WAS_ACTIVE=0

run_as_app() {
  runuser -u "${APP_USER}" -- env HOME="${APP_HOME}" "${PNPM_BIN}" --dir "${APP_DIR}" "$@"
}

finish() {
  result=$?
  trap - EXIT
  if [[ ${result} -ne 0 && ${SERVICE_WAS_ACTIVE} -eq 1 ]]; then
    echo "Update failed; attempting to restart the existing service." >&2
    systemctl start "${APP_NAME}" || true
  fi
  exit "${result}"
}
trap finish EXIT

log "Pulling the latest main branch"
runuser -u "${SOURCE_OWNER}" -- git -C "${SOURCE_DIR}" pull --ff-only origin main

log "Backing up the database, environment, and QC uploads"
mkdir -p "${BACKUP_DIR}/${STAMP}"
mysqldump --protocol=socket --single-transaction --routines --triggers "${DB_NAME}" | gzip > "${BACKUP_DIR}/${STAMP}/${DB_NAME}.sql.gz"
install -m 600 "${APP_DIR}/.env" "${BACKUP_DIR}/${STAMP}/application.env"
if [[ -d "${APP_DIR}/public/uploads" ]]; then
  tar -czf "${BACKUP_DIR}/${STAMP}/uploads.tar.gz" -C "${APP_DIR}/public" uploads
fi

if systemctl is-active --quiet "${APP_NAME}"; then
  SERVICE_WAS_ACTIVE=1
  log "Stopping ${APP_NAME} for deployment"
  systemctl stop "${APP_NAME}"
fi

log "Copying application files while preserving secrets and uploaded photos"
rsync -a --delete --chown="${APP_USER}:${APP_GROUP}" \
  --exclude '.git' \
  --exclude '.env' --exclude '.env.*' \
  --exclude 'node_modules' --exclude '.next' --exclude '.next-*' \
  --exclude 'public/uploads' --exclude 'output' --exclude 'tmp' \
  "${SOURCE_DIR}/" "${APP_DIR}/"

log "Installing locked dependencies and generating the database client"
run_as_app install --frozen-lockfile
run_as_app exec prisma generate

MIGRATION_TABLE="$(mysql --protocol=socket --batch --skip-column-names -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}' AND table_name='_prisma_migrations';")"
if [[ "${MIGRATION_TABLE}" == "0" ]]; then
  TABLE_COUNT="$(mysql --protocol=socket --batch --skip-column-names -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}';")"
  [[ "${TABLE_COUNT}" == "16" ]] || die "Database has no Prisma history and ${TABLE_COUNT} tables instead of the expected 16. Review it manually. Backup: ${BACKUP_DIR}/${STAMP}"
  log "Recording the known manual-schema baseline"
  while IFS= read -r migration_path; do
    migration_name="$(basename "${migration_path}")"
    run_as_app exec prisma migrate resolve --applied "${migration_name}"
    [[ "${migration_name}" == "${BASELINE_LAST_MIGRATION}" ]] && break
  done < <(find "${APP_DIR}/prisma/migrations" -mindepth 1 -maxdepth 1 -type d | sort)
fi

log "Applying pending database migrations"
run_as_app exec prisma migrate deploy

log "Building and starting StitchFlow"
run_as_app build
systemctl start "${APP_NAME}"
SERVICE_WAS_ACTIVE=0

for _attempt in {1..20}; do
  if curl -fsS http://127.0.0.1:3000/api/health >/dev/null; then
    systemctl is-active --quiet nginx && nginx -t >/dev/null
    echo
    echo "Update completed successfully."
    echo "Backup: ${BACKUP_DIR}/${STAMP}"
    echo "Nginx configuration and public/uploads were preserved."
    exit 0
  fi
  sleep 1
done

die "The service started but its health check failed. Run: journalctl -u ${APP_NAME} -n 100 --no-pager"
