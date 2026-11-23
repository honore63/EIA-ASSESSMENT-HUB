# EIA Assessment Hub

React / TypeScript / Express / tRPC application backed by MySQL and Prisma.

## Repository layout

- `Frontend/` — React application and public assets
- `Backend/` — Express/tRPC server, scripts, tests, and Node tooling
- `Database/` — Prisma schema, migrations, and archived legacy migrations
- `client/` — legacy client placeholder

## Getting started

See [`Backend/README.md`](Backend/README.md) for setup, development commands, and deployment notes.

Configuration belongs in the ignored `Backend/.env` file (`DATABASE_URL` and `SESSION_SECRET`). Never commit credentials or environment files.
