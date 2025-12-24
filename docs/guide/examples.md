# Examples

Real-world examples of using Test Flakiness Detector.

## Basic Usage

### Detect Flaky npm Tests

```bash
npx tsx src/index.ts --test "npm test" --runs 10
```

### Detect Flaky Pytest Tests

```bash
npx tsx src/index.ts --test "pytest tests/" --runs 20
```

### Detect Flaky Jest Tests

```bash
npx tsx src/index.ts --test "npm run test:unit" --runs 15 --verbose
```

## Example Outputs

### All Tests Passing

When all tests pass consistently:

```json
{
  "success": true,
  "totalRuns": 10,
  "passedRuns": 10,
  "failedRuns": 0,
  "flakyTests": [],
  "runs": [
    { "success": true, "exitCode": 0, "stdout": "...", "stderr": "" }
    // ... 9 more runs
  ]
}
```

### Flaky Tests Detected

When tests fail intermittently:

```json
{
  "success": true,
  "totalRuns": 20,
  "passedRuns": 15,
  "failedRuns": 5,
  "flakyTests": [
    {
      "testName": "should handle concurrent requests",
      "passed": 15,
      "failed": 5,
      "totalRuns": 20,
      "failureRate": 25
    }
  ],
  "runs": [
    // Individual run results
  ]
}
```

## Programmatic Usage

### Library Import

```typescript
import { detectFlakiness } from '@tuulbelt/test-flakiness-detector';

const report = await detectFlakiness({
  testCommand: 'npm test',
  runs: 10
});

if (report.flakyTests.length > 0) {
  console.error('Flaky tests detected!');
  process.exit(1);
}
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Check for flaky tests
  run: |
    npx tsx src/index.ts --test "npm test" --runs 20 > flakiness-report.json

- name: Upload report
  uses: actions/upload-artifact@v3
  with:
    name: flakiness-report
    path: flakiness-report.json
```

## Advanced Patterns

### Testing Multiple Suites

```bash
# Check unit tests
npx tsx src/index.ts --test "npm run test:unit" --runs 10

# Check integration tests
npx tsx src/index.ts --test "npm run test:integration" --runs 20

# Check end-to-end tests
npx tsx src/index.ts --test "npm run test:e2e" --runs 5
```

### Verbose Mode

```bash
npx tsx src/index.ts --test "npm test" --runs 10 --verbose
```

Output shows each run in real-time:
```
Run 1/10: ✅ Passed (exit code: 0)
Run 2/10: ❌ Failed (exit code: 1)
Run 3/10: ✅ Passed (exit code: 0)
...
```

## Real Examples

See the [`examples/outputs/`](https://github.com/tuulbelt/tuulbelt/tree/main/test-flakiness-detector/examples/outputs) directory for real output samples:

- `all-pass.json` - All tests passing consistently
- `all-fail.json` - All tests failing consistently
- `flaky-detected.json` - Flaky tests detected with failure rates
- `verbose-mode.txt` - Verbose output example

## See Also

- [Getting Started](/guide/getting-started) - Installation and setup
- [CLI Usage](/guide/cli-usage) - Command-line options
- [API Reference](/api/reference) - Programmatic API
