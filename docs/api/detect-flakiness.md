# detectFlakiness()

The main function for detecting flaky tests.

## Signature

```typescript
async function detectFlakiness(options: FlakinessOptions): Promise<FlakinessReport>
```

## Parameters

### `options: FlakinessOptions`

Configuration object with the following properties:

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `testCommand` | `string` | ✅ Yes | - | Shell command to run tests |
| `runs` | `number` | ❌ No | `10` | Number of times to execute tests |
| `verbose` | `boolean` | ❌ No | `false` | Enable verbose console output |

## Returns

### `FlakinessReport`

Object containing detection results:

```typescript
interface FlakinessReport {
  success: boolean;          // Detection completed successfully
  totalRuns: number;         // Total test executions
  passedRuns: number;        // Number of passing runs
  failedRuns: number;        // Number of failing runs
  flakyTests: TestFlakiness[]; // Array of detected flaky tests
  runs: TestRunResult[];     // Individual run results
  error?: string;            // Error message if detection failed
}
```

See [Types](/api/types) for complete type definitions.

## Basic Usage

```typescript
import { detectFlakiness } from '@tuulbelt/test-flakiness-detector';

const report = await detectFlakiness({
  testCommand: 'npm test',
  runs: 20
});

console.log(`Found ${report.flakyTests.length} flaky test(s)`);
```

## Examples

### Minimal Example

```typescript
const report = await detectFlakiness({
  testCommand: 'npm test'
});
// Uses default: 10 runs, verbose: false
```

### With All Options

```typescript
const report = await detectFlakiness({
  testCommand: 'npm run test:integration',
  runs: 50,
  verbose: true
});
```

### Different Test Frameworks

**Jest:**
```typescript
await detectFlakiness({
  testCommand: 'jest tests/',
  runs: 20
});
```

**Pytest:**
```typescript
await detectFlakiness({
  testCommand: 'pytest tests/ -v',
  runs: 30
});
```

**Cargo:**
```typescript
await detectFlakiness({
  testCommand: 'cargo test',
  runs: 15
});
```

**Go:**
```typescript
await detectFlakiness({
  testCommand: 'go test ./...',
  runs: 25
});
```

## Checking Results

### Check for Any Flakiness

```typescript
const report = await detectFlakiness({
  testCommand: 'npm test',
  runs: 20
});

if (report.flakyTests.length > 0) {
  console.error('Flaky tests detected!');
  process.exit(1);
}
```

### Get Failure Rates

```typescript
const report = await detectFlakiness({
  testCommand: 'npm test',
  runs: 50
});

report.flakyTests.forEach(test => {
  console.log(`${test.testName}: ${test.failureRate}% failure rate`);
});
```

### Filter by Severity

```typescript
const report = await detectFlakiness({
  testCommand: 'npm test',
  runs: 100
});

// Only tests failing >10% of the time
const severe = report.flakyTests.filter(t => t.failureRate > 10);

// Only occasional flakiness (<5%)
const minor = report.flakyTests.filter(t => t.failureRate < 5);
```

## Error Handling

### Check Success Status

```typescript
const report = await detectFlakiness({
  testCommand: 'invalid-command',
  runs: 10
});

if (!report.success) {
  console.error('Detection failed:', report.error);
  process.exit(1);
}
```

### Try-Catch

```typescript
try {
  const report = await detectFlakiness({
    testCommand: 'npm test',
    runs: 20
  });

  // Process results
} catch (error) {
  console.error('Unexpected error:', error);
}
```

## Advanced Usage

### Custom Threshold

```typescript
function checkFlakiness(threshold: number = 5) {
  const report = await detectFlakiness({
    testCommand: 'npm test',
    runs: 100
  });

  const aboveThreshold = report.flakyTests.filter(
    test => test.failureRate >= threshold
  );

  if (aboveThreshold.length > 0) {
    console.error(`Found ${aboveThreshold.length} tests failing ≥${threshold}%`);
    return false;
  }

  return true;
}

if (!checkFlakiness(10)) {
  process.exit(1);
}
```

### Multiple Test Suites

```typescript
const suites = [
  { name: 'Unit', command: 'npm run test:unit', runs: 20 },
  { name: 'Integration', command: 'npm run test:integration', runs: 30 },
  { name: 'E2E', command: 'npm run test:e2e', runs: 10 }
];

const results = suites.map(suite => ({
  suite: suite.name,
  report: detectFlakiness({
    testCommand: suite.command,
    runs: suite.runs
  })
}));

results.forEach(({ suite, report }) => {
  console.log(`${suite}: ${report.flakyTests.length} flaky test(s)`);
});
```

### Generate Report

```typescript
import { writeFileSync } from 'fs';

const report = await detectFlakiness({
  testCommand: 'npm test',
  runs: 50
});

const summary = {
  timestamp: new Date().toISOString(),
  totalRuns: report.totalRuns,
  passRate: (report.passedRuns / report.totalRuns * 100).toFixed(2) + '%',
  flakyTestCount: report.flakyTests.length,
  flakyTests: report.flakyTests
};

writeFileSync('flakiness-report.json', JSON.stringify(summary, null, 2));
```

## Performance Considerations

### Run Count vs Time

- **10 runs:** ~10-30 seconds (fast, catches frequent flakiness)
- **50 runs:** ~1-3 minutes (thorough, catches moderate flakiness)
- **100 runs:** ~2-5 minutes (comprehensive, catches rare flakiness)
- **500+ runs:** May take hours (only for extremely rare flakiness)

### Memory Usage

Each run stores stdout/stderr in memory. For tests with large output:

```typescript
// Redirect output to reduce memory
await detectFlakiness({
  testCommand: 'npm test 2>/dev/null',
  runs: 100
});
```

## See Also

- [Types](/api/types) - Complete type definitions
- [API Reference](/api/reference) - Overview of all exports
- [Examples](/guide/examples) - Usage examples
- [CLI Usage](/guide/cli-usage) - Command-line interface
