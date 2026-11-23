# Excel Assessment Hub — Delivery Checklist

## Current audit priority

1. [x] Replace demo runtime inserts with school/account setup. Runtime workspace reads no longer fabricate demo assessments, assignments or teacher approvals.
2. [x] Simplify school roles to Admin, Teacher and Student. Migration maps existing elevated staff roles to Admin and guests to Student.
3. [x] Add local email/password authentication with scrypt hashes, temporary-password change enforcement, short-lived sessions, status checks and login throttling.
4. [x] Add Admin account listing, creation, role/status updates and password resets; sensitive account changes are audited.
5. [x] Add optional student accounts, persistent attempt/response tables, student-scoped assessment history and APIs to record/link historical results.
6. [ ] Complete student assessment taking, answer review permissions, live/guest participation, assignment targeting and marking workflows.
7. [ ] Add password recovery, session revocation after password reset, real-MySQL permission/isolation tests and browser E2E tests.

## Verification baseline

- `npm run check`: passed.
- `npm test`: 13 tests passed.
- `npm run build`: passed; Vite reports the existing `/api/platform/config.js` non-module script warning.
- `npm run db:migrate`: migrations applied successfully to the configured local database.
- `/api/health`: returned `{"status":"ok"}` on port 3000.

## Phase 1 foundation: secure workspace and school structure

- [x] The platform supports configurable academic years, terms, grade levels, classes, sections, subjects, departments and teachers for a school/tenant-aware architecture.
- [x] The data model uses MySQL as the primary database with normalized relational tables, foreign keys, indexes, timestamps, tenant identifiers and audit-ready fields.
- [x] The app provides a role-aware authenticated workspace foundation, with school membership records, backend-enforced teacher/admin mutation boundaries and tenant-scoped queries.
- [x] The application role model contains only Admin, Teacher and Student; Admin-created accounts are active, while optional student accounts remain supported.
- [x] Initial Admin, Teacher and Student development accounts are provisioned by `pnpm db:seed:accounts` from environment-only temporary passwords; only password hashes are stored, and first login requires a change.
- [ ] Optional teacher self-registration, password recovery and secure session revocation remain unimplemented.

## Phase 1 assessment MVP

- [ ] Teachers can start blank, paste text, use a template, duplicate an assessment or select reusable questions from the question bank entry point.
- [ ] Assessment metadata supports title, description, instructions, subject, grade, class, topic, curriculum, learning objectives, assessment type, difficulty, duration, marks, tags, feedback, visibility and publication settings.
- [x] The editor supports a question/section navigator, editing canvas, settings panel, draft state, validation and the first-question creation path.
- [x] Core question types are implemented in the creation contract: multiple-choice single answer, multiple-select with partial credit, true/false, short answer, numerical answer and fill-in-the-blank.
- [x] Questions support marks, answer settings, explanations and persisted answer-key/settings fields; richer feedback, hints, objectives and tags remain open for the next increment.
- [ ] Published assessments can be assigned to classes or individual students with dates, due date, time limit, attempts, feedback, marks, visibility and submission rules.

## Student and analytics path

- [ ] Students can see available, upcoming, in-progress, completed and overdue assignments; live activities; results; feedback; progress and recommendations.
- [x] Registered students can query their own completed assessment history; cross-student records are excluded by the database query.
- [x] Attempts can be associated with student accounts or retained as anonymous participant history; Admin/Teacher associations are audit logged.
- [ ] Students can answer one question at a time, save, submit, and review released answers; assessment-taking and answer-release settings remain open.
- [ ] The marking path supports exact/case-insensitive text, MCQ, multi-select partial credit, true/false and numeric tolerance/ranges/units, with teacher override-ready score fields.
- [ ] Initial analytics expose average, high, low, median, completion, pass rate, correct/incorrect/skipped, time, question performance and topic mastery.

## Phase 2+ roadmap retained as open outcomes

- [ ] Add personal/shared question bank collections, tags, search, filters, sharing and independent copies with version history.
- [ ] Add live classroom sessions with unique code, QR/link join, waiting room, teacher controls, persisted state and realtime reconnection.
- [ ] Add AI assessment generation and PDF/DOCX/PPTX/TXT/image/scanned-document import with extraction, OCR, uncertainty flags and mandatory teacher review.
- [ ] Add advanced question types, rubric marking, interactive lesson mode, EXCEL SCAN response cards, analytics exports, remediation recommendations and Cambridge objective progression.
- [ ] Add unit, integration, API, component and end-to-end tests against a real test database; verify permissions, marking, assignments, student submissions, realtime recovery and security.
- [ ] Maintain README, overview, architecture, database schema, API docs, roles/permissions, assessment engine, question types, AI/document processing, live classroom, security, deployment, roadmap and status documentation.
