# Dogfooding Strategy: Test Flakiness Detector

This document outlines how the Test Flakiness Detector leverages other Tuulbelt tools to demonstrate composability.

## Multi-Tool Composition Goals

**Objective:** Demonstrate that Tuulbelt tools compose naturally through CLI interfaces and library APIs, enabling developers to build powerful test validation workflows.

## Identified Dogfooding Opportunities

### 1. CLI Progress Reporting (TypeScript library integration)

**Use Case:** Show real-time progress during long-running flakiness detection

**Integration Points:**
- Update progress for each test run (1/N, 2/N, etc.)
- Show pass/fail counts in real-time
- Track overall progress percentage

**Implementation:**
```typescript
// Already integrated! See src/index.ts
import { loadOptionalProgressReporter } from './progress.js';

const progress = await loadOptionalProgressReporter();
if (progress) {
  await progress.init({ total: runs, message: 'Running flakiness detection' });
  for (let i = 0; i < runs; i++) {
    await progress.set({ current: i + 1, message: `Run ${i + 1}/${runs}` });
  }
  await progress.finish({ message: 'Detection complete' });
}
```

**Status:** ✅ Already implemented (direct library integration with graceful fallback)

---

### 2. Output Diffing Utility (Rust → TypeScript)

**Use Case:** When tests fail intermittently, compare the different failure outputs to understand what's changing

**Integration Points:**
- Capture stdout/stderr for failed test runs
- Diff outputs between first failure and subsequent failures
- Help developers understand WHY tests are flaky

**Implementation:**
```bash
#!/bin/bash
# scripts/dogfood-diff.sh
# Compare outputs from different test runs to find what's changing

TOOL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIFF_DIR="$TOOL_DIR/../output-diffing-utility"
TEMP_DIR="/tmp/flaky-diff-$$"

mkdir -p "$TEMP_DIR"

# Run test twice, capture outputs
npx tsx "$TOOL_DIR/src/index.ts" --test "npm test" --runs 1 > "$TEMP_DIR/run1.txt" 2>&1 || true
npx tsx "$TOOL_DIR/src/index.ts" --test "npm test" --runs 1 > "$TEMP_DIR/run2.txt" 2>&1 || true

# Diff the outputs
if [ -d "$DIFF_DIR" ]; then
  cd "$DIFF_DIR"
  cargo run --release --quiet -- "$TEMP_DIR/run1.txt" "$TEMP_DIR/run2.txt"
else
  echo "Output Diffing Utility not available (standalone mode)"
  diff "$TEMP_DIR/run1.txt" "$TEMP_DIR/run2.txt" || true
fi

rm -rf "$TEMP_DIR"
```

**Example:**
```bash
$ cd test-flakiness-detector
$ ./scripts/dogfood-diff.sh
# Shows differences in test outputs between runs
# Helps identify: timestamp variations, random data, race conditions
```

---

### 3. Cross-Platform Path Normalizer (Validated by this tool)

**Use Case:** Validate that Path Normalizer's test suite is non-flaky

**Integration Points:**
- Run path normalizer tests multiple times
- Verify deterministic behavior across runs
- Example of using this tool to dogfood other tools

**Implementation:**
```bash
#!/bin/bash
# scripts/dogfood-paths.sh
# Validate cross-platform-path-normalizer tests for flakiness

TOOL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PATHS_DIR="$TOOL_DIR/../cross-platform-path-normalizer"
RUNS="${1:-10}"

if [ ! -d "$PATHS_DIR" ]; then
  echo "Cross-Platform Path Normalizer not found (standalone mode)"
  exit 1
fi

echo "🔬 Validating Cross-Platform Path Normalizer test suite"
echo "   Running $RUNS iterations..."
echo ""

cd "$TOOL_DIR"
npx tsx src/index.ts \
  --test "cd '$PATHS_DIR' && npm test 2>&1" \
  --runs "$RUNS" \
  --verbose
```

**Example:**
```bash
$ cd test-flakiness-detector
$ ./scripts/dogfood-paths.sh 20
✅ NO FLAKINESS DETECTED (145 tests × 20 runs = 2,900 executions)
```

---

### 4. CLI Progress Reporting (Validated by this tool)

**Use Case:** Validate that CLI Progress Reporting's test suite is non-flaky

**Integration Points:**
- Run progress reporting tests multiple times
- Verify deterministic behavior (critical for concurrent progress tracking)
- Creates a bidirectional validation relationship

**Implementation:**
```bash
#!/bin/bash
# scripts/dogfood-progress.sh
# Validate cli-progress-reporting tests for flakiness

TOOL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROGRESS_DIR="$TOOL_DIR/../cli-progress-reporting"
RUNS="${1:-20}"

if [ ! -d "$PROGRESS_DIR" ]; then
  echo "CLI Progress Reporting not found (standalone mode)"
  exit 1
fi

echo "🔬 Validating CLI Progress Reporting test suite"
echo "   Running $RUNS iterations (high count for concurrent safety)..."
echo ""

cd "$TOOL_DIR"
npx tsx src/index.ts \
  --test "cd '$PROGRESS_DIR' && npm test 2>&1" \
  --runs "$RUNS" \
  --verbose
```

**Example:**
```bash
$ cd test-flakiness-detector
$ ./scripts/dogfood-progress.sh 20
✅ NO FLAKINESS DETECTED (125 tests × 20 runs = 2,500 executions)
```

This creates a **bidirectional validation** where:
- Test Flakiness Detector uses CLI Progress Reporting for progress tracking
- Test Flakiness Detector validates CLI Progress Reporting's test reliability

