# Excel Assessment Hub — Phase 1 Plan

## Implementation approach

Build the first usable release as a React/TypeScript + Express/tRPC + MySQL/Prisma web application with local email/password accounts. The product uses a tenant-aware relational schema for schools, memberships, academic structure, assessments, questions and assignments. The MVP favors a stable Admin/Teacher workflow over broad unfinished modules.

Phase 1 outcomes:
- polished public shell and role-aware Admin, Teacher and optional Student workspaces;
- school/tenant, academic year, grade, class and subject data model;
- Admin account management and membership-aware permission boundaries;
- assessment studio for core question types with drafts, publishing and assignment setup;
- optional student accounts, personal assessment history and analytics-ready result summaries;
- documentation of the complete roadmap, explicit blockers and untested areas.

MySQL is the authoritative database and Prisma is the application ORM and migration tool. The schema is normalized with foreign keys, tenant identifiers, timestamps, indexes and soft-delete-ready status fields.

## Project structure

- `Frontend/src/App.tsx`: route map and application shell.
- `Frontend/src/pages/`: dashboard, assessments, studio, and supporting pages.
- `Frontend/src/components/`: reusable navigation, stat cards, data tables, and form UI.
- `Frontend/src/index.css`: brand tokens, layout primitives, and responsive styling.
- `Backend/server/routers.ts`: versioned product procedures exposed through tRPC.
- `Backend/server/db.ts`: database client and tenant-aware query helpers.
- `Database/prisma/schema.prisma`: authoritative MySQL schema.
- `Database/prisma/migrations/`: Prisma migration history.
- `Backend/docs/architecture.md`: ER design, permissions, endpoint plan, deployment strategy and risks.
- `Frontend/public/manus-routes.json`: source-of-truth page route manifest for Preview and publication.

## Design direction

### Distinct style options

1. **Editorial campus / warm intelligence** — 0.06 probability.
2. **Midnight control room / neon data** — 0.03 probability.
3. **Quiet Swiss learning lab / paper + signal** — 0.02 probability.

### Chosen direction: Editorial campus / warm intelligence

- **Design Movement:** Contemporary editorial dashboard with school-yearbook warmth, restrained neo-brutal utility and crisp data typography.
- **Core Principles:** calm hierarchy, unmistakable actions, human progress signals, and high information density without visual noise.
- **Color Philosophy:** deep ink navy grounds trust; warm parchment keeps the learning space human; marigold marks momentum; sea-glass teal signals progress and live activity.
- **Layout Paradigm:** a left rail anchors the workspace while content opens into offset editorial bands: a welcome statement, action rail, metric strip, and split operational panels instead of a centered card grid.
- **Signature Elements:** oversized chapter numerals, pill-shaped status stamps, and a small “signal line” motif for progress and live events.
- **Interaction Philosophy:** actions feel like moving a lesson forward; destructive or high-impact actions ask for explicit confirmation; status changes are visible in text, not color alone.
- **Animation:** short 160–220ms fades and slides for panel transitions, a restrained live-pulse on active session indicators, and no motion required to understand content.
- **Typography System:** Fraunces for display headlines, DM Sans for interface copy, tight uppercase labels for metadata, generous 1.5 line-height for instructional text.
- **Brand Essence:** the assessment workspace where every answer becomes the next useful teaching move; thoughtful, assured, energizing.
- **Brand Voice:** headlines are direct and optimistic; CTAs use active verbs. Example lines: “Turn today’s answers into tomorrow’s plan.” / “Open the studio and make the next question count.”
- **Wordmark & Logo:** a compact “EA” monogram built from two offset rectangular answer cards, paired with the EXCEL ASSESSMENT HUB wordmark.
- **Signature Brand Color:** Marigold `#F4B942`, used as the ownable momentum color against ink navy `#12233F`.

## Delivery strategy

Run the development server on port 3000 against the configured local MySQL database. Keep the public route manifest synchronized and run TypeScript diagnostics, tests, migrations and the production build before delivery. Publication remains off unless explicitly enabled by the project owner.
