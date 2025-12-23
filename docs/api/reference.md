# API Reference

## detectFlakiness()

Main function for detecting test flakiness.

### Signature

```typescript
function detectFlakiness(config: Config): FlakinessReport
```

### Parameters

- `config.testCommand` (string, required) - Test command to execute
- `config.runs` (number, optional) - Number of runs (default: 10, max: 1000)
- `config.verbose` (boolean, optional) - Enable verbose logging (default: false)

### Returns

`FlakinessReport` object:

```typescript
{
  success: boolean           // Whether detection completed
  totalRuns: number          // Total test runs
  passedRuns: number         // Number of passed runs
  failedRuns: number         // Number of failed runs
  flakyTests: TestFlakiness[]// Detected flaky tests
  runs: TestRunResult[]      // All run results
  error?: string             // Error message if failed
}
```

### Example

```typescript
import { detectFlakiness } from './src/index.js';

const report = detectFlakiness({
  testCommand: 'npm test',
  runs: 20,
  verbose: true
});

if (report.flakyTests.length > 0) {
  console.log('Flaky tests found!');
  report.flakyTests.forEach(test => {
    console.log(`${test.testName}: ${test.failureRate}% failure rate`);
  });
}
```

## Types

See [Types](/api/types) for complete type definitions.
