# Test Flakiness Detector Specification

## Overview

A tool that detects unreliable tests by running a test command multiple times and tracking failure rates to identify intermittent failures.

## Problem

Flaky tests—tests that sometimes pass and sometimes fail without code changes—are a significant problem in software development:

- **False positives in CI/CD**: Developers waste time investigating failures that aren't real bugs
- **Lost confidence**: Teams start ignoring test failures, missing real issues
- **Time waste**: Manual re-running of tests to see if failures are "real"
- **Difficult to detect**: Without systematic tracking, flaky tests hide among normal test runs

Existing solutions:
- Manual re-running is tedious and inconsistent
- Test frameworks don't track flakiness across multiple runs
- CI systems show failures but don't distinguish flaky vs. real failures

This tool addresses these gaps by automating the detection process.

## Design Goals

1. **Zero dependencies** — Uses only Node.js standard library (child_process, etc.)
2. **Type safe** — Full TypeScript support with strict mode
3. **Composable** — Works as both library and CLI
4. **Test-framework agnostic** — Works with any test command (npm test, cargo test, pytest, etc.)
5. **Deterministic** — Same command with same runs produces consistent detection approach
6. **Simple interface** — Minimal configuration required

## Interface

### Library API

```typescript
import { detectFlakiness, Config, FlakinessReport } from './src/index.js';

interface Config {
  /** Test command to execute (required) */
  testCommand: string;
  /** Number of times to run the test (default: 10, max: 1000) */
  runs?: number;
  /** Enable verbose output (default: false) */
  verbose?: boolean;
}

interface TestRunResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
}

interface TestFlakiness {
  testName: string;
  passed: number;
  failed: number;
  totalRuns: number;
  failureRate: number; // 0-100
}

interface FlakinessReport {
  success: boolean;
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  flakyTests: TestFlakiness[];
  runs: TestRunResult[];
  error?: string;
}

function detectFlakiness(config: Config): FlakinessReport;
```

### CLI Interface

```
Usage: test-flakiness-detector [options]

Options:
  -t, --test <command>   Test command to execute (required)
  -r, --runs <number>    Number of times to run the test (default: 10)
  -v, --verbose          Enable verbose output
  -h, --help             Show help message

Examples:
  test-flakiness-detector --test "npm test"
  test-flakiness-detector --test "npm test" --runs 20
  test-flakiness-detector --test "cargo test" --runs 15 --verbose
```

### Input Format

**Required:**
- `testCommand`: Any valid shell command string

**Optional:**
- `runs`: Integer between 1 and 1000 (inclusive)
- `verbose`: Boolean flag

### Output Format

JSON object on stdout:

**Success (no flaky tests):**
```json
{
  "success": true,
  "totalRuns": 10,
  "passedRuns": 10,
  "failedRuns": 0,
  "flakyTests": [],
  "runs": [
    {
      "success": true,
      "exitCode": 0,
      "stdout": "test output...",
      "stderr": ""
    }
  ]
}
```

