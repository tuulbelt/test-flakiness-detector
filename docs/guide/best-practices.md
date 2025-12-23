# Best Practices

Guidelines for effectively detecting and fixing flaky tests.

## Choosing Run Count

### Start Small
```bash
# Quick check - good for frequently flaky tests
npx tsx src/index.ts --test "npm test" --runs 10
```

If you find flaky tests, you're done. If not:

### Increase Gradually
```bash
# Medium check - catches moderately flaky tests
npx tsx src/index.ts --test "npm test" --runs 30

# Thorough check - catches rarely flaky tests
npx tsx src/index.ts --test "npm test" --runs 100
```

### Rule of Thumb

| Failure Rate | Runs Needed | Example |
|--------------|-------------|---------|
| >10% (frequent) | 10 runs | Fails 1+ times in 10 runs |
| 5-10% (moderate) | 20-30 runs | Fails 1-3 times in 30 runs |
| 1-5% (occasional) | 50-100 runs | Fails 1-5 times in 100 runs |
| <1% (rare) | 200+ runs | Fails <2 times in 200 runs |

## When to Run Detection

### ✅ Before Merging PRs

Catch flaky tests before they hit main:

```yaml
# .github/workflows/pr-checks.yml
- name: Check for flaky tests
  run: npx tsx src/index.ts --test "npm test" --runs 20
```

### ✅ After Refactoring

Major changes can introduce flakiness:

```bash
# After changing test setup/teardown
npx tsx src/index.ts --test "npm test" --runs 50
```

### ✅ On Schedule

Weekly/monthly checks:

```yaml
# Run every Sunday
schedule:
  - cron: '0 0 * * 0'
```

### ❌ Don't Run on Every Commit

Too slow. Reserve for important checks.

## Interpreting Results

### High Failure Rate (>50%)

**Likely not flaky** - probably a real bug or environmental issue.

```json
{
  "failureRate": 80,
  "passed": 2,
  "failed": 8
}
```

**Action:** Investigate the test, not the flakiness.

### Medium Failure Rate (10-50%)

**Definitely flaky** - priority to fix.

```json
{
  "failureRate": 25,
  "passed": 15,
  "failed": 5
}
```

**Action:** Add to flaky test backlog, fix soon.

### Low Failure Rate (<10%)

**Occasionally flaky** - monitor or fix.

```json
{
  "failureRate": 5,
  "passed": 95,
  "failed": 5
}
```

**Action:** Decide if fixing is worth the effort.

## Fixing Flaky Tests

### Common Causes

**1. Race Conditions**
```typescript
// ❌ Flaky
test('async operation', () => {
  doAsyncThing();
  expect(result).toBe(expected); // Might not be done yet
});

// ✅ Fixed
test('async operation', async () => {
  await doAsyncThing();
  expect(result).toBe(expected);
});
```

**2. Timing Dependencies**
```typescript
// ❌ Flaky
test('timeout', () => {
  setTimeout(() => done(), 100); // Might take longer
});

// ✅ Fixed
test('timeout', async () => {
  await waitForCondition(() => isDone());
});
```

**3. Shared State**
```typescript
// ❌ Flaky (tests share global state)
let globalCounter = 0;

test('increment', () => {
  globalCounter++;
  expect(globalCounter).toBe(1); // Depends on run order
});

// ✅ Fixed (isolated state)
test('increment', () => {
  const counter = 0;
  const result = counter + 1;
  expect(result).toBe(1);
});
```

**4. External Dependencies**
```typescript
// ❌ Flaky (network, DB, filesystem)
test('fetch data', async () => {
  const data = await fetch('https://api.example.com');
  expect(data).toBeDefined();
});

// ✅ Fixed (mocked)
test('fetch data', async () => {
  const mockFetch = jest.fn().mockResolvedValue({ data: 'test' });
  const data = await mockFetch();
  expect(data).toBeDefined();
});
```

**5. Non-Deterministic Data**
```typescript
// ❌ Flaky
test('random', () => {
  const value = Math.random();
  expect(value).toBeGreaterThan(0.5); // 50% chance of failure
});

// ✅ Fixed
test('random', () => {
  const mockRandom = jest.spyOn(Math, 'random').mockReturnValue(0.7);
  const value = Math.random();
  expect(value).toBeGreaterThan(0.5);
  mockRandom.mockRestore();
});
```

## Preventing Flakiness

### 1. Deterministic Tests

Always produce same result for same input:
- Mock random values
- Mock timestamps
- Mock external dependencies

### 2. Proper Async Handling

```typescript
// Always await promises
await asyncFunction();

// Use proper test framework async support
test('async', async () => {
  await expect(promise).resolves.toBe(value);
});
```

### 3. Test Isolation

Each test should be independent:
- Clean up after tests
- Reset mocks
- Don't depend on test order

### 4. Explicit Waits

```typescript
// Instead of arbitrary timeouts
await sleep(1000);

// Wait for specific conditions
await waitFor(() => element.isVisible());
```

### 5. Stable Selectors

```typescript
// ❌ Fragile
cy.get('.btn-1').click();

// ✅ Stable
cy.get('[data-testid="submit-button"]').click();
```

## CI/CD Integration

### Fail Build on Flakiness

```yaml
- name: Flakiness check
  run: |
    npx tsx src/index.ts --test "npm test" --runs 20 > report.json

    # Fail if any flaky tests found
    FLAKY_COUNT=$(jq '.flakyTests | length' report.json)
    if [ $FLAKY_COUNT -gt 0 ]; then
      echo "Found $FLAKY_COUNT flaky test(s)"
      exit 1
    fi
```

### Weekly Audit

```yaml
schedule:
  - cron: '0 0 * * 0'  # Sundays at midnight

jobs:
  weekly-flakiness:
    steps:
      - run: npx tsx src/index.ts --test "npm test" --runs 100
      - uses: actions/upload-artifact@v3
        with:
          name: flakiness-report
          path: report.json
```

## Monitoring

### Track Over Time

```bash
# Add timestamp to reports
DATE=$(date +%Y-%m-%d)
npx tsx src/index.ts --test "npm test" --runs 50 > "reports/$DATE.json"
```

### Alert on New Flakiness

```bash
# Compare with previous report
PREV_COUNT=$(jq '.flakyTests | length' reports/previous.json)
CURR_COUNT=$(jq '.flakyTests | length' reports/current.json)

if [ $CURR_COUNT -gt $PREV_COUNT ]; then
  echo "⚠️ New flaky tests introduced!"
fi
```

## See Also

- [Troubleshooting](/guide/troubleshooting) - Common issues and solutions
- [Configuration](/guide/configuration) - Tool settings
- [Examples](/guide/examples) - Real-world patterns
