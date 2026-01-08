# Changelog

All notable changes to test-flakiness-detector will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2026-01-08

### Added
- **Configurable flakiness threshold** to ignore low-frequency failures:
  - New `threshold` parameter (0-100%) in all APIs
  - CLI `--threshold <percent>` flag
  - Default threshold=0 (any failure = flaky) maintains backward compatibility
  - Formula: Test is flaky if `failureRate > threshold`
  - Support for decimal values (e.g., 12.5)
- **Threshold validation**: Range 0-100, finite number check
- **19 new threshold tests**: Default behavior, various values, edge cases, validation, API integration
- **Comprehensive documentation**: SPEC.md Threshold Behavior section, README examples

### Changed
- Test count: 212 → 231 tests (+9%)

### Implementation Notes
- Backward compatible: default threshold=0 preserves existing behavior
- Use cases: Ignore infrastructure failures (10-20%), tolerate unstable environments (25-50%)

## [0.3.0] - 2026-01-08

### Added
- **Streaming API** for real-time progress monitoring:
  - `ProgressEvent` type union with 4 event types (start, run-start, run-complete, complete)
  - Optional `onProgress` callback in all API functions
  - CLI `--stream` flag for NDJSON output
  - Error-resistant: callback errors don't crash detector
- **25 new streaming tests**: Event emission, order, data integrity, error handling
- **Real-time event emission** (not buffered)
- **Type-safe discriminated unions** for event handling

### Changed
- Test count: 189 → 212 tests (+12%)

### Implementation Notes
- Events emitted as runs progress for CI/CD integration
- Callback errors silently caught to prevent detector crashes

## [0.2.5] - 2026-01-08

### Added
- **Machine-readable output formats** for CI/CD integration:
  - `--format json` (default) - Complete DetectionReport in JSON
  - `--format text` - Human-readable text output with emojis
  - `--format minimal` - Only flaky test names (pipe-friendly)
- **Formatters module** (`src/formatters.ts`):
  - `formatJSON()` - Pretty-printed JSON output
  - `formatText()` - Human-readable text with summary
  - `formatMinimal()` - Test names only (one per line)
  - `formatReport()` - Unified formatter with exhaustiveness checking
- **29 new formatter tests**: JSON, text, minimal formats, error handling

### Changed
- Test count: 160 → 189 tests (+18%)

### Implementation Notes
- Proper error display in all output formats
- Exhaustive pattern matching for format types

## [0.2.0] - 2026-01-08

### Added
- **Multi-tier API design** following Property Validator gold standard:
  - `detect()` - Full detection report with Result type
  - `isFlaky()` - Fast boolean check for CI gates
  - `compileDetector()` - Pre-compiled detector for repeated use
- **Result type** for non-throwing error handling: `Result<T> = { ok: true; value: T } | { ok: false; error: Error }`
- **Type definitions** in `src/types.ts`:
  - `DetectOptions`, `IsFlakyOptions`, `CompileOptions`
  - `DetectionReport` (replaces FlakinessReport)
  - `CompiledDetector` interface
- **28 new API tests**: Covering all APIs, Result type, backward compatibility
- **Library usage examples** in CLI help text
- **Tree-shaking support** via exports field in package.json

### Changed
- Extracted core detection logic to `src/detector.ts` for modularity
- Restructured `src/index.ts` to export multiple APIs
- Exit code 2 for invalid arguments (was 1), exit code 1 reserved for flakiness detection
- Test count: 132 → 160 tests (+21%)

### Deprecated
- `FlakinessReport` type name (use `DetectionReport` instead, alias provided for backward compatibility)
- `detectFlakiness()` function still exported but consider using `detect()` for new code

### Implementation Notes
- Zero runtime dependencies maintained (only @tuulbelt/cli-progress-reporting)
- All new APIs follow Result type pattern (non-throwing)
- Backward compatibility: existing `detectFlakiness()` and CLI behavior preserved

## [0.1.0] - 2025-12-30

### Added
- Core flakiness detection by running tests multiple times
- CLI with `--test`, `--runs`, `--verbose` flags
- Integration with cli-progress-reporting for progress tracking
- Comprehensive test suite (132 tests)
- Complete documentation (README, SPEC.md, examples)

### Implementation Notes
- Zero runtime dependencies (except @tuulbelt/cli-progress-reporting)
- Uses Node.js built-in modules only
- TypeScript with strict type checking

---

## Template Instructions

When releasing versions, follow this format:

### Version 0.1.0 - Initial Release

**Added:**
- List new features
- New functions or capabilities
- New documentation

**Changed:**
- List modifications to existing features
- API changes

**Deprecated:**
- List features marked for removal

**Removed:**
- List removed features
- Breaking changes

**Fixed:**
- List bug fixes

**Security:**
- List security fixes or improvements

### Version Numbering

- **MAJOR (X.0.0)**: Breaking changes, incompatible API changes
- **MINOR (0.X.0)**: New features, backwards-compatible
- **PATCH (0.0.X)**: Bug fixes, backwards-compatible

### Example Entry

```markdown
## [1.2.3] - 2025-01-15

### Added
- New `processData()` function with validation
- Support for UTF-8 input (#42)

### Fixed
- Handle empty string input correctly (#38)
- Memory leak in parsing loop (#40)

### Security
- Validate file paths to prevent traversal attacks
```

---

*Remove these instructions before the first release.*
