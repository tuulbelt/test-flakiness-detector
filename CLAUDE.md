# Test Flakiness Detector / `flaky`

Part of the [Tuulbelt](https://github.com/tuulbelt/tuulbelt) collection.

## Quick Reference

- **Language:** TypeScript
- **CLI Short Name:** `flaky`
- **CLI Long Name:** `test-flakiness-detector`
- **Tests:** `npm test` (132 tests)
- **Build:** `npm run build`

## Development Commands

```bash
npm install      # Install dependencies
npm test         # Run all tests (132 tests)
npm run build    # Build for distribution
npx tsc --noEmit # Type check only
npm run test:watch  # Watch mode
npm run test:unit       # Unit tests only
npm run test:integration  # CLI integration tests
npm run test:stress     # Stress tests
npm run test:fuzzy      # Fuzzy input tests
```

## Code Conventions

- Zero external dependencies (Tuulbelt tools allowed)
- Result pattern for error handling
- 80%+ test coverage
- ES modules with `node:` prefix for built-ins
- See main repo for full [PRINCIPLES.md](https://github.com/tuulbelt/tuulbelt/blob/main/PRINCIPLES.md)

## Dogfooding: CLI Progress Integration (Optional)

This tool uses [CLI Progress Reporting](https://github.com/tuulbelt/cli-progress-reporting) for progress tracking when running in monorepo context.

**Design Decision:** The cli-progress dependency is OPTIONAL with graceful fallback:
- **Monorepo:** Dynamic import from sibling directory (dogfooding demonstration)
- **Standalone:** Falls back to no progress tracking (zero-dep preserved)

**Implementation:** See `src/index.ts` lines 77-90 for dynamic import pattern with graceful fallback.

**Why Optional:** This aligns with Tuulbelt's zero-dependency principle while demonstrating tool composition in monorepo workflows.

## Testing

```bash
npm test                    # Run all tests (132 tests)
npm run test:unit           # Unit tests only
npm run test:integration    # CLI integration tests
npm run test:stress         # Stress tests (high run counts)
npm run test:fuzzy          # Fuzzy input tests
./scripts/dogfood-progress.sh  # Validate cli-progress tests (optional)
./scripts/dogfood-pipeline.sh  # Validate all Phase 1 tools (optional)
```

## Security

- No hardcoded secrets
- Input validation on all public APIs
- Command injection prevention (uses execSync with proper quoting)
- Run security scan: See main repo `/security-scan` command

## Related

- [Main Tuulbelt Repository](https://github.com/tuulbelt/tuulbelt)
- [Documentation](https://tuulbelt.github.io/tuulbelt/tools/test-flakiness-detector/)
- [Contributing Guide](https://github.com/tuulbelt/tuulbelt/blob/main/CONTRIBUTING.md)
- [Testing Standards](https://github.com/tuulbelt/tuulbelt/blob/main/docs/testing-standards.md)
