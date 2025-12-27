#!/bin/bash
#
# Dogfooding: Output Diffing Utility integration
#
# This script demonstrates HIGH-VALUE composition:
# When tests fail intermittently, compare the different outputs to understand
# WHY they're flaky (timestamps? random data? race conditions?).
#
# Real-World Use Case:
#   Developer notices flaky test → Run this script → See what's changing
#   between runs → Fix the actual cause of flakiness
#
# Composability Demo:
#   TypeScript (flakiness detector) → Rust (output diff) → Developer insights
#
# Usage:
#   ./scripts/dogfood-diff.sh [test-command]
#
# Examples:
#   ./scripts/dogfood-diff.sh "npm test"
#   ./scripts/dogfood-diff.sh "cargo test"
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL_DIR="$(dirname "$SCRIPT_DIR")"
DIFF_DIR="$TOOL_DIR/../output-diffing-utility"
TEMP_DIR="/tmp/flaky-diff-demo-$$"

TEST_CMD="${1:-npm test}"

echo "🔬 Dogfooding: Output Diffing Utility + Test Flakiness Detector"
echo ""
echo "This demonstrates finding the ROOT CAUSE of flaky tests:"
echo "  Run tests twice → Capture outputs → Diff them → See what changes"
echo ""
echo "Test command: $TEST_CMD"
echo ""

# Verify Output Diffing Utility exists
if [ ! -d "$DIFF_DIR" ]; then
    echo "⚠️  Output Diffing Utility not found at: $DIFF_DIR"
    echo ""
    echo "Falling back to standard diff..."
    echo ""

    mkdir -p "$TEMP_DIR"

    # Run twice with standard tools
    cd "$TOOL_DIR"
    npx flaky --test "$TEST_CMD" --runs 1 > "$TEMP_DIR/run1.txt" 2>&1 || true
    npx flaky --test "$TEST_CMD" --runs 1 > "$TEMP_DIR/run2.txt" 2>&1 || true

    echo "📊 Differences between runs:"
    diff "$TEMP_DIR/run1.txt" "$TEMP_DIR/run2.txt" || echo "(No differences - tests are deterministic!)"

    rm -rf "$TEMP_DIR"
    exit 0
fi

# Build diff tool if needed
if [ ! -f "$DIFF_DIR/target/release/output-diff" ]; then
    echo "🔨 Building Output Diffing Utility..."
    (cd "$DIFF_DIR" && cargo build --release 2>&1 | grep -v "Compiling\|Finished" || true)
fi

echo "✅ Output Diffing Utility available"
echo ""

mkdir -p "$TEMP_DIR"

echo "🔄 Running test command twice to capture outputs..."
echo ""

# Run 1
echo "  [Run 1/2] Executing test command..."
cd "$TOOL_DIR"
npx flaky --test "$TEST_CMD" --runs 1 > "$TEMP_DIR/run1.txt" 2>&1 || true
echo "  ✓ Run 1 complete"

# Run 2
echo "  [Run 2/2] Executing test command..."
npx flaky --test "$TEST_CMD" --runs 1 > "$TEMP_DIR/run2.txt" 2>&1 || true
echo "  ✓ Run 2 complete"
echo ""

# Diff the outputs
echo "📊 Comparing outputs with Output Diffing Utility..."
echo "---"
cd "$DIFF_DIR"
./target/release/output-diff "$TEMP_DIR/run1.txt" "$TEMP_DIR/run2.txt" || {
  DIFF_EXIT=$?
  if [ $DIFF_EXIT -eq 1 ]; then
    echo ""
    echo "⚠️  DIFFERENCES FOUND between test runs!"
    echo ""
    echo "💡 This indicates potential sources of flakiness:"
    echo "   - Timestamps or Date.now() in test output"
    echo "   - Random data generation (Math.random(), UUIDs)"
    echo "   - Race conditions in async code"
    echo "   - File system timing variations"
    echo "   - Process IDs or memory addresses"
    echo ""
    echo "🔍 Review the diff above to identify the changing values."
  else
    echo ""
    echo "❌ Error running diff (exit code: $DIFF_EXIT)"
  fi
}

# Check if files are identical
if cmp -s "$TEMP_DIR/run1.txt" "$TEMP_DIR/run2.txt"; then
  echo ""
  echo "✅ Outputs are IDENTICAL!"
  echo ""
  echo "💡 Tests are producing consistent output across runs."
  echo "   This is a good sign - outputs are deterministic."
fi

echo "---"
echo ""

# Cleanup
rm -rf "$TEMP_DIR"

echo "✨ Composition Demo Complete!"
echo ""
echo "💡 Key Takeaways:"
echo "   - TypeScript tool (flakiness detector) → Rust tool (diff)"
echo "   - Diffing outputs reveals ROOT CAUSE of flakiness"
echo "   - Real debugging value: see WHAT changes between runs"
echo "   - Helps fix flaky tests instead of just detecting them"
echo ""
echo "🔗 See DOGFOODING_STRATEGY.md for implementation details"
