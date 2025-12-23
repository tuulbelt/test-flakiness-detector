# Library Usage

Use Test Flakiness Detector programmatically in your Node.js code.

## Basic Import

```typescript
import { detectFlakiness } from './src/index.js';
```

## Simple Usage

```typescript
const report = detectFlakiness({
  testCommand: 'npm test',
  runs: 20
});

console.log(`Total runs: ${report.totalRuns}`);
console.log(`Flaky tests: ${report.flakyTests.length}`);
```

## Full Example

```typescript
import { detectFlakiness } from './src/index.js';

async function checkForFlakiness() {
  const report = detectFlakiness({
    testCommand: 'npm run test:integration',
    runs: 50,
    verbose: false
  });

  if (report.flakyTests.length > 0) {
    console.error('❌ Flaky tests detected:');

    report.flakyTests.forEach(test => {
      console.error(`  - ${test.testName}`);
      console.error(`    Failure rate: ${test.failureRate}%`);
      console.error(`    Passed: ${test.passed}, Failed: ${test.failed}`);
    });

    process.exit(1); // Fail CI
  } else {
    console.log('✅ All tests are stable');
    process.exit(0);
  }
}

checkForFlakiness();
```

## TypeScript Support

Full type definitions included:

```typescript
import {
  detectFlakiness,
  FlakinessReport,
  FlakinessOptions,
  TestFlakiness
} from './src/index.js';

const options: FlakinessOptions = {
  testCommand: 'npm test',
  runs: 30,
  verbose: true
};

const report: FlakinessReport = detectFlakiness(options);

report.flakyTests.forEach((test: TestFlakiness) => {
  console.log(test.testName, test.failureRate);
});
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Check for flaky tests
  run: |
    node -e "
      const { detectFlakiness } = require('./dist/index.js');
      const report = detectFlakiness({ testCommand: 'npm test', runs: 20 });
      if (report.flakyTests.length > 0) {
        console.error('Flaky tests found!');
        process.exit(1);
      }
    "
```

### GitLab CI

```yaml
test:flakiness:
  script:
    - npm run build
    - node check-flakiness.js
  artifacts:
    paths:
      - flakiness-report.json
```

Where `check-flakiness.js`:
```javascript
import { detectFlakiness } from './dist/index.js';
import { writeFileSync } from 'fs';

const report = detectFlakiness({
  testCommand: 'npm test',
  runs: 20
});

writeFileSync('flakiness-report.json', JSON.stringify(report, null, 2));

if (report.flakyTests.length > 0) {
  process.exit(1);
}
```

## Advanced Patterns

### Multiple Test Suites

```typescript
const suites = [
  { name: 'Unit', command: 'npm run test:unit' },
  { name: 'Integration', command: 'npm run test:integration' },
  { name: 'E2E', command: 'npm run test:e2e' }
];

suites.forEach(suite => {
  console.log(`Checking ${suite.name} tests...`);

  const report = detectFlakiness({
    testCommand: suite.command,
    runs: 10
  });

  if (report.flakyTests.length > 0) {
    console.error(`${suite.name}: ${report.flakyTests.length} flaky test(s)`);
  }
});
```

### Custom Thresholds

```typescript
const report = detectFlakiness({
  testCommand: 'npm test',
  runs: 100
});

// Only report tests that fail more than 5% of the time
const significantlyFlaky = report.flakyTests.filter(
  test => test.failureRate > 5
);

if (significantlyFlaky.length > 0) {
  console.error('Significantly flaky tests found');
  process.exit(1);
}
```

### Detailed Reporting

```typescript
const report = detectFlakiness({
  testCommand: 'npm test',
  runs: 20,
  verbose: true
});

// Generate detailed report
const summary = {
  totalRuns: report.totalRuns,
  passRate: (report.passedRuns / report.totalRuns * 100).toFixed(2),
  flakyCount: report.flakyTests.length,
  flakyTests: report.flakyTests.map(t => ({
    name: t.testName,
    failureRate: t.failureRate,
    reliability: 100 - t.failureRate
  }))
};

console.log(JSON.stringify(summary, null, 2));
```

## Error Handling

```typescript
try {
  const report = detectFlakiness({
    testCommand: 'invalid-command',
    runs: 10
  });

  if (!report.success) {
    console.error('Detection failed:', report.error);
  }
} catch (error) {
  console.error('Unexpected error:', error);
}
```

## See Also

- [API Reference](/api/reference) - Complete API documentation
- [Types](/api/types) - TypeScript type definitions
- [CLI Usage](/guide/cli-usage) - Command-line interface
