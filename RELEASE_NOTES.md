# StitchFlow Release Notes

## 2026.10 — Stage handoff and concurrent-update performance

- A completed stage now hands the order to the next stage as **Ready** (`CREATED`) instead of starting work automatically.
- The completed stage's ETA is cleared at handoff; the next operator enters a new ETA for their own stage.
- A stage's first status update must be **In Progress** before it can be completed, held, cancelled, or skipped.
- Simultaneous updates to the same order detect a stale stage and return a refresh message instead of overwriting another user's transition.
- Added an index for order, stage, worker, and update time, and limited large histories loaded by production screens.

## 2026.09 — Production workflow and billing release

Release date: 30 September 2026

This release expands StitchFlow into a six-stage production workflow, improves multi-user shop-floor operation, separates billing into focused screens, and prepares QR tracking and the PWA for public-domain hosting.

### Production workflow

- Added **Fusing** between Cutting and Stitching.
- Added the dedicated **Fusing Operator** user role and assignment permission.
- Fusing supports **In Progress**, **Completed**, **On Hold**, and **Not Required**.
- Completing Fusing advances the order to Stitching.
- Marking Fusing as Not Required skips it and advances directly to Stitching.
- Existing orders are recorded as Fusing Not Required so their current workflow is not interrupted.
- Dashboards, filters, tracking timelines, order cards, QR views, manager notes, and labor-cost screens now show the six-stage workflow.

### Roles and production assignments

- One login can hold multiple roles, including QC, packing, delivery, cutting, fusing, and tailoring.
- User management provides multi-role creation, editing, filtering, activation, password reset, and WhatsApp number management.
- A job order can be assigned to multiple tailors.
- Each tailor records their own Stitching status independently.
- Stitching advances only after every assigned tailor completes their work.
- Admin and Order Manager users can review each tailor's status and history by design number.
- Order WhatsApp actions support multiple assigned tailors.
- Replaced the long sidebar role text with a compact clickable profile that reveals the signed-in user’s name, username, mobile number, and assigned roles.

### QC and rework

- Added styled QR/QC result screens with design numbers shown prominently.
- QC rework can target selected design numbers and selected assigned tailors.
- Rework instructions and comments remain visible to the relevant workers, managers, and administrators.
- Role and assignment checks continue to protect every production-stage update.

### Client billing

- Split Client Billing into a clear **Billing view** and a separate **Create bill** screen.
- Added searchable job-order text-box dropdowns for bill creation and invoice filtering.
- Added an editable Bill To preview with client name, phone, billing address, and GSTIN.
- Invoice client details are stored as a snapshot so later customer changes do not alter an existing bill.
- Billing line items now show each design number once.
- Added invoice editing for job order, client details, GSTIN, line items, rates, quantities, GST, due date, and notes.
- Long billing addresses are normalized and limited to two lines in invoice PDFs so they never overlap the GSTIN area.
- Editing preserves the invoice number, share token, and existing public PDF link.
- Added invoice status management, order filtering, PDF viewing, link copying, and WhatsApp sharing.
- Fixed bill-link copying on browsers that block the modern Clipboard API, added a compatibility fallback, and ensured copied links use the configured public application domain.
- Tailor labor billing remains available; unrelated internal billing options were removed.
- Admin and Order Manager accounts that also hold the Tailor role can be assigned stitching amounts and accept or request correction on their own amounts from the same login.

### Orders, dashboard, and navigation

- Added standard search, status filters, stage filters, and pagination across primary list screens.
- Reduced order-card density and aligned it with the dashboard layout.
- Dashboard order activity is limited to the five latest matching orders with order-only scrolling.
- Added production charts and compact responsive dashboard presentation.
- Dashboard metrics, charts, queues, and latest orders now use a rolling 30-day data window.
- Simplified the dashboard by removing the embedded order list and tailor-history shortcut, keeping My Work prominent, and adding pictorial quick actions plus live hold, QC rework, and completion signals.
- Design numbers are prioritized in scan, tracking, work, and manager views.
- Added an easier searchable multi-tailor selector for teams with more than ten tailors.

