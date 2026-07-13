# Repository Guidelines

## Project Structure & Module Organization

This is a Next.js App Router project for an Alibaba Cloud Bailian knowledge base admin console.

- `app/`: Next.js pages, layout, global styles, and API route handlers.
- `src/components/`: client UI components. `Dashboard.tsx` owns the admin shell; `KnowledgeManagement.tsx` owns the knowledge-base workflow.
- `src/lib/`: server utilities, Bailian SDK wrappers, SQLite task storage, validation, and shared API helpers.
- `src/lib/__tests__/`: Vitest unit tests.
- `doc/`: Bailian API references and prototype material.
- `testfile/`: local test fixtures for manual upload checks.
- `data/`, `.next/`, `logs/`, `.env`: local/generated/sensitive files and must not be committed.

## Build, Test, and Development Commands

- `npm run dev`: start the local Next.js dev server.
- `npm run build`: create a production build and run Next.js type checks.
- `npm run start`: serve the production build.
- `npm run test`: run Vitest once.
- `npm run test:watch`: run Vitest in watch mode.
- `npx tsc --noEmit`: run TypeScript validation without emitting files.

## Coding Style & Naming Conventions

Use TypeScript throughout. Prefer explicit types for API payloads and exported component props. Keep React components in PascalCase, functions and variables in camelCase, and route directories matching Next.js conventions such as `app/api/tasks/[taskId]/route.ts`.

Follow the existing style: two-space indentation, double quotes, semicolons, concise helper functions, and small route handlers that delegate to `src/lib`. Keep server-only Bailian credentials in environment variables, never in client components.

## Testing Guidelines

Vitest is the current test framework. Place unit tests under `src/lib/__tests__/` and name files `*.test.ts`. Add tests for validation, Bailian request mapping, task state transitions, and error normalization when changing backend behavior. Run `npm run test` and `npx tsc --noEmit` before committing.

## Commit & Pull Request Guidelines

Current history uses concise, imperative English messages, for example `Initial Bailian knowledge base admin` and `Refactor knowledge management and stabilize uploads`. Keep commits focused and avoid mixing unrelated UI, API, and fixture changes.

Pull requests should include a short summary, test results, configuration notes, and screenshots or HAR excerpts only when sanitized. Link related issues if available.

## Security & Configuration Tips

Copy `.env.example` to `.env` or `.env.local` for local development. Required variables include `ALIBABA_CLOUD_ACCESS_KEY_ID`, `ALIBABA_CLOUD_ACCESS_KEY_SECRET`, `BAILIAN_WORKSPACE_ID`, and `BAILIAN_ENDPOINT`. Do not commit `.env`, `logs/`, SQLite data, or presigned OSS URLs.
