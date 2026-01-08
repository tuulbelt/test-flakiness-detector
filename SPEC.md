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

1. **Zero external dependencies** — Uses only Node.js standard library and cli-progress-reporting (Tuulbelt tool composition - PRINCIPLES.md Exception 2)
2. **Type safe** — Full TypeScript support with strict mode
3. **Composable** — Works as both library and CLI
4. **Test-framework agnostic** — Works with any test command (npm test, cargo test, pytest, etc.)
5. **Deterministic** — Same command with same runs produces consistent detection approach
6. **Simple interface** — Minimal configuration required

## Interface

### Library API (Multi-tier Design)

**Phase 1 Enhancement:** Three-tier API design following Property Validator gold standard.

#### 1. detect() - Full Detection with Result Type

Comprehensive flakiness detection with detailed report and non-throwing error handling.

```typescript
import { detect, DetectOptions, DetectionReport, Result } from '@tuulbelt/test-flakiness-detector';

// Result type (non-throwing error handling)
type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: Error };

interface DetectOptions {
  test: string;        // Test command to execute (required)
  runs?: number;       // Number of runs (default: 10, range: 1-1000)
  verbose?: boolean;   // Enable progress logging (default: false)
  threshold?: number;  // Failure rate threshold (default: 0.01)
}

interface DetectionReport {
  success: boolean;           // No flaky tests found
  totalRuns: number;          // Total test executions
  passedRuns: number;         // Successful runs
  failedRuns: number;         // Failed runs
  flakyTests: TestFlakiness[]; // Detected flaky tests
  runs: TestRunResult[];      // All individual run results
  error?: string;             // Optional error message
}

async function detect(options: DetectOptions): Promise<Result<DetectionReport>>;
```

**Example:**
```typescript
const result = await detect({ test: 'npm test', runs: 20 });
if (result.ok) {
  console.log(`Found ${result.value.flakyTests.length} flaky tests`);
} else {
  console.error('Detection failed:', result.error.message);
}
```

#### 2. isFlaky() - Fast Boolean Check

Quick CI gate to determine if tests are flaky (optimized for speed with fewer runs).

```typescript
import { isFlaky, IsFlakyOptions } from '@tuulbelt/test-flakiness-detector';

interface IsFlakyOptions {
  test: string;       // Test command to execute (required)
  runs?: number;      // Number of runs (default: 5, range: 1-1000)
  threshold?: number; // Failure rate threshold (default: 0.01)
}

async function isFlaky(options: IsFlakyOptions): Promise<Result<boolean>>;
```

**Example:**
```typescript
const result = await isFlaky({ test: 'npm test' });
if (result.ok && result.value) {
  console.error('⚠️ Flakiness detected!');
  process.exit(1);
}
```

#### 3. compileDetector() - Pre-compiled Detector

Pre-compile detector configuration for repeated use (caching optimization).

```typescript
import { compileDetector, CompileOptions, CompiledDetector } from '@tuulbelt/test-flakiness-detector';

interface CompileOptions {
  test: string;       // Test command to execute (required)
  verbose?: boolean;  // Enable progress logging (default: false)
  threshold?: number; // Failure rate threshold (default: 0.01)
}

interface CompiledDetector {
  run(runs: number): Promise<Result<DetectionReport>>;
  getCommand(): string;
  getOptions(): CompileOptions;
}

function compileDetector(options: CompileOptions): CompiledDetector;
```

**Example:**
```typescript
const detector = compileDetector({ test: 'npm test', verbose: true });
const result1 = await detector.run(10);  // First run
const result2 = await detector.run(20);  // Reuse configuration
```

#### 4. detectFlakiness() - Legacy API (Deprecated)

**Status:** Maintained for backward compatibility, use `detect()` for new code.

```typescript
import { detectFlakiness, Config, FlakinessReport } from '@tuulbelt/test-flakiness-detector';

interface Config {
  testCommand: string;
  runs?: number;
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

async function detectFlakiness(config: Config): Promise<FlakinessReport>;
```

### CLI Interface