### Reports and Excel exports

- Replaced the duplicate Productivity-based Reports link with a dedicated Reports hub.
- Added an Orders and Payments report with current-versus-previous-month comparisons for orders, garments, invoice value, and paid value.
- Reworked the Orders and Payment Status comparison into pictorial paired-bar cards with metric icons, exact values, and percentage movement.
- Added current month, previous month, and inclusive custom-date views with order-level payment status.
- Added a Tailor Billing report with proposed amounts, accepted amounts, acceptance status, design numbers, and linked order billing details.
- Added genuine `.xlsx` exports for both report modules with filters, frozen headers, formatted dates and currency, and the selected reporting period.

### Productivity monitoring

- Added Productivity as a separately assignable screen permission when creating or editing users; administrators and order managers retain automatic access.
- Added monthly bar charts for orders received and paid client invoices, with current-year and previous-year views.
- Added rolling 30-day completion, output, overdue, on-hold, QC rework, workload, stage bottleneck, and worker performance indicators.
- Added focused operational suggestions for balancing workflow, protecting due dates, reducing rework, and recognizing worker output.

### Raw materials

- Restored raw-material cost entry and display.
- Material quantity, unit, color, panna, item code, and cost are retained with each order.

### Progressive Web App

- Added an installable lightweight web app experience for Android, iPhone, and desktop browsers.
- Added application icons, manifest, install screen, offline fallback, and safe service-worker update handling.
- Authenticated pages, order data, API responses, and QC photos are not cached for offline access.

### QR codes and hosted domains

- QR labels use the configured public application origin.
- Set the production environment variable below to the deployed HTTPS domain without a trailing slash:

```env
APP_URL=https://your-domain.example
```

- When a private IP is accidentally left configured in production, StitchFlow prefers the public HTTPS host forwarded by the deployment proxy.
- Restart or redeploy after changing `APP_URL`.
- Print fresh labels after deployment. Previously printed QR codes retain the IP address or domain encoded when they were generated.

### Required production environment variables

```env
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/DATABASE
AUTH_SECRET=replace-with-a-long-random-secret
APP_URL=https://your-domain.example
```

Keep production secrets in the hosting provider's environment-variable settings. Do not commit production `.env` files.

### Ubuntu installer

The release includes `install-ubuntu.sh`, a single installer for a fresh Ubuntu 22.04 or 24.04 server. It installs Node.js, pnpm, MySQL, Nginx, the database schema, an initial administrator, the production build, and a systemd service. It can also request and configure a Let's Encrypt certificate when `DOMAIN` and `LETSENCRYPT_EMAIL` are supplied.

### Database upgrade

Existing installations must apply every pending migration in `prisma/migrations` and regenerate the Prisma client:

```bash
npx prisma migrate deploy
npx prisma generate
```

This release includes migrations for:

- multiple roles per user and legacy access compatibility;
- restored design codes;
- multiple Stitching tailors;
- restored raw-material cost;
- QC rework design and tailor scope;
- Fusing stage and Not Required status;
- Fusing Operator role;
- invoice client-detail and GSTIN snapshots.

The complete fresh-install schema is available at `prisma/schema.mysql.sql`. It is generated from `prisma/schema.prisma` and now includes all 16 current application tables, enums, indexes, and foreign keys. Use it only for a new database:

```bash
mysql -u root -p < prisma/schema.mysql.sql
```

Do not run the full schema file over an existing database; use Prisma migrations instead.

### Validation

- Prisma schema validation passes.
- TypeScript type checking passes.
- Production Next.js build passes.
- The automated suite contains 27 passing tests, including permissions, Fusing access, hosted QR origin selection, report periods, PWA cache safety, search, pagination, order validation, and scan routing.