**Success (flaky tests detected):**
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
  "runs": [ /* 10 TestRunResult objects */ ]
}
```

**Error:**
```json
{
  "success": false,
  "totalRuns": 0,
  "passedRuns": 0,
  "failedRuns": 0,
  "flakyTests": [],
  "runs": [],
  "error": "Test command must be a non-empty string"
}
```

## Behavior

### Normal Operation

1. **Validate input**
   - Ensure `testCommand` is a non-empty string
   - Ensure `runs` is between 1 and 1000

2. **Execute test runs**
   - For each run (1 to N):
     - Execute test command using `execSync`
     - Capture exit code, stdout, stderr
     - Record success (exit code 0) or failure (non-zero exit code)

3. **Calculate flakiness**
   - If passedRuns > 0 AND failedRuns > 0:
     - Test suite is flaky
     - Calculate failure rate: (failedRuns / totalRuns) × 100

4. **Generate report**
   - Return FlakinessReport with all run results and flakiness statistics

### Error Cases

| Condition | Behavior |
|-----------|----------|
| Empty test command | Return error: "Test command must be a non-empty string" |
| Non-string test command | Return error: "Test command must be a non-empty string" |
| runs < 1 | Return error: "Runs must be between 1 and 1000" |
| runs > 1000 | Return error: "Runs must be between 1 and 1000" |
| Command not found | Success=true, but run result has success=false, exitCode=127 |
| Command syntax error | Success=true, but run result has success=false, exitCode≠0 |

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| All tests pass | passedRuns=N, failedRuns=0, flakyTests=[] |
| All tests fail | passedRuns=0, failedRuns=N, flakyTests=[] |
| Some pass, some fail | passedRuns>0, failedRuns>0, flakyTests has 1 entry |
| runs=1 | Valid, executes once |
| runs=1000 | Valid, executes 1000 times (slow but valid) |
| Command with pipes | Executed in shell, works correctly |
| Command with quotes | Handled by shell, works correctly |
| Long-running command | Waits for completion, no timeout |

## Examples

### Example 1: All Tests Pass

Input:
```typescript
detectFlakiness({
  testCommand: 'echo "test passed"',
  runs: 5
})
```

Output:
```json
{
  "success": true,
  "totalRuns": 5,
  "passedRuns": 5,
  "failedRuns": 0,
  "flakyTests": [],
  "runs": [/* 5 successful runs */]
}
```

### Example 2: All Tests Fail

Input:
```typescript
detectFlakiness({
  testCommand: 'exit 1',
  runs: 3
})
```

Output:
```json
{
  "success": true,
  "totalRuns": 3,
  "passedRuns": 0,
  "failedRuns": 3,
  "flakyTests": [],
  "runs": [/* 3 failed runs */]
}
```

### Example 3: Flaky Tests Detected

Input:
```typescript
detectFlakiness({
  testCommand: 'node -e "process.exit(Math.random() > 0.5 ? 0 : 1)"',
  runs: 10
})
```

Output (example, actual values vary due to randomness):
```json
{
  "success": true,
  "totalRuns": 10,
  "passedRuns": 6,
  "failedRuns": 4,
  "flakyTests": [
    {
      "testName": "Test Suite",
      "passed": 6,
      "failed": 4,
      "totalRuns": 10,
      "failureRate": 40.0
    }
  ],
  "runs": [/* 10 runs with mixed success/failure */]
}
```

### Example 4: Invalid Input

Input:
```typescript
detectFlakiness({
  testCommand: '',
  runs: 5
})
```

Output:
```json
{
  "success": false,
  "totalRuns": 0,
  "passedRuns": 0,
  "failedRuns": 0,
  "flakyTests": [],
  "runs": [],
  "error": "Test command must be a non-empty string"
}
```

## Performance

- **Time complexity**: O(N × T) where N = runs, T = time per test execution
- **Space complexity**: O(N × S) where N = runs, S = size of stdout/stderr per run
- **Limits**:
  - Maximum runs: 1000
  - Maximum buffer per run: 10MB
  - No timeout (waits for command completion)

## Security Considerations

- **Command injection**: Test command is executed in a shell (intentional, but users must trust their own commands)
- **Resource exhaustion**: Limited to 1000 runs maximum
- **Buffer overflow**: Limited to 10MB buffer per run
- **No secrets**: Tool does not handle credentials or sensitive data
- **No file access**: Only executes provided command, doesn't read/write files
- **No network access**: Except if test command itself makes network calls

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Detection successful, no flaky tests found |
| 1 | Invalid arguments, execution error, OR flaky tests detected |

## Limitations

1. **Suite-level detection**: Currently detects flakiness for the entire test command, not individual tests
2. **No test parsing**: Does not parse test runner output to identify specific test names
3. **Synchronous execution**: Runs tests sequentially, not in parallel
4. **No timeout**: Waits indefinitely for test command to complete
5. **Shell dependency**: Requires shell to execute commands
6. **Buffer limits**: Very large test outputs may be truncated

## Future Extensions

Potential improvements (without breaking changes):

1. **Individual test tracking**:
   - Parse output from popular test runners (Jest, Mocha, pytest, cargo test)
   - Track flakiness per individual test name
   - Report which specific tests are flaky

2. **Statistical analysis**:
   - Calculate confidence intervals for failure rates
   - Suggest minimum runs needed for statistical significance
   - Categorize flakiness severity (low, medium, high)

3. **Parallel execution**:
   - Run tests in parallel to speed up detection
   - Configurable concurrency level

4. **Timeout support**:
   - Add optional timeout per run
   - Flag tests that hang as problematic

5. **CI/CD integration**:
   - GitHub Actions integration
   - GitLab CI support
   - Output formats for CI systems (JUnit XML, etc.)

6. **Incremental reporting**:
   - Stream results as runs complete
   - Early termination if flakiness detected

## Changelog

### v0.1.0 - 2025-12-23

- Initial release
- Test command execution with configurable runs
- Suite-level flakiness detection
- JSON report generation
- CLI and library interfaces
- Comprehensive test suite (34 tests)
- Zero runtime dependencies
