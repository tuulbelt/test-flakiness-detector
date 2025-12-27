# CLI Usage

Command-line interface for Test Flakiness Detector.

## Basic Syntax

```bash
flaky [options]
```

## Options

### `--test <command>`

**Required.** The test command to execute repeatedly.

```bash
flaky --test "npm test"
```

### `--runs <number>`

**Optional.** Number of times to run the tests. Default: `10`

```bash
flaky --test "npm test" --runs 20
```

### `--verbose`

**Optional.** Enable verbose output showing each run's result. Default: `false`

```bash
flaky --test "npm test" --verbose
```

## Examples

### Basic Flakiness Detection

```bash
flaky --test "npm test" --runs 10
```

### With Verbose Output

```bash
flaky --test "npm test" --runs 20 --verbose
```

### Different Test Frameworks

**Jest:**
```bash
flaky --test "npm run test:jest" --runs 15
```

**Pytest:**
```bash
flaky --test "pytest tests/" --runs 20
```

**Cargo:**
```bash
flaky --test "cargo test" --runs 10
```

**Go:**
```bash
flaky --test "go test ./..." --runs 15
```

## Output Format

The tool outputs JSON to stdout:

```json
{
  "success": true,
  "totalRuns": 10,
  "passedRuns": 8,
  "failedRuns": 2,
  "flakyTests": [
    {
      "testName": "async test",
      "passed": 8,
      "failed": 2,
      "totalRuns": 10,
      "failureRate": 20
    }
  ],
  "runs": [
    {
      "success": true,
      "exitCode": 0,
      "stdout": "...",
      "stderr": ""
    }
    // ... more runs
  ]
}
```

## Exit Codes

- `0` — Detection successful, results available
- `1` — Invalid arguments, execution error, or flaky tests detected

## Integration with CI/CD

### GitHub Actions

```yaml
- name: Detect flaky tests
  run: |
    flaky --test "npm test" --runs 20 > flakiness-report.json

- name: Check for flakiness
  run: |
    if grep -q '"flakyTests": \[\]' flakiness-report.json; then
      echo "No flaky tests detected"
    else
      echo "Flaky tests found!"
      exit 1
    fi
```

### GitLab CI

```yaml
test:flakiness:
  script:
    - flaky --test "npm test" --runs 20
  artifacts:
    paths:
      - flakiness-report.json
    when: always
```

### Jenkins

```groovy
stage('Flakiness Detection') {
  steps {
    sh 'flaky --test "npm test" --runs 20 > flakiness-report.json'
    archiveArtifacts artifacts: 'flakiness-report.json'
  }
}
```

## Tips

**Choose appropriate run count:**
- Highly flaky tests: 5-10 runs sufficient
- Occasionally flaky: 20-50 runs recommended
- Rarely flaky: 100+ runs may be needed

**Use verbose mode for debugging:**
```bash
flaky --test "npm test" --runs 10 --verbose
```

**Redirect output to file:**
```bash
flaky --test "npm test" > report.json
```

## See Also

- [Getting Started](/guide/getting-started) - Installation and setup
- [Examples](/guide/examples) - Real-world usage examples
- [API Reference](/api/reference) - Programmatic API
