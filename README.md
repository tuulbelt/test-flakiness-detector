# Test Flakiness Detector

Detect unreliable tests by running them multiple times and tracking failure rates.

## Problem

Flaky tests—tests that pass sometimes and fail sometimes—are a major pain in software development. They undermine confidence in test suites, cause false alarms in CI/CD pipelines, and waste developer time investigating spurious failures.

This tool runs your test command multiple times and identifies which tests have intermittent failures, helping you target and fix the real problems.

## Features

- Zero runtime dependencies
- Works with Node.js 18+
- TypeScript support with strict mode
- Composable via CLI or library API
- Works with any test command (npm test, cargo test, pytest, etc.)
- Configurable number of test runs
- Detailed JSON output with failure statistics
- Verbose mode for debugging

## Installation

Clone the repository:

```bash
git clone https://github.com/tuulbelt/test-flakiness-detector.git
cd test-flakiness-detector
npm install  # Install dev dependencies only
```

No runtime dependencies — this tool uses only Node.js standard library.

## Usage

### As a CLI

```bash
# Run npm test 10 times (default)
npx tsx src/index.ts --test "npm test"

# Run with 20 iterations
npx tsx src/index.ts --test "npm test" --runs 20

# Run cargo tests with verbose output
npx tsx src/index.ts --test "cargo test" --runs 15 --verbose

# Show help
npx tsx src/index.ts --help
```

### As a Library

```typescript
import { detectFlakiness } from './src/index.js';

const report = detectFlakiness({
  testCommand: 'npm test',
  runs: 10,
  verbose: false
});

if (report.success) {
  console.log(`Total runs: ${report.totalRuns}`);
  console.log(`Passed: ${report.passedRuns}, Failed: ${report.failedRuns}`);

  if (report.flakyTests.length > 0) {
    console.log('\nFlaky tests detected:');
    report.flakyTests.forEach(test => {
      console.log(`  ${test.testName}: ${test.failureRate.toFixed(1)}% failure rate`);
      console.log(`    Passed: ${test.passed}/${test.totalRuns}`);
      console.log(`    Failed: ${test.failed}/${test.totalRuns}`);
    });
  } else {
    console.log('No flaky tests detected');
  }
} else {
  console.error(`Error: ${report.error}`);
}
```

## CLI Options

- `-t, --test <command>` — Test command to execute (required)
- `-r, --runs <number>` — Number of times to run the test (default: 10, max: 1000)
- `-v, --verbose` — Enable verbose output showing each test run
- `-h, --help` — Show help message

## Output Format

The tool outputs a JSON report with the following structure:

```json
{
  "success": true,
  "totalRuns": 10,
  "passedRuns": 7,
  "failedRuns": 3,
  "flakyTests": [
    {
      "testName": "Test Suite",
      "passed": 7,
      "failed": 3,
      "totalRuns": 10,
      "failureRate": 30.0
    }
  ],
  "runs": [
    {
      "success": true,
      "exitCode": 0,
      "stdout": "...",
      "stderr": ""
    }
    // ... more run results
  ]
}
```

## Exit Codes

- `0` — Detection completed successfully and no flaky tests found
- `1` — Either invalid arguments, execution error, or flaky tests detected

## Examples

### Detect Flaky npm Tests

```bash
npx tsx src/index.ts --test "npm test" --runs 20
```

### Detect Flaky Rust Tests

```bash
npx tsx src/index.ts --test "cargo test" --runs 15
```

### Detect Flaky Python Tests

```bash
npx tsx src/index.ts --test "pytest tests/" --runs 10
```

### With Verbose Output

```bash
npx tsx src/index.ts --test "npm test" --runs 5 --verbose
```

This will show:
```
[INFO] Running test command 5 times: npm test
[INFO] Run 1/5
[RUN] Executing: npm test
[INFO] Run 2/5
...
[INFO] Completed 5 runs: 4 passed, 1 failed
[WARN] Detected flaky tests!
```

## How It Works

1. The tool executes the specified test command N times
2. It captures the exit code, stdout, and stderr for each run
3. It tracks how many times the tests passed vs. failed
4. If some runs pass and some fail, the test suite is flagged as flaky
5. A detailed JSON report is generated with failure statistics

## Testing

```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
```

The test suite includes:
- Basic functionality tests
- Input validation tests
- Flaky test detection tests
- Edge case handling tests
- Error scenario tests

## Error Handling

The tool handles various error scenarios gracefully:

- Invalid or non-existent commands
- Command syntax errors
- Commands that hang or timeout
- Empty or malformed input

Errors are returned in the `error` field of the result object, not thrown.

## Limitations

- Currently detects flakiness at the test suite level (entire command pass/fail)
- Does not parse individual test names from test runner output
- Maximum of 1000 runs per detection (to prevent resource exhaustion)
- stdout/stderr buffer limited to 10MB per run

## Future Enhancements

Potential improvements for future versions:

- Parse individual test names from popular test runners (Jest, Mocha, pytest, cargo test)
- Track flakiness per individual test, not just test suite
- Calculate statistical confidence intervals for failure rates
- Support for parallel test execution to speed up detection
- Integration with CI/CD systems (GitHub Actions, GitLab CI)

## Specification

See [SPEC.md](SPEC.md) for detailed technical specification.

## License

MIT — see [LICENSE](LICENSE)

## Contributing

Found a bug or want to contribute? Open an issue at:
https://github.com/tuulbelt/test-flakiness-detector/issues
