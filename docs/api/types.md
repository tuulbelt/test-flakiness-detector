# Type Definitions

Type definitions for the Test Flakiness Detector API.

## FlakinessReport

The main report object returned by `detectFlakiness()`.

```typescript
interface FlakinessReport {
  success: boolean;          // Overall detection success
  totalRuns: number;         // Total test executions
  passedRuns: number;        // Number of passing runs
  failedRuns: number;        // Number of failing runs
  flakyTests: TestFlakiness[]; // Detected flaky tests
  runs: TestRunResult[];     // Individual run results
  error?: string;            // Error message if detection failed
}
```

## TestFlakiness

Information about a detected flaky test.

```typescript
interface TestFlakiness {
  testName: string;   // Name of the flaky test
  passed: number;     // Number of times it passed
  failed: number;     // Number of times it failed
  totalRuns: number;  // Total runs for this test
  failureRate: number; // Percentage failure rate (0-100)
}
```

## TestRunResult

Result of a single test execution.

```typescript
interface TestRunResult {
  success: boolean;  // Whether the test passed
  exitCode: number;  // Process exit code
  stdout: string;    // Standard output
  stderr: string;    // Standard error
}
```

## FlakinessOptions

Configuration options for flakiness detection.

```typescript
interface FlakinessOptions {
  testCommand: string;  // Command to run tests
  runs?: number;        // Number of times to run (default: 10)
  verbose?: boolean;    // Enable verbose output (default: false)
}
```

## Usage Example

```typescript
import { detectFlakiness, FlakinessReport } from '@tuulbelt/test-flakiness-detector';

const report: FlakinessReport = detectFlakiness({
  testCommand: 'npm test',
  runs: 20,
  verbose: true
});

// Check for flaky tests
if (report.flakyTests.length > 0) {
  console.log(`Found ${report.flakyTests.length} flaky test(s)`);
  report.flakyTests.forEach(test => {
    console.log(`${test.testName}: ${test.failureRate}% failure rate`);
  });
}
```

## See Also

- [API Reference](/api/reference) - Main API documentation
- [CLI Usage](/guide/cli-usage) - Command-line interface
