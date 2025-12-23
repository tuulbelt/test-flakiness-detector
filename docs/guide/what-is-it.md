# What is Test Flakiness Detector?

Test Flakiness Detector is a zero-dependency tool that identifies unreliable tests by running them multiple times and tracking their failure rates.

## The Problem

**Flaky tests** pass sometimes and fail sometimes, even when the code hasn't changed. They:

- ❌ Waste developer time debugging non-issues
- ❌ Reduce confidence in your test suite
- ❌ Block CI/CD pipelines with false failures
- ❌ Hide real bugs behind "just run it again"

## The Solution

This tool:

1. **Runs your tests N times** (you choose the number)
2. **Tracks pass/fail for each run**
3. **Reports tests with inconsistent results**
4. **Calculates failure rates** to prioritize fixes

## Why Use This Tool?

### Zero Dependencies
No external packages. Just Node.js standard library. Install once, works forever.

### Framework Agnostic
Works with **any test framework**:
- Jest, Vitest, Mocha, Jasmine
- pytest, unittest, nose
- cargo test, go test
- Your custom test runner

### Simple Interface
```bash
npx tsx src/index.ts --test "npm test" --runs 20
```

That's it. No configuration files, no setup, no plugins.

### Actionable Output
Get a JSON report with:
- Which tests are flaky
- Exact failure rates (e.g., "fails 15% of the time")
- All run results for debugging

## When Should You Use It?

✅ **Before merging PRs** - Catch flaky tests early
✅ **In CI/CD pipelines** - Block flaky tests from main
✅ **After major refactors** - Verify test reliability
✅ **Debugging intermittent failures** - Reproduce flaky behavior

## Real-World Example

```bash
# Run your tests 50 times to find flaky ones
npx tsx src/index.ts --test "npm test" --runs 50
```

Output:
```json
{
  "success": true,
  "totalRuns": 50,
  "passedRuns": 42,
  "failedRuns": 8,
  "flakyTests": [
    {
      "testName": "async database test",
      "failureRate": 16,
      "passed": 42,
      "failed": 8
    }
  ]
}
```

Now you know exactly which test is flaky and how often it fails.

## Next Steps

- [Getting Started](/guide/getting-started) - Install and run your first detection
- [CLI Usage](/guide/cli-usage) - Command-line options
- [Examples](/guide/examples) - Real-world usage patterns