---

### 5. File-Based Semaphore (Rust → TypeScript)

**Use Case:** Demonstrate concurrent flakiness detection with cache protection

**Integration Points:**
- Cache test results to avoid re-running identical test commands
- Protect cache with file-based semaphore
- Show Rust ↔ TypeScript composition

**Implementation:**
```bash
#!/bin/bash
# scripts/dogfood-semaphore.sh
# Demonstrate concurrent flakiness detection with cache locking

TOOL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SEMAPHORE_DIR="$TOOL_DIR/../file-based-semaphore"
CACHE_DIR="/tmp/flaky-cache-$$"
LOCK_FILE="/tmp/flaky-lock-$$.lock"

mkdir -p "$CACHE_DIR"

if [ ! -d "$SEMAPHORE_DIR" ] || [ ! -f "$SEMAPHORE_DIR/target/release/file-semaphore" ]; then
  echo "File-Based Semaphore not available (standalone mode)"
  exit 1
fi

SEMAPHORE="$SEMAPHORE_DIR/target/release/file-semaphore"

run_detection_with_cache() {
  local id="$1"
  local test_cmd="npm test"
  local cache_key=$(echo -n "$test_cmd" | md5sum | cut -d' ' -f1)
  local cache_file="$CACHE_DIR/$cache_key.json"

  echo "[$id] Acquiring lock..."
  if "$SEMAPHORE" try "$LOCK_FILE" 2>/dev/null; then
    echo "[$id] Lock acquired"

    if [ -f "$cache_file" ]; then
      echo "[$id] Cache hit! Reading cached result..."
      cat "$cache_file"
    else
      echo "[$id] Cache miss. Running detection..."
      cd "$TOOL_DIR"
      npx tsx src/index.ts --test "$test_cmd" --runs 5 > "$cache_file"
      cat "$cache_file"
    fi

    "$SEMAPHORE" release "$LOCK_FILE" 2>/dev/null
    echo "[$id] Lock released"
  else
    echo "[$id] Lock held by another process, waiting..."
  fi
}

# Run two concurrent detections
run_detection_with_cache "Process-1" &
run_detection_with_cache "Process-2" &

wait

rm -rf "$CACHE_DIR" "$LOCK_FILE"
```

---

## Composability Demonstrations

### Multi-Tool Validation Pipeline

**Validate all Phase 1 tools for flakiness:**

```bash
#!/bin/bash
# scripts/dogfood-pipeline.sh
# Validate all Phase 1 tools using Test Flakiness Detector

TOOL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Phase 1 Tools: Flakiness Validation Pipeline           ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Tool 1: Test Flakiness Detector (self-test)
echo "1️⃣  Test Flakiness Detector (self-validation)"
npx tsx "$TOOL_DIR/src/index.ts" --test "cd '$TOOL_DIR' && npm test" --runs 10
echo ""

# Tool 2: CLI Progress Reporting
echo "2️⃣  CLI Progress Reporting"
npx tsx "$TOOL_DIR/src/index.ts" --test "cd '$TOOL_DIR/../cli-progress-reporting' && npm test" --runs 20
echo ""

# Tool 3: Cross-Platform Path Normalizer
echo "3️⃣  Cross-Platform Path Normalizer"
npx tsx "$TOOL_DIR/src/index.ts" --test "cd '$TOOL_DIR/../cross-platform-path-normalizer' && npm test" --runs 10
echo ""

# Tool 4: File-Based Semaphore
echo "4️⃣  File-Based Semaphore (Rust)"
npx tsx "$TOOL_DIR/src/index.ts" --test "cd '$TOOL_DIR/../file-based-semaphore' && cargo test" --runs 10
echo ""

# Tool 5: Output Diffing Utility
echo "5️⃣  Output Diffing Utility (Rust)"
npx tsx "$TOOL_DIR/src/index.ts" --test "cd '$TOOL_DIR/../output-diffing-utility' && cargo test" --runs 10
echo ""

echo "✅ All Phase 1 tools validated for flakiness!"
```

---

## Implementation Checklist

- [x] ~~Integrate CLI Progress Reporting for real-time updates~~ → Already integrated in `src/progress.ts`
- [ ] Add `scripts/dogfood-diff.sh` for comparing test outputs
- [ ] Add `scripts/dogfood-paths.sh` for validating Path Normalizer
- [ ] Add `scripts/dogfood-progress.sh` for validating Progress Reporting (bidirectional)
- [ ] Add `scripts/dogfood-semaphore.sh` for concurrent detection demo
- [ ] Add `scripts/dogfood-pipeline.sh` for validating all Phase 1 tools
- [ ] Document all compositions in README
- [ ] Test graceful fallback when tools not available (standalone mode)

---

## Expected Outcomes

1. **Demonstrates Composability Principle**
   - Tool uses CLI Progress Reporting (library integration)
   - Tool validates other tools (CLI composition)
   - Tools validate each other (bidirectional relationship)
   - Works across programming languages (TypeScript ↔ Rust)

2. **Real-World Value**
   - Progress tracking for long test runs
   - Output diffing helps understand flaky behavior
   - Concurrent detection with cache protection
   - Validates entire Phase 1 tool suite

3. **Validates Tuulbelt Philosophy**
   - Zero dependencies (graceful fallback)
   - Portable interfaces (CLI + library)
   - Single problem per tool (each focused)
   - Independently cloneable (works standalone)

---

**Status:** Partially implemented - CLI Progress integration done, need composition scripts
**Next:** Implement composition scripts demonstrating Output Diffing and Semaphore integration
