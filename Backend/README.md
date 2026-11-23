# Excel Assessment Hub

React / TypeScript / Express / tRPC application using MySQL and Prisma.

The project is organized into three top-level folders:

- `Frontend/`: React application and public assets.
- `Backend/`: Express/tRPC server, scripts, tests, and Node tooling.
- `Database/`: Prisma schema, migrations, and archived legacy migrations.

## Local development

- `pnpm dev`: start the development server (default port 3000).
- `pnpm build` / `pnpm start`: build and serve `dist/index.js` and `dist/public/`.
- `pnpm db:migrate`: apply checked-in Prisma migrations.
- `pnpm db:seed:accounts`: create initial development accounts and school-grade setup.
- `pnpm check` / `pnpm test`: run type checking and application tests.

Run commands from `Backend/`. Configure `DATABASE_URL` and `SESSION_SECRET` in the ignored `Backend/.env` file. To seed initial accounts that do not yet exist, provide `INITIAL_ADMIN_PASSWORD`, `INITIAL_TEACHER_PASSWORD` and `INITIAL_STUDENT_PASSWORD` as environment variables for the seed command. The seed script does not print passwords, and temporary account passwords must be changed on first sign-in. Never commit the `.env` file or put credentials in frontend configuration.

The Docker build expects the project root as its context: `docker build -f Backend/Dockerfile .`.

School roles are Admin, Teacher and Student. Student accounts are optional; assessment attempt records may remain anonymous and can be associated with an active student account later. Student history is loaded from MySQL and is empty until results are recorded.

`Backend/server/_core/publicConfig.ts` exposes only named public runtime values. Private keys stay server-side. The platform serves managed `/manus-storage/` assets; the application does not register a second proxy.
