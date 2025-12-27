#!/bin/bash
#
# Dogfooding: CLI Progress Reporting validation (Bidirectional)
#
# This script demonstrates HIGH-VALUE BIDIRECTIONAL composition:
# - Test Flakiness Detector USES CLI Progress Reporting (library integration)
# - Test Flakiness Detector VALIDATES CLI Progress Reporting (this script)
#
# Real-World Use Case:
#   CLI Progress must be concurrent-safe and non-flaky
#   → Run its 125 tests many times → Prove reliability → Trust the integration
#
# Composability Demo:
#   TypeScript (flakiness detector) ↔ TypeScript (progress reporting)
#   Creates a bidirectional validation relationship
#
# Usage:
#   ./scripts/dogfood-progress.sh [runs]
#
# Examples:
#   ./scripts/dogfood-progress.sh     # Default: 20 runs (high for concurrent safety)
#   ./scripts/dogfood-progress.sh 50  # Extra thorough validation
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL_DIR="$(dirname "$SCRIPT_DIR")"
PROGRESS_DIR="$TOOL_DIR/../cli-progress-reporting"
RUNS="${1:-20}"

echo "🔬 Dogfooding: Validating CLI Progress Reporting (Bidirectional)"
echo ""
echo "This creates a BIDIRECTIONAL validation relationship:"
echo "  1️⃣  Test Flakiness Detector USES Progress Reporting (for progress tracking)"
echo "  2️⃣  Test Flakiness Detector VALIDATES Progress Reporting (this script)"
echo ""
echo "Why high run count ($RUNS)?"
echo "  - Progress tracking involves concurrent file operations"
echo "  - Higher iteration count catches rare race conditions"
echo "  - Critical to validate before using in production"
echo ""

# Verify CLI Progress Reporting exists
if [ ! -d "$PROGRESS_DIR" ]; then
    echo "❌ CLI Progress Reporting not found at: $PROGRESS_DIR"
    echo ""
    echo "This tool works standalone, but cross-validation requires monorepo."
    echo ""
    echo "To run this dogfooding script:"
    echo "  git clone https://github.com/tuulbelt/tuulbelt.git"
    echo "  cd tuulbelt/test-flakiness-detector"
    echo "  ./scripts/dogfood-progress.sh"
    exit 1
fi

# Verify dependencies installed
if [ ! -d "$PROGRESS_DIR/node_modules" ]; then
    echo "📦 Installing CLI Progress Reporting dependencies..."
    (cd "$PROGRESS_DIR" && npm install --silent)
fi

echo "✅ CLI Progress Reporting available"
echo "🎯 Running flakiness detection ($RUNS iterations for concurrent safety)..."
echo ""

# Run flakiness detection
cd "$TOOL_DIR"
npx flaky \
    --test "cd '$PROGRESS_DIR' && npm test 2>&1" \
    --runs "$RUNS" \
    --verbose

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ VALIDATION SUCCESSFUL!"
    echo ""
    echo "💡 CLI Progress Reporting is concurrent-safe and deterministic:"
    echo "   - All $RUNS test runs passed consistently"
    echo "   - No race conditions detected"
    echo "   - Safe to use for tracking long-running operations"
    echo ""
    echo "🔗 This proves bidirectional validation:"
    echo "   ↔️  Flakiness Detector trusts Progress Reporting (uses it internally)"
    echo "   ↔️  Progress Reporting trusts Flakiness Detector (validated by it)"
else
    echo "❌ FLAKINESS DETECTED!"
    echo ""
    echo "⚠️  CLI Progress has flaky tests - FIX BEFORE USING IN PRODUCTION"
    echo "⚠️  This affects Test Flakiness Detector's progress tracking!"
fi

echo ""
echo "✨ Composition Demo Complete!"
echo ""
echo "💡 Key Takeaways:"
echo "   - Bidirectional validation: tools validate what they depend on"
echo "   - High iteration count ($RUNS) catches concurrent issues"
echo "   - 125 tests × $RUNS runs = $((125 * RUNS)) total test executions"
echo "   - Real-world value: confidence in concurrent progress tracking"
echo ""
echo "🔗 Tool relationship:"
echo "   Flakiness Detector -[uses]→ CLI Progress (library integration)"
echo "   Flakiness Detector -[validates]→ CLI Progress (this script)"
echo ""
echo "🔗 See DOGFOODING_STRATEGY.md for implementation details"
