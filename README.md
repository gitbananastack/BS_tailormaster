# StitchFlow

QR-based production workflow management for a stitching center. The application includes a responsive production dashboard, a complete MySQL Prisma schema, and the six-stage workflow: Cutting, Fusing, Stitching, Quality Check, Packing, and Delivery.

## Run locally

1. Copy `.env.example` to `.env` and set a MySQL `DATABASE_URL`.
2. Install dependencies with `pnpm install`.
3. Generate the database client with `pnpm db:generate`.
4. Create the first database migration with `pnpm db:migrate -- --name initial_schema`.
5. Start the app with `pnpm dev`.

### SQL-only setup

If you prefer to create the database without Prisma, run `prisma/schema.mysql.sql` with a MySQL account that can create databases:

```bash
mysql -u root -p < prisma/schema.mysql.sql
```

## Hostinger VPS installation

For the VPS package dated 2026-10-08, follow [HOSTINGER-VPS-INSTALL.md](HOSTINGER-VPS-INSTALL.md). The installer targets a fresh Ubuntu 22.04 or 24.04 VPS.

## Hostinger managed Node.js hosting (separate from VPS)

Use a Hostinger Business or Cloud plan with Node.js support.

1. Create a MySQL database and limited application user in hPanel.
2. In Hostinger's Node.js application settings, connect the GitHub repository and set the build command to `pnpm build` and start command to `pnpm start`.
3. Add `DATABASE_URL`, `AUTH_SECRET`, and `APP_URL` under environment variables. Set `APP_URL` to the public HTTPS domain, for example `https://stitching.example.com`, without a trailing slash. QR codes use this domain. Never commit `.env`.
4. Run the Prisma migration against the production database as part of the release process, then deploy.
5. Enable database backups and verify `GET /api/health` after each deployment.

After changing `APP_URL`, restart or redeploy the application and print fresh QR labels. Previously printed QR codes keep the URL that was encoded when they were generated.

## Single-file Ubuntu installation

Copy the project to a fresh Ubuntu 22.04 or 24.04 server, then run:

```bash
chmod +x install-ubuntu.sh
sudo ./install-ubuntu.sh
```

The installer configures Node.js, pnpm, MySQL, Nginx, the database, the initial administrator, the production build, and a `stitchflow` systemd service. To configure the public domain and Let's Encrypt without prompts:

```bash
sudo DOMAIN=stitch.example.com \
  LETSENCRYPT_EMAIL=admin@example.com \
  ADMIN_USERNAME=BSadmin \
  ADMIN_PASSWORD='choose-a-strong-password' \
  ./install-ubuntu.sh
```

Point the domain's DNS record to the Ubuntu server before requesting the certificate. For HTTPS terminated by an external proxy, pass `APP_SCHEME=https` and omit `LETSENCRYPT_EMAIL`.

## Next implementation items

- Authentication and role-based access enforcement
- Order and BOM creation screens
- QR code generation, printing, and camera scanning
- Production-event API with workflow validation and audit history
- Costing, QC/rework, invoices, and reporting

## Multiple roles per login

In **Administration → Users and permissions**, select every role required by a staff
member and click **Save roles**. For example, one account can have QC inspector,
Packing staff, and Delivery coordinator. Assign that same account to each required
order stage under Production ownership. My work follows the active stage.

Apply `20260925_add_user_roles` and `20260925_restore_legacy_access_compatibility`
before deploying this version, then regenerate the Prisma client. Existing users
retain their original role. The legacy `role` column remains synchronized for
compatibility; the `roles` array controls permissions. Legacy screen-access data is
preserved. Run `node --test tests/roles.test.cjs` for permission regression checks.

## Install StitchFlow as a mobile web app

Open `/install` from the **Install app** link in the footer. Android users can
install from Chrome; iPhone and iPad users can use Safari’s **Share → Add to Home
Screen**. The installed app launches in its own window with the same accounts,
roles, and assignments. No separate APK or app-store release is needed.

Mobile installation and camera access require the hosted HTTPS website. Desktop
localhost works for development; an HTTP LAN/IP URL is not sufficient on a phone.
The manifest includes regular and maskable PNG icons and Scan / My work shortcuts.

The service worker caches only public app assets. It never stores authenticated
pages, API results, QC photos, or queued updates. Offline navigation displays a
reconnection screen. A new version prompts the user to save work before choosing
**Update & reload**. Activation clears the older StitchFlow cache.
