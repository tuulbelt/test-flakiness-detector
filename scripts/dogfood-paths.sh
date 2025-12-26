#!/bin/bash
#
# Dogfooding: Cross-Platform Path Normalizer validation
#
# This script demonstrates HIGH-VALUE composition:
# Validate that Path Normalizer's 145 tests are deterministic across runs.
#
# Real-World Use Case:
#   Path Normalizer must be 100% reliable (used by other tools for path handling)
#   → Run its tests many times → Prove no flakiness → Build confidence
#
# Composability Demo:
#   TypeScript (flakiness detector) validates TypeScript (path normalizer)
#
# Usage:
#   ./scripts/dogfood-paths.sh [runs]
#
# Examples:
#   ./scripts/dogfood-paths.sh     # Default: 10 runs
#   ./scripts/dogfood-paths.sh 20  # Custom: 20 runs
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL_DIR="$(dirname "$SCRIPT_DIR")"
PATHS_DIR="$TOOL_DIR/../cross-platform-path-normalizer"
RUNS="${1:-10}"

echo "🔬 Dogfooding: Validating Cross-Platform Path Normalizer"
echo ""
echo "This validates that Path Normalizer is 100% reliable:"
echo "  - 145 tests must pass consistently"
echo "  - No flakiness in path handling logic"
echo "  - Critical for tools that depend on path normalization"
echo ""

# Verify Path Normalizer exists
if [ ! -d "$PATHS_DIR" ]; then
    echo "❌ Cross-Platform Path Normalizer not found at: $PATHS_DIR"
    echo ""
    echo "This tool works standalone, but cross-validation requires monorepo."
    echo ""
    echo "To run this dogfooding script:"
    echo "  git clone https://github.com/tuulbelt/tuulbelt.git"
    echo "  cd tuulbelt/test-flakiness-detector"
    echo "  ./scripts/dogfood-paths.sh"
    exit 1
fi

# Verify dependencies installed
if [ ! -d "$PATHS_DIR/node_modules" ]; then
    echo "📦 Installing Cross-Platform Path Normalizer dependencies..."
    (cd "$PATHS_DIR" && npm install --silent)
fi

echo "✅ Cross-Platform Path Normalizer available"
echo "🎯 Running flakiness detection ($RUNS iterations)..."
echo ""

# Run flakiness detection
cd "$TOOL_DIR"
npx tsx src/index.ts \
    --test "cd '$PATHS_DIR' && npm test 2>&1" \
    --runs "$RUNS" \
    --verbose

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ VALIDATION SUCCESSFUL!"
    echo ""
    echo "💡 Path Normalizer's test suite is deterministic:"
    echo "   - All $RUNS test runs passed consistently"
    echo "   - No flaky behavior detected"
    echo "   - Safe to use as a dependency in other tools"
    echo ""
    echo "🔗 This proves Path Normalizer's reliability for:"
    echo "   • Output Diffing Utility (path input handling)"
    echo "   • File-Based Semaphore (lock file paths)"
    echo "   • Any tool accepting file paths"
else
    echo "❌ FLAKINESS DETECTED!"
    echo ""
    echo "⚠️  Path Normalizer has flaky tests - investigate before using"
fi

echo ""
echo "✨ Composition Demo Complete!"
echo ""
echo "💡 Key Takeaways:"
echo "   - TypeScript tool validates TypeScript tool (same-language composition)"
echo "   - Real value: Proves reliability before depending on it"
echo "   - 145 tests × $RUNS runs = $((145 * RUNS)) total test executions"
echo "   - Bidirectional validation with other tools"
echo ""
echo "🔗 See DOGFOODING_STRATEGY.md for implementation details"
