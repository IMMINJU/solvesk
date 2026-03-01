# Contributing to Solvesk

Thanks for your interest in contributing! This guide will help you get started.

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for PostgreSQL)

### Getting Started

```bash
# Clone the repo
git clone https://github.com/your-org/solvesk.git
cd solvesk

# Install dependencies
pnpm install

# Start PostgreSQL
docker compose up -d postgres

# Copy environment file
cp .env.example .env
# Edit .env with your local settings

# Push database schema
pnpm db:push

# Seed demo data
pnpm db:seed

# Start dev server
pnpm dev
```

Open http://localhost:3000 and sign in with `admin@demo.com` / `password123`.

## Project Structure

```
src/
  app/              # Next.js App Router (pages, API routes)
  features/         # Feature modules (issue, project, user, notification, label, dashboard)
  components/       # Shared UI components
  lib/              # Cross-cutting utilities (auth, permissions, errors)
  db/               # Drizzle ORM schema and migrations
  config/           # App configuration
  i18n/             # Internationalization
  services/         # Service barrel exports
messages/           # i18n translation files
```

## Tech Stack

- **Framework**: Next.js (App Router)
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: NextAuth.js
- **UI**: Tailwind CSS + shadcn/ui
- **State**: Zustand (UI) + React Query (server)

## Coding Guidelines

- No `any` types
- No hardcoded colors — use semantic tokens from `globals.css`
- No magic numbers — use constants from `src/config/` or `src/lib/constants/`
- Always check permissions for API routes (use `withAuth` HOF)
- Always filter internal comments for Customer role
- Run `npx tsc --noEmit` before submitting a PR

## Testing

Solvesk uses a 3-tier test strategy. New features and bug fixes should include tests.

```bash
pnpm test                # Unit tests (Vitest)
pnpm test:integration    # Integration tests (real DB)
pnpm test:e2e            # E2E tests (Playwright)
```

### What to test

| Change type                | Required tests                                     |
| -------------------------- | -------------------------------------------------- |
| Service logic              | Unit test (Vitest, mocked DB)                      |
| Permission/isolation logic | Integration test (real DB, `src/__integration__/`) |
| New page or user flow      | E2E test (Playwright, `tests/e2e/`)                |
| Bug fix                    | Test that reproduces the bug                       |

### Integration tests

Integration tests run against a real `solvesk_test` database with self-contained fixtures (no seed dependency). See `src/__integration__/fixtures.ts` for the test data factory.

### E2E tests

E2E tests use 3 authenticated roles (admin, agent, customer) via shared auth fixtures. See `tests/auth.ts` for the setup.

## Making Changes

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Ensure `npx tsc --noEmit` passes with 0 errors
4. Add tests for your changes (see Testing section above)
5. Run `pnpm test` to verify all tests pass
6. Test your changes locally with `pnpm dev`
7. Submit a pull request

## Commit Messages

Use conventional commits:

```
feat: add dark mode toggle
fix: resolve Safari login blank screen
refactor: simplify audit logger
docs: update contributing guide
```

## Reporting Issues

- Use GitHub Issues
- Include steps to reproduce
- Include browser/OS info if relevant

## License

By contributing, you agree that your contributions will be licensed under the [GNU Affero General Public License v3.0](./LICENSE).
