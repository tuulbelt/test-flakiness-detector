# API Reference

## detectFlakiness()

Main function for detecting test flakiness.

### Signature

```typescript
async function detectFlakiness(config: Config): Promise<FlakinessReport>
```

### Parameters

- `config.testCommand` (string, required) - Test command to execute
- `config.runs` (number, optional) - Number of runs (default: 10, max: 1000)
- `config.threshold` (number, optional) - Flakiness threshold 0-100% (default: 0, any failure = flaky)
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

// With threshold to ignore rare failures
const report = await detectFlakiness({
  testCommand: 'npm test',
  runs: 20,
  threshold: 10,  // Only flag tests with >10% failure rate
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
