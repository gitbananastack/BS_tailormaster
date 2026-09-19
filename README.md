# StitchFlow

QR-based production workflow management for a stitching center. The initial foundation includes a responsive production dashboard, a MySQL Prisma schema, and the core workflow model: Cutting, Stitching, Quality Check, Packing, and Delivery.

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

## Hostinger deployment

Use a Hostinger Business or Cloud plan with Node.js support.

1. Create a MySQL database and limited application user in hPanel.
2. In Hostinger's Node.js application settings, connect the GitHub repository and set the build command to `pnpm build` and start command to `pnpm start`.
3. Add `DATABASE_URL` and `AUTH_SECRET` under environment variables. Never commit `.env`.
4. Run the Prisma migration against the production database as part of the release process, then deploy.
5. Enable database backups and verify `GET /api/health` after each deployment.

## Next implementation items

- Authentication and role-based access enforcement
- Order and BOM creation screens
- QR code generation, printing, and camera scanning
- Production-event API with workflow validation and audit history
- Costing, QC/rework, invoices, and reporting
