# Configuration

Test Flakiness Detector has minimal configuration by design - most settings are passed as command-line flags or function arguments.

## Command-Line Options

### `--test <command>`

**Required.** The test command to execute.

```bash
flaky --test "npm test"
```

### `--runs <number>`

**Optional.** Number of times to run tests. Default: `10`

```bash
flaky --test "npm test" --runs 50
```

**Recommended values:**
- **Quick check:** 5-10 runs
- **Standard:** 20-30 runs
- **Thorough:** 50-100 runs
- **Extreme:** 100+ runs (for rarely flaky tests)

### `--verbose`

**Optional.** Enable verbose output. Default: `false`

```bash
flaky --test "npm test" --verbose
```

Shows real-time output:
```
Run 1/20: ✅ Passed (exit code: 0)
Run 2/20: ❌ Failed (exit code: 1)
Run 3/20: ✅ Passed (exit code: 0)
...
```

## Programmatic Configuration

```typescript
import { detectFlakiness, FlakinessOptions } from './src/index.js';

const options: FlakinessOptions = {
  testCommand: 'npm test',  // Required
  runs: 20,                 // Optional, default: 10
  verbose: false            // Optional, default: false
};

const report = await detectFlakiness(options);
```

## Environment Variables

No environment variables used. All configuration via explicit arguments.

## Configuration Files

**None needed.** The tool intentionally avoids configuration files to stay simple and portable.

## CI/CD Configuration

### GitHub Actions

```yaml
env:
  TEST_RUNS: 30  # Control via environment

jobs:
  flakiness-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check for flaky tests
        run: |
          flaky \
            --test "npm test" \
            --runs ${{ env.TEST_RUNS }}
```

### GitLab CI

```yaml
variables:
  FLAKINESS_RUNS: "50"

test:flakiness:
  script:
    - flaky --test "npm test" --runs $FLAKINESS_RUNS
```

## Test Command Configuration

The `--test` argument can be any shell command:

```bash
# npm scripts
--test "npm test"
--test "npm run test:unit"

# Direct commands
--test "pytest tests/"
--test "cargo test"
--test "go test ./..."

# With arguments
--test "jest --coverage"
--test "pytest tests/ -v"

# Shell scripts
--test "bash ./run-tests.sh"
--test "./test-suite"
```

## Output Configuration

### JSON Format

Default output is JSON to stdout:

```bash
flaky --test "npm test" > report.json
```

### Custom Processing

Pipe to tools for custom formatting:

```bash
# Pretty print
flaky --test "npm test" | jq

# Extract flaky tests
flaky --test "npm test" | jq '.flakyTests[].testName'

# Check if any flaky
flaky --test "npm test" | jq -e '.flakyTests | length > 0'
```

## Performance Tuning

### Parallel Execution

Tests run **sequentially** by default (one after another). For faster results, run multiple instances in parallel:

```bash
# Run 4 instances of 25 runs each (100 total)
for i in {1..4}; do
  flaky --test "npm test" --runs 25 > report-$i.json &
done
wait
```

Then merge results manually.

### Timeout Handling

If tests hang, use shell timeout:

```bash
timeout 5m flaky --test "npm test" --runs 100
```

## Best Practices

### Choose Appropriate Run Count

```typescript
// For frequently flaky tests (fail >10% of time)
{ runs: 10 }  // Sufficient to detect

// For occasionally flaky tests (fail 1-5% of time)
{ runs: 50 }  // Better confidence

// For rarely flaky tests (fail <1% of time)
{ runs: 100 } // Needed to catch them
```

### Use Verbose for Debugging

```bash
# When debugging a specific flaky test
flaky --test "npm test" --runs 20 --verbose
```

### Separate Test Suites

```bash
# Check each suite independently
flaky --test "npm run test:unit" --runs 20
flaky --test "npm run test:integration" --runs 30
flaky --test "npm run test:e2e" --runs 10
```

## See Also

- [CLI Usage](/guide/cli-usage) - Command-line interface details
- [Library Usage](/guide/library-usage) - Programmatic API
- [Best Practices](/guide/best-practices) - Usage recommendations
