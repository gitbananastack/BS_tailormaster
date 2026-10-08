# StitchFlow VPS installation — 8 October 2026

This release contains the latest local project source, including uncommitted changes, and the complete schema generated from prisma/schema.prisma. It is a fresh installation package, not a database backup or an upgrade installer. Dependency versions are preserved by pnpm-lock.yaml.

## Server prerequisites

Use a fresh Ubuntu 22.04, 24.04, or 26.04 LTS VPS with root/sudo SSH access. This installer configures MySQL, Nginx and systemd directly; do not run it on a CloudPanel, OpenLiteSpeed, Docker-template or existing production server. Allow inbound TCP 22 (SSH), 80 (HTTP), and 443 (HTTPS) in the Hostinger VPS firewall and any enabled OS firewall. Keep database port 3306 private. Ensure adequate free memory and disk for a Next.js production build.

Create a DNS A record for your domain pointing to the VPS public IPv4 address. If you use an AAAA record, it must point to this VPS too. Wait for DNS to resolve before installation with HTTPS.

## Upload and install

From your computer, upload the archive (replace SERVER_IP):

```bash
scp stitchflow-hostinger-vps-2026-10-08.tar.gz root@SERVER_IP:/root/
ssh root@SERVER_IP
```

On the VPS:

```bash
cd /root
tar -xzf stitchflow-hostinger-vps-2026-10-08.tar.gz
cd stitchflow-hostinger-vps-2026-10-08
sudo DOMAIN=stitch.example.com LETSENCRYPT_EMAIL=admin@example.com bash install-ubuntu.sh
```

Replace the domain and email above. The installer prompts for an administrator username and password; a blank password generates one. Save the credentials shown at completion. Database credentials and the authentication secret are generated automatically and saved in /opt/stitchflow/.env with restricted permissions.

The installer installs Node.js 22 and pnpm 9, creates the MySQL database, applies the current Prisma schema, records the bundled historical migrations as applied, creates the admin, builds the app and configures the stitchflow service, Nginx and HTTPS. Run from the extracted directory, not /opt/stitchflow. Do not rerun this fresh installer to upgrade or repair a partial installation.

## Verify

```bash
sudo systemctl status stitchflow --no-pager
curl -fsS https://stitch.example.com/api/health
sudo journalctl -u stitchflow -n 100 --no-pager
```

Open the HTTPS domain, sign in, create a sample order and test a QR scan and photo upload. The health endpoint checks the web process only; signing in verifies database access. HTTPS is required for phone camera scanning and mobile app installation.

## Database files

- prisma/schema.prisma: authoritative application schema.
- prisma/schema.mysql.sql: complete MySQL DDL for a new database named stitchflow, with tables, indexes and foreign keys; no user or business data.
- prisma/migrations/: historical incremental changes, included for reference and future migration tracking.

The automated installer creates the schema itself. **Do not import the SQL before or after the automated installation.** The SQL file is an alternative for manual database setup:

```bash
sudo mysql < prisma/schema.mysql.sql
```

A manual installation also needs its own database user, .env, Prisma client generation, migration baselining, admin seed, build, service and reverse proxy. Historical migrations are not a complete initial migration chain; do not run all their SQL files over this full schema.

## Operations and backups

Application: /opt/stitchflow. Service: stitchflow. Database: stitchflow. Default uploads: /opt/stitchflow/public/uploads. Back up the database, uploads and .env securely before future changes. A database-only backup does not include QC photos. For an existing installation, use a separate reviewed upgrade process with a database backup; never use this fresh installer.

```bash
sudo mysqldump --single-transaction --routines --triggers stitchflow > stitchflow-backup.sql
sudo systemctl restart stitchflow
```

No local .env secrets, customer uploads, node_modules, build output or database data are included in this release. Packages must be downloaded and built on the VPS. Ubuntu installation and MySQL import have not been executed against your VPS.

Hostinger reference: https://www.hostinger.com/my/tutorials/deploy-node-js-application/