**Phase 3 Enhancement:** Multiple output formats for different use cases (json, text, minimal).

```
Usage: test-flakiness-detector [options]
       flaky [options]

Options:
  -t, --test <command>   Test command to execute (required)
  -r, --runs <number>    Number of times to run the test (default: 10)
  -f, --format <format>  Output format: json, text, minimal (default: json)
  -v, --verbose          Enable verbose output
  -h, --help             Show help message

Output Formats:
  json     - Complete JSON report (default, machine-readable)
  text     - Human-readable text output
  minimal  - Only flaky test names (one per line)

Examples:
  flaky --test "npm test"
  flaky --test "npm test" --format text
  flaky --test "npm test" --format minimal
  flaky --test "npm test" --runs 20
  flaky --test "cargo test" --runs 15 --verbose
```

### Input Format

**Required:**
- `testCommand`: Any valid shell command string

**Optional:**
- `runs`: Integer between 1 and 1000 (inclusive)
- `format`: Output format: `json` (default), `text`, or `minimal`
- `verbose`: Boolean flag

### Output Format

**Phase 3 Enhancement:** Three output formats for different use cases.

#### Format: JSON (default)

Complete JSON report on stdout (machine-readable, default format):

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

#### Format: Text

Human-readable text output on stdout (`--format text`):

**Success (no flaky tests):**
```
🔍 Test Flakiness Detection Report
══════════════════════════════════════════════════

📊 Summary
  Total Runs: 10
  Passed: 10
  Failed: 0

✅ No flakiness detected (all tests passed)
```

**Success (flaky tests detected):**
```
🔍 Test Flakiness Detection Report
══════════════════════════════════════════════════

📊 Summary
  Total Runs: 10
  Passed: 7
  Failed: 3

⚠️  Flaky Tests Detected

Flaky Tests:
  • Test Suite
    Passed: 7/10 (70.0%)
    Failed: 3/10 (30.0%)
```

#### Format: Minimal

Only flaky test names on stdout, one per line (`--format minimal`):

**Success (no flaky tests):**
```
(empty output)
```

**Success (flaky tests detected):**
```
Test Suite
Another Flaky Test
```

**Use case:** Suitable for piping to other commands or CI/CD scripts.

**Example:**
```bash
# Get list of flaky tests
flaky --test "npm test" --format minimal

# Count flaky tests
flaky --test "npm test" --format minimal | wc -l

# Save flaky tests to file
flaky --test "npm test" --format minimal > flaky-tests.txt
```

#### Format: Streaming (NDJSON)

Real-time progress events as newline-delimited JSON (`--stream`):

**Event Types:**

1. **start** - Emitted once at beginning
2. **run-start** - Emitted before each test run
3. **run-complete** - Emitted after each test run with result
4. **complete** - Emitted once at end with full report

**CLI Output:**
```bash
flaky --test "npm test" --runs 3 --stream
```

**Output (NDJSON format):**
```json
{"type":"start","totalRuns":3}
{"type":"run-start","runNumber":1,"totalRuns":3}
{"type":"run-complete","runNumber":1,"totalRuns":3,"success":true,"exitCode":0}
{"type":"run-start","runNumber":2,"totalRuns":3}
{"type":"run-complete","runNumber":2,"totalRuns":3,"success":false,"exitCode":1}
{"type":"run-start","runNumber":3,"totalRuns":3}
{"type":"run-complete","runNumber":3,"totalRuns":3,"success":true,"exitCode":0}
{"type":"complete","report":{...full DetectionReport...}}
```

**Library API:**
```typescript
import { detect, type ProgressEvent } from 'test-flakiness-detector';

const result = await detect({
  test: 'npm test',
  runs: 10,
  onProgress: (event: ProgressEvent) => {
    switch (event.type) {
      case 'start':
        console.log(`Starting ${event.totalRuns} test runs`);
        break;
      case 'run-start':
        console.log(`Run ${event.runNumber}/${event.totalRuns} starting...`);
        break;
      case 'run-complete':
        const status = event.success ? 'PASS' : 'FAIL';
        console.log(`Run ${event.runNumber}: ${status} (exit ${event.exitCode})`);
        break;
      case 'complete':
        console.log(`Completed: ${event.report.flakyTests.length} flaky tests`);
        break;
    }
  }
});
```

