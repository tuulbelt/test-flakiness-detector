# Changelog

All notable changes to test-flakiness-detector will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- **Comprehensive API tests**: 28 new tests covering all APIs
- **Library usage examples** in CLI help text

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
