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

- Zero external dependencies (except Tuulbelt tool composition)
- Result pattern for error handling
- 80%+ test coverage
- ES modules with `node:` prefix for built-ins
- See main repo for full [PRINCIPLES.md](https://github.com/tuulbelt/tuulbelt/blob/main/PRINCIPLES.md)

## API Design (Phase 1 Enhancement)

**Multi-tier API following Property Validator gold standard:**

### 1. `detect()` - Full Detection API
- **Purpose:** Comprehensive flakiness detection with detailed reports
- **Default runs:** 10
- **Returns:** `Result<DetectionReport>` (non-throwing)
- **Use case:** Debugging, analysis, generating reports
- **Implementation:** `src/index.ts` lines 198-243

### 2. `isFlaky()` - Fast Boolean Check
- **Purpose:** Quick CI gate (optimized for speed)
- **Default runs:** 5 (fewer runs = faster)
- **Returns:** `Result<boolean>` (non-throwing)
- **Use case:** CI/CD pipeline gates, quick checks
- **Implementation:** `src/index.ts` lines 248-285

### 3. `compileDetector()` - Pre-compiled Detector
- **Purpose:** Cache detector config for repeated use
- **Returns:** `CompiledDetector` object with `run(runs)` method
- **Use case:** Progressive detection, multiple run counts
- **Implementation:** `src/index.ts` lines 290-327

### Result Type Pattern
All APIs use non-throwing `Result<T>` pattern:
```typescript
type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: Error };
```

**Why:** Eliminates try-catch boilerplate, forces error handling at call site.

### Exit Code Separation (Phase 1)
- **0:** Success (no flaky tests found)
- **1:** Flaky tests detected (fail the build)
- **2:** Invalid arguments (notify developer)

**Why:** CI/CD can distinguish between flakiness and configuration errors.

### Tree-Shaking Support (Phase 1)
Package.json exports field enables bundlers to eliminate unused APIs:
```json
{
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "import": "./src/index.ts"
    }
  }
}
```

**Why:** Users importing only `isFlaky()` don't bundle `detect()` or `compileDetector()` code.

### Backward Compatibility
Legacy `detectFlakiness()` API preserved for existing code (deprecated in docs).

## Dependencies

This tool uses [CLI Progress Reporting](https://github.com/tuulbelt/cli-progress-reporting) as a **required dependency** for progress tracking.

**Design Decision:** The cli-progress dependency is REQUIRED (Tuulbelt tool composition - PRINCIPLES.md Exception 2):
- Listed in package.json `dependencies` as git URL
- Fetched automatically during `npm install`
- Shows real-time progress for runs ≥ 5

**Implementation:** See `src/index.ts` line 13 for import and lines 164-173 for usage.

**Why Required:** This demonstrates Tuulbelt-to-Tuulbelt composition. Since all Tuulbelt tools have zero external dependencies, composing them preserves the zero-dep guarantee while providing richer functionality.

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
