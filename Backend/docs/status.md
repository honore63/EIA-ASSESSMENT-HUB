# Excel Assessment Hub — Status

## Verified

The project has a React/TypeScript + Express/tRPC application with a responsive workspace, read-only public preview, MySQL/Prisma schema, assessment creation for six MVP question types, draft persistence, publishing, analytics views, route manifest and health endpoint.

The current role/account implementation includes:

- Admin, Teacher and Student as the only application roles. Migration `0002_wonderful_night_nurse` maps prior staff roles to Admin and guest membership to Student before narrowing the MySQL enums.
- Local email/password sign-in using scrypt password hashes, signed 12-hour sessions, local-development-compatible cookies, generic credential errors and per-account/IP throttling.
- Initial accounts provisioned by `pnpm db:seed:accounts` from environment-only temporary passwords. Passwords are not hardcoded in source or stored in plaintext; first login requires a change.
- Admin account listing, creation, role/status updates and password resets. Account changes and password actions are audit logged.
- Admin overview metrics are loaded from account-scoped database counts; teacher-approval workflow and fabricated approval samples are not shown.
- Optional student accounts, persistent attempt/response tables, student-scoped completed assessment history, and Admin/Teacher APIs to record or associate historical results.
- Runtime workspace loading no longer inserts sample assessments, assignments or teacher approvals.

The Prisma-compatible `eia_assessment_hub` database was copied from the original `eia assessment hub` database; the original was left unchanged. Prisma reports the copied database is up to date, and the 13 backend tests pass. The current type check still reports existing Frontend integration/type errors, and the production build stops on a default-export mismatch in `TeacherDashboard.tsx`; the health endpoint has not been reverified after the folder move.

## Remaining work

Student assessment taking/submission, answer-release settings, password recovery, session revocation after password reset, assignment targeting, realtime classroom, AI/document import, and real-MySQL/browser permission tests are incomplete. Student history is database-backed and displays no fabricated results; it remains empty until attempts are recorded or imported.

Teacher self-registration and email verification, full assessment editing/reordering/preview, question-bank collections, advanced question types, EXCEL SCAN, exports and remediation recommendations remain open in `TODO.md`. No offline capability or camera scanning support is advertised.

## Implementation note

Prisma is the application ORM and migration tool for MySQL. Local email/password login is the configured sign-in path; OAuth is not required.
