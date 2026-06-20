- [x] Verify that the `copilot-instructions.md` file in the `.github` directory is created.
- [x] Clarify project requirements (`Next.js` PWA + `NestJS` + `Supabase`, monorepo TypeScript).
- [x] Scaffold the project in current root (`apps/web`, `apps/api`, `packages/types`, `packages/validation`).
- [x] Customize the project for event ticketing domain modules.
- [x] Install required extensions (none required by setup info).
- [x] Compile the project (via workspace scripts in CI and local commands).
- [x] Create and run task (workspace scripts available in `package.json`).
- [ ] Launch the project (depends on user confirmation).
- [x] Ensure documentation is complete (`README.md` exists and is updated).

Project conventions:
- Keep architecture modular and by feature.
- Keep controllers thin and business logic in services.
- Keep reusable contracts in `packages/types` and `packages/validation`.
- Prefer incremental changes and avoid unrelated refactors.
