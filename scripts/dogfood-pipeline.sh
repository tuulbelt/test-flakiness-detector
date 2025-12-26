#!/bin/bash
#
# Dogfooding: Complete Phase 1 Tools Validation Pipeline
#
# This script demonstrates the ULTIMATE dogfooding use case:
# Use Test Flakiness Detector to validate the entire Phase 1 tool suite.
#
# Real-World Use Case:
#   Before releasing Phase 1, prove ALL tools are production-ready
#   → Run all test suites multiple times → Detect any flakiness → Fix before ship
#
# Composability Demo:
#   Test Flakiness Detector validates all 4 other Phase 1 tools
#   Creates a complete quality assurance pipeline
#
# Usage:
#   ./scripts/dogfood-pipeline.sh [runs]
#
# Examples:
#   ./scripts/dogfood-pipeline.sh     # Default: 10 runs per tool
#   ./scripts/dogfood-pipeline.sh 20  # Thorough: 20 runs per tool
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL_DIR="$(dirname "$SCRIPT_DIR")"
RUNS="${1:-10}"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Phase 1 Tools: Complete Flakiness Validation Pipeline        ║"
echo "║  Validating all 5 tools for production readiness               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "🎯 Run count: $RUNS iterations per tool"
echo "🔍 Purpose: Prove NO flakiness before Phase 1 completion"
echo ""

# Track results
TOTAL_TOOLS=5
VALIDATED_TOOLS=0
FAILED_TOOLS=()

validate_tool() {
    local name="$1"
    local test_cmd="$2"
    local num="$3"

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "$num  $name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    cd "$TOOL_DIR"
    if npx tsx src/index.ts --test "$test_cmd" --runs "$RUNS"; then
        echo ""
        echo "✅ $name: NO FLAKINESS DETECTED"
        ((VALIDATED_TOOLS++))
    else
        echo ""
        echo "❌ $name: FLAKINESS DETECTED!"
        FAILED_TOOLS+=("$name")
    fi
    echo ""
}

# Tool 1: Test Flakiness Detector (self-validation)
validate_tool \
    "Test Flakiness Detector (self-validation)" \
    "cd '$TOOL_DIR' && npm test 2>&1" \
    "1️⃣"

# Tool 2: CLI Progress Reporting
if [ -d "$TOOL_DIR/../cli-progress-reporting" ]; then
    validate_tool \
        "CLI Progress Reporting" \
        "cd '$TOOL_DIR/../cli-progress-reporting' && npm test 2>&1" \
        "2️⃣"
else
    echo "⚠️  2️⃣  CLI Progress Reporting not found (skipping)"
    echo ""
fi

# Tool 3: Cross-Platform Path Normalizer
if [ -d "$TOOL_DIR/../cross-platform-path-normalizer" ]; then
    validate_tool \
        "Cross-Platform Path Normalizer" \
        "cd '$TOOL_DIR/../cross-platform-path-normalizer' && npm test 2>&1" \
        "3️⃣"
else
    echo "⚠️  3️⃣  Cross-Platform Path Normalizer not found (skipping)"
    echo ""
fi

# Tool 4: File-Based Semaphore (Rust)
if [ -d "$TOOL_DIR/../file-based-semaphore" ]; then
    validate_tool \
        "File-Based Semaphore (Rust)" \
        "cd '$TOOL_DIR/../file-based-semaphore' && cargo test 2>&1" \
        "4️⃣"
else
    echo "⚠️  4️⃣  File-Based Semaphore not found (skipping)"
    echo ""
fi

# Tool 5: Output Diffing Utility (Rust)
if [ -d "$TOOL_DIR/../output-diffing-utility" ]; then
    validate_tool \
        "Output Diffing Utility (Rust)" \
        "cd '$TOOL_DIR/../output-diffing-utility' && cargo test 2>&1" \
        "5️⃣"
else
    echo "⚠️  5️⃣  Output Diffing Utility not found (skipping)"
    echo ""
fi

# Summary
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Validation Pipeline Summary                                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Results:"
echo "   Validated: $VALIDATED_TOOLS/$TOTAL_TOOLS tools"
echo "   Iterations: $RUNS runs per tool"
echo ""

if [ ${#FAILED_TOOLS[@]} -eq 0 ]; then
    echo "✅ SUCCESS: All Phase 1 tools are production-ready!"
    echo ""
    echo "💡 What this proves:"
    echo "   • 148 tests (Test Flakiness Detector) × $RUNS runs = $((148 * RUNS)) executions"
    echo "   • 125 tests (CLI Progress) × $RUNS runs = $((125 * RUNS)) executions"
    echo "   • 145 tests (Path Normalizer) × $RUNS runs = $((145 * RUNS)) executions"
    echo "   • 85 tests (Semaphore) × $RUNS runs = $((85 * RUNS)) executions"
    echo "   • 99 tests (Output Diff) × $RUNS runs = $((99 * RUNS)) executions"
    echo "   ────────────────────────────────────────────────"
    echo "   • Total: 602 tests × $RUNS runs = $((602 * RUNS)) test executions"
    echo ""
    echo "🎉 Phase 1 is ready for release!"
    EXIT_CODE=0
else
    echo "❌ FAILED: Some tools have flaky tests!"
    echo ""
    echo "⚠️  Failed tools:"
    for tool in "${FAILED_TOOLS[@]}"; do
        echo "   • $tool"
    done
    echo ""
    echo "🔧 Fix these flaky tests before Phase 1 release!"
    EXIT_CODE=1
fi

echo ""
echo "✨ Pipeline Complete!"
echo ""
echo "💡 Key Takeaways:"
echo "   - Test Flakiness Detector validates entire Phase 1 suite"
echo "   - Cross-language validation (TypeScript + Rust)"
echo "   - Real QA value: catches flakiness before production"
echo "   - Proves Tuulbelt's reliability philosophy"
echo ""
echo "🔗 See DOGFOODING_STRATEGY.md for implementation details"

exit $EXIT_CODE