**ProgressEvent Type Definition:**
```typescript
type ProgressEvent =
  | { type: 'start'; totalRuns: number }
  | { type: 'run-start'; runNumber: number; totalRuns: number }
  | { type: 'run-complete'; runNumber: number; totalRuns: number; success: boolean; exitCode: number }
  | { type: 'complete'; report: DetectionReport };
```

**Key Features:**
- **Real-time updates**: Events emitted as runs progress (not buffered)
- **Type-safe**: Discriminated union with TypeScript type narrowing
- **Error handling**: Callback errors don't crash detector (silently caught)
- **CLI streaming**: NDJSON format for easy parsing line-by-line
- **API flexibility**: Optional `onProgress` callback in all API functions

**Use Cases:**
- CI/CD systems that need real-time progress (e.g., GitHub Actions status updates)
- Progress bars in CLI wrappers
- Early detection/cancellation (monitor events and abort if needed)
- Custom logging/reporting pipelines

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

**Phase 1 Enhancement:** Separated invalid arguments from flaky detection.

| Code | Meaning | Description |
|------|---------|-------------|
| 0 | Success | Detection successful, no flaky tests found |
| 1 | Flaky Detected | One or more flaky tests found |
| 2 | Invalid Args | Invalid arguments or validation error |

**Example:**
```bash
flaky --test "npm test" --runs 10
echo $?  # 0 = no flaky, 1 = flaky found, 2 = invalid args
```

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

## Changelog

### v0.3.0 - 2026-01-08 (Phase 4)

- **Streaming API** for real-time progress monitoring:
  - `ProgressEvent` type union with 4 event types (start, run-start, run-complete, complete)
  - Optional `onProgress` callback in all API functions (detect, isFlaky, compileDetector)
  - CLI `--stream` flag for NDJSON output
  - Error-resistant: callback errors don't crash detector
- **Enhanced examples** in help text showing streaming usage
- **Test coverage**: 212 tests (+25 streaming tests, +13%)
- Real-time event emission (not buffered)
- Type-safe discriminated unions for event handling

### v0.2.5 - 2026-01-08 (Phase 3)

- **Machine-readable output formats** for CI/CD integration:
  - `--format json` (default) - Complete DetectionReport in JSON
  - `--format text` - Human-readable text output with emojis
  - `--format minimal` - Only flaky test names (pipe-friendly)
- **New formatters module** (src/formatters.ts):
  - `formatJSON()` - Pretty-printed JSON output
  - `formatText()` - Human-readable text with summary
  - `formatMinimal()` - Test names only (one per line)
  - `formatReport()` - Unified formatter with exhaustiveness checking
- **Error handling improvements** in all formatters
- **Test coverage**: 189 tests (+29 formatter tests, +18%)
- Proper error display in all output formats
- CLI --format flag validation and help text

### v0.2.0 - 2026-01-08 (Phase 1)

- **Multi-tier API design** following Property Validator gold standard:
  - `detect()` - Full detection with Result type (non-throwing)
  - `isFlaky()` - Fast boolean check for CI gates
  - `compileDetector()` - Pre-compiled detector for repeated use
- **Result type pattern** for non-throwing error handling
- **Exit code separation**: 0 (success), 1 (flaky), 2 (invalid args)
- **Tree-shaking support** via exports field in package.json
- **Test suite expansion**: 132 → 160 tests (+28 API tests, +21%)
- **Backward compatibility**: Legacy `detectFlakiness()` API preserved
- Full JSDoc coverage with @example blocks

### v0.1.0 - 2025-12-29

- Initial release
- Test command execution with configurable runs
- Suite-level flakiness detection
- JSON report generation
- CLI and library interfaces
- Comprehensive test suite (132 tests)
- **Required dependency**: cli-progress-reporting for progress tracking (Tuulbelt tool composition)
- Zero external runtime dependencies
