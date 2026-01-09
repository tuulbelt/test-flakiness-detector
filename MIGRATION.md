# Migration Guide

Upgrading between versions of test-flakiness-detector.

## Overview

This guide helps you migrate between major versions of test-flakiness-detector. All releases follow [semantic versioning](https://semver.org/):
- **Patch releases** (0.4.x): Bug fixes, fully backward compatible
- **Minor releases** (0.x.0): New features, backward compatible
- **Major releases** (1.0.0+): Breaking changes (not yet released)

**Current Stable:** v0.4.0

---

## Upgrading to v0.4.0 from v0.3.0

**Released:** 2026-01-08
**Breaking Changes:** None (fully backward compatible)
**New Features:** Configurable flakiness threshold

### What's New

**Threshold Parameter** — Ignore low-frequency failures to reduce false positives from infrastructure issues.

```typescript
// Before v0.4.0: Any failure = flaky (strict)
const report = await detectFlakiness({
  testCommand: 'npm test',
  runs: 20,
});

// After v0.4.0: Ignore failures < 10% (recommended for CI)
const report = await detectFlakiness({
  testCommand: 'npm test',
  runs: 20,
  threshold: 10, // NEW: Only flag if >10% failure rate
});
```

### Should You Migrate?

✅ **Migrate if:**
- You experience false positives from transient infrastructure failures
- Your CI environment has occasional network/resource issues
- You want to focus on consistently flaky tests (>10-20% failure rate)

⚠️ **Don't migrate if:**
- You need strict flakiness detection (any failure = flaky)
- Your tests run in a stable environment
- You prefer the existing behavior (default threshold=0 preserves it)

### Migration Steps

#### 1. No Changes Required (Backward Compatible)

The default behavior is unchanged. Existing code works without modification:

```typescript
// This still works exactly as before
const report = await detectFlakiness({
  testCommand: 'npm test',
  runs: 10,
});
// Default threshold=0 means any failure is flagged as flaky
```

#### 2. Add Threshold for CI Robustness (Recommended)

For production CI/CD, add a threshold to ignore transient failures:

```typescript
// Recommended for CI: Ignore < 10% failures
const report = await detectFlakiness({
  testCommand: 'npm test',
  runs: 20,
  threshold: 10, // Only flag if failure rate > 10%
});
```

**Common Threshold Values:**

| Threshold | Use Case | Example |
|-----------|----------|---------|
| **0%** (default) | Strict detection, stable environments | Local development |
| **5-10%** | Ignore rare infrastructure failures | Production CI with good stability |
| **15-25%** | Tolerate occasional issues | CI with network/resource variability |
| **50%+** | Only flag severely flaky tests | Unstable environments (not recommended) |

#### 3. CLI Flag (Optional)

If using the CLI, add `--threshold <percent>`:

```bash
# Before v0.4.0
flaky --test "npm test" --runs 20

# After v0.4.0 (with threshold)
flaky --test "npm test" --runs 20 --threshold 10
```

#### 4. Update All API Tiers

The threshold parameter works across all API functions:

**detect() API:**
```typescript
const result = await detect({
  test: 'npm test',
  runs: 20,
  threshold: 10, // NEW
});
```

**isFlaky() API:**
```typescript
const result = await isFlaky({
  test: 'npm test',
  runs: 20,
  threshold: 10, // NEW
});
```

**compileDetector() API:**
```typescript
const detector = compileDetector({
  test: 'npm test',
  threshold: 10, // NEW
});

const result = await detector.run(20);
```

### How Threshold Works

**Formula:** Test is flaky if `failureRate > threshold`

**Example with threshold=10:**

| Runs | Failures | Failure Rate | Flaky? |
|------|----------|--------------|--------|
| 20 | 1 | 5% | ❌ No (5% ≤ 10%) |
| 20 | 2 | 10% | ❌ No (10% ≤ 10%) |
| 20 | 3 | 15% | ✅ Yes (15% > 10%) |
| 20 | 10 | 50% | ✅ Yes (50% > 10%) |

**Key Insight:** A test must **exceed** the threshold to be flagged. Exact matches (e.g., 10% failure with 10% threshold) are **not** flagged.

### Edge Cases

**Decimal Thresholds:**
```typescript
// Supports decimal values
const report = await detectFlakiness({
  testCommand: 'npm test',
  runs: 20,
  threshold: 12.5, // Valid: 12.5%
});
```

**Boundary Values:**
```typescript
// Valid range: 0-100
threshold: 0   // ✅ Any failure = flaky (strictest)
threshold: 50  // ✅ Only >50% failure = flaky
threshold: 100 // ✅ Only 100% failure = flaky (never flags)

threshold: -1  // ❌ Error: out of range
threshold: 101 // ❌ Error: out of range
```

**Extreme Values:**
```typescript
// threshold=100: Never flags flakiness
const report = await detectFlakiness({
  testCommand: 'npm test',
  runs: 10,
  threshold: 100, // Only 100% failure would be flaky
});
// Result: No tests flagged (even 99% failure isn't flaky)
```

### Testing Your Migration

**Before deploying to CI, test locally:**

```bash
# Simulate transient failures (1 failure in 20 runs = 5%)
flaky --test "test \$(( \$(date +%s) % 20 )) -ne 0" --runs 20 --threshold 10
# Expected: NOT flagged as flaky (5% < 10%)

# Simulate consistent failures (10 failures in 20 runs = 50%)
flaky --test "test \$(( \$(date +%s) % 2 )) -eq 0" --runs 20 --threshold 10
# Expected: Flagged as flaky (50% > 10%)
```

### Breaking Changes

**None.** v0.4.0 is fully backward compatible.

---

## Upgrading to v0.3.0 from v0.2.5

**Released:** 2026-01-08
**Breaking Changes:** None
**New Features:** Streaming API with `onProgress` callback

### What's New

**Real-time Progress Events** — Monitor flakiness detection as it runs.

```typescript
// Before v0.3.0: Wait for completion
const report = await detectFlakiness({
  testCommand: 'npm test',
  runs: 100,
});
console.log('Done!');

// After v0.3.0: Track progress in real-time
const report = await detectFlakiness({
  testCommand: 'npm test',
  runs: 100,
  onProgress: (event) => {
    if (event.type === 'run-complete') {
      console.log(`Run ${event.data.runNumber}/${event.data.totalRuns} complete`);
    }
  },
});
```

### Migration Steps

**Optional** — Streaming is opt-in. No changes required unless you want real-time progress.

See [README.md](README.md#streaming-api) for complete streaming API documentation.

---

## Upgrading to v0.2.5 from v0.2.0

**Released:** 2026-01-08
**Breaking Changes:** None
**New Features:** Machine-readable output formats

### What's New

**Output Formats** — Choose between JSON, text, or minimal output.

```bash
# JSON (default)
flaky --test "npm test" --runs 10 --format json

# Human-readable text
flaky --test "npm test" --runs 10 --format text

# Minimal (test names only)
flaky --test "npm test" --runs 10 --format minimal
```

### Migration Steps

**No changes required.** Default format is JSON (existing behavior).

---

## Upgrading to v0.2.0 from v0.1.0

**Released:** 2026-01-08
**Breaking Changes:** Exit code change (minor)
**New Features:** Multi-tier API (detect, isFlaky, compileDetector)

### What's New

**Three API Tiers** — Choose the right API for your use case:

1. **detect()** — Full detection report with Result type
2. **isFlaky()** — Fast boolean check for CI gates
3. **compileDetector()** — Pre-compiled detector for repeated use

### Breaking Changes

**Exit Codes Changed:**
- **Exit 1:** Flakiness detected (unchanged)
- **Exit 2:** Invalid arguments (**NEW**, was exit 1)
- **Exit 0:** No flakiness (unchanged)

**Impact:** Scripts checking `$?` for argument validation may need updates.

**Before v0.2.0:**
```bash
flaky --test ""  # Exit 1 (invalid argument)
```

**After v0.2.0:**
```bash
flaky --test ""  # Exit 2 (invalid argument)
```

**Fix:** Check for exit code 2 separately from exit code 1.

### Migration Steps

#### 1. Update Exit Code Checks (if using CLI)

```bash
# Before v0.2.0
flaky --test "npm test" --runs 10
if [ $? -eq 1 ]; then
  echo "Error or flakiness detected"
fi

# After v0.2.0 (distinguish errors from flakiness)
flaky --test "npm test" --runs 10
EXIT_CODE=$?
if [ $EXIT_CODE -eq 2 ]; then
  echo "Invalid arguments"
  exit 2
elif [ $EXIT_CODE -eq 1 ]; then
  echo "Flakiness detected"
  exit 1
fi
```

#### 2. Adopt New APIs (Optional)

**Old API (still works):**
```typescript
import { detectFlakiness } from 'test-flakiness-detector';

const report = await detectFlakiness({
  testCommand: 'npm test',
  runs: 10,
});

if (report.success && report.flakyTests.length > 0) {
  console.error('Flakiness detected!');
}
```

**New API (recommended):**
```typescript
import { detect } from 'test-flakiness-detector';

const result = await detect({
  test: 'npm test',
  runs: 10,
});

if (result.ok && result.value.flakyTests.length > 0) {
  console.error('Flakiness detected!');
}
```

**Benefits of new API:**
- Result type pattern (non-throwing)
- Consistent with modern TypeScript libraries
- Better TypeScript inference

---

## Version History

| Version | Release Date | Key Features |
|---------|--------------|--------------|
| **0.4.0** | 2026-01-08 | Configurable threshold parameter |
| **0.3.0** | 2026-01-08 | Streaming API with onProgress |
| **0.2.5** | 2026-01-08 | Output formats (json, text, minimal) |
| **0.2.0** | 2026-01-08 | Multi-tier API (detect, isFlaky, compile) |
| **0.1.0** | 2026-01-06 | Initial release |

---

## Getting Help

**Issues:** https://github.com/tuulbelt/tuulbelt/issues
**Changelog:** [CHANGELOG.md](CHANGELOG.md)
**Specification:** [SPEC.md](SPEC.md)

When reporting migration issues, include:
- Version migrating from/to
- Code snippet demonstrating the issue
- Error messages (if any)
