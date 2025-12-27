# Troubleshooting

Common issues and solutions when using Test Flakiness Detector.

## Command Not Found Errors

### "tsx: command not found"

**Cause:** Dev dependencies not installed.

**Solution:**
```bash
cd test-flakiness-detector
npm install
```

### "npx: command not found"

**Cause:** npm/Node.js not installed.

**Solution:**
```bash
# Install Node.js 18+ from nodejs.org
node --version  # Verify installation
```

## Module Errors

### "Cannot find module @types/node"

**Cause:** Missing dev dependency.

**Solution:**
```bash
npm install --save-dev @types/node
```

### "require() not defined in ES module"

**Cause:** Using CommonJS `require()` in ES module context.

**Solution:** Use `import` instead:
```typescript
// ❌ Wrong
const { detectFlakiness } = require('./src/index.js');

// ✅ Correct
import { detectFlakiness } from './src/index.js';
```

## Test Execution Issues

### Tests Don't Run

**Symptom:** Tool completes but no runs shown.

**Cause:** Test command invalid.

**Solution:** Verify command works standalone:
```bash
# Test your command first
npm test  # Does this work?

# Then use it
flaky --test "npm test"
```

### Tests Timeout

**Symptom:** Tool hangs indefinitely.

**Cause:** Test command waits for input or hangs.

**Solution:** Add shell timeout:
```bash
timeout 5m flaky --test "npm test" --runs 10
```

### Wrong Tests Running

**Symptom:** Different tests run than expected.

**Cause:** Test command runs wrong suite.

**Solution:** Be explicit:
```bash
# Specify exact test file/pattern
flaky --test "npm run test:unit"
flaky --test "jest tests/integration"
```

## Output Issues

### No JSON Output

**Symptom:** Empty output or plain text instead of JSON.

**Cause:** Output redirected or verbose mode enabled.

**Solution:**
```bash
# Ensure stdout is JSON
flaky --test "npm test" > report.json

# Don't use --verbose if you need JSON
flaky --test "npm test" --runs 10  # Not: --verbose
```

### "Cannot parse JSON"

**Symptom:** Tools can't parse output.

**Cause:** Test output mixed with tool output.

**Solution:** Suppress test output:
```bash
# Redirect test stderr
flaky --test "npm test 2>/dev/null"
```

## Performance Issues

### Takes Too Long

**Symptom:** Detection takes hours.

**Cause:** Too many runs or slow tests.

**Solution:** Reduce runs or parallelize:
```bash
# Reduce runs
flaky --test "npm test" --runs 10  # Instead of 100

# Or run in parallel (manual merge)
for i in {1..4}; do
  flaky --test "npm test" --runs 25 > report-$i.json &
done
wait
```

### Out of Memory

**Symptom:** Process killed, "out of memory" error.

**Cause:** Too many runs or large test output.

**Solution:**
```bash
# Increase Node memory
NODE_OPTIONS=--max-old-space-size=4096 flaky --test "npm test"

# Or reduce runs
flaky --test "npm test" --runs 10
```

## CI/CD Issues

### GitHub Actions Timeout

**Symptom:** Workflow times out after 6 hours.

**Cause:** Too many runs.

**Solution:**
```yaml
# Limit runs in CI
- run: flaky --test "npm test" --runs 20  # Not 500
  timeout-minutes: 30
```

### Permission Denied

**Symptom:** "EACCES: permission denied"

**Cause:** Script not executable.

**Solution:**
```bash
chmod +x src/index.ts
```

## False Positives

### All Tests Marked Flaky

**Symptom:** Every test shows as flaky.

**Cause:** Test command itself is flaky (e.g., network issues).

**Solution:** Run tests standalone first:
```bash
# Run tests 5 times manually
for i in {1..5}; do npm test; done

# If those are flaky, fix tests first
```

### No Flaky Tests Found (But They Exist)

**Symptom:** Known flaky test not detected.

**Cause:** Not enough runs.

**Solution:** Increase runs:
```bash
# If test fails 1% of time, need 100+ runs
flaky --test "npm test" --runs 200
```

## Platform-Specific Issues

### Windows: "Command not recognized"

**Symptom:** Test command fails on Windows.

**Cause:** Shell differences (bash vs cmd).

**Solution:** Use cross-platform commands:
```bash
# Instead of bash-specific
flaky --test "npm test"  # Works everywhere

# Not
flaky --test "bash run-tests.sh"  # Unix only
```

### macOS: "Operation not permitted"

**Symptom:** Permission errors on macOS.

**Cause:** Gatekeeper or System Integrity Protection.

**Solution:**
```bash
# Grant terminal full disk access in System Preferences
# Or run with sudo (not recommended)
sudo flaky --test "npm test"
```

## Debugging

### Enable Verbose Mode

See what's happening:
```bash
flaky --test "npm test" --runs 5 --verbose
```

Output:
```
Run 1/5: ✅ Passed (exit code: 0)
Run 2/5: ❌ Failed (exit code: 1)
...
```

### Check Individual Run Results

Inspect the report:
```bash
flaky --test "npm test" --runs 5 | jq '.runs[]'
```

### Test Command Directly

Verify test command works:
```bash
# Run command exactly as tool would
npm test

# Check exit code
echo $?  # Should be 0 for pass, non-zero for fail
```

## Still Having Issues?

1. **Check Node version:** `node --version` (need 18+)
2. **Reinstall dependencies:** `rm -rf node_modules && npm install`
3. **Try minimal example:** `flaky --test "echo test" --runs 3`
4. **Check GitHub issues:** [Report a bug](https://github.com/tuulbelt/tuulbelt/issues)

## See Also

- [Configuration](/guide/configuration) - Tool settings
- [Best Practices](/guide/best-practices) - Usage recommendations
- [Examples](/guide/examples) - Working examples
