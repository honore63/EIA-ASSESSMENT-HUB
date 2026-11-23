# Excel Assessment Hub — Architecture & Delivery Notes

## System shape

The app is a responsive React/Vite client served by the Express server. tRPC procedures expose the initial `/api/trpc` contract, with the product surface organized as domain routers (`admin`, `assessments`, `assignments`, `analytics`, `school`). MySQL is the primary persistence layer; Prisma manages database access and migrations. Authentication uses local email/password accounts, scrypt password hashes and signed application sessions; OAuth is not required for sign-in.

## ER / relational design

```text
School (tenant)
  ├─ SchoolMembership ─ User ─ TeacherProfile / StudentProfile
  ├─ AcademicYear ─ Term
  ├─ Grade ─ Class ─ ClassEnrollment ─ StudentProfile
  ├─ Subject
  ├─ Assessment ─ AssessmentQuestion ─ Question ─ QuestionOption
  │                └─ Assignment ─ AssignmentTarget ─ Attempt ─ Response
  └─ AuditLog
```

The authoritative schema is `Database/prisma/schema.prisma`, introspected from the copied MySQL database. Its 18 mapped models include schools, users, memberships, academic years, terms, grades, classes, subjects, assessments, questions and options, assignments, attempts and responses, teacher profiles, audit logs, and the retained legacy `__drizzle_migrations` table. Flexible legacy LONGTEXT fields remain strings in Prisma to match the existing MySQL schema.

## Permission matrix

| Capability | Admin | Teacher | Student |
|---|---:|---:|---:|
| Manage school accounts and roles | yes | no | no |
| View school-wide workspace data | yes | no | no |
| Create/edit and publish assessments | yes | yes | no |
| Create and manage assignments | yes | yes | no |
| Record or associate assessment history | yes | yes | no |
| View personal assessment history | no | no | own records |

Admin-created student accounts are optional. Anonymous participant history can be retained without a student account; authenticated student history is filtered by the current user's ID. Every protected procedure validates account status, role and school ownership before reading or mutating data.

## API endpoint plan

The initial tRPC namespaces map to the requested `/api/v1` domains while keeping the starter transport:

- `auth.login`, `auth.me`, `auth.logout`, `auth.changePassword`
- `school.overview`, `school.grades`, `school.classes`, `school.subjects`
- `admin.users`, `admin.createUser`, `admin.updateUser`, `admin.resetPassword`
- `assessments.list`, `assessments.get`, `assessments.create`, `assessments.updateStatus`
- `assignments.list`, `assignments.create`
- `analytics.overview`, `students.history`, `students.recordAttempt`

Future HTTP adapters can expose the same service layer under `/api/v1` for integrations, exports and realtime callbacks. All list procedures accept filters/pagination as they mature and return consistent `{ data, meta }` shapes.

## Environment variables

Managed runtime values: `DATABASE_URL`, `SESSION_SECRET`, `PORT`, and platform service variables. Initial account passwords are supplied only to the seed command through environment variables. Future integrations add server-only AI/storage keys through the project secret manager; no AI or media credentials enter the client bundle.

## Deployment

Preview runs the declared server command on port 3000. Production uses `docker build -f Backend/Dockerfile .`, `/api/health`, and runtime `PORT`. Durable records belong in MySQL; media belongs in the storage abstraction, not MySQL blobs. The frontend can later be split to Vercel only if the backend/realtime service remains separately hosted.

## Technical risks and mitigations

- **Managed database is shared by development, testing and production:** migrations are additive and explicit; destructive changes are deferred.
- **Local password authentication:** scrypt hashing, login throttling, short-lived sessions and forced first-login password changes reduce account risk; recovery and session revocation remain open work.
- **Broad product surface:** Phase 1 deliberately leaves AI import, realtime, scan cards and advanced question types open in TODO rather than shipping dead buttons.
- **Low-connectivity claims:** the UI shows autosave/recovery-ready states but does not advertise offline support until implemented and tested.
- **High-stakes marking:** AI marking is not enabled in Phase 1; teacher review remains the authority.
