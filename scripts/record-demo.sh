#!/bin/bash
# Record Test Flakiness Detector demo
source "$(dirname "$0")/lib/demo-framework.sh"

TOOL_NAME="test-flakiness-detector"
SHORT_NAME="flaky"
LANGUAGE="typescript"

# GIF parameters
GIF_COLS=100
GIF_ROWS=30
GIF_SPEED=1.0
GIF_FONT_SIZE=14

demo_commands() {
  # ═══════════════════════════════════════════
  # Test Flakiness Detector / flaky - Tuulbelt
  # ═══════════════════════════════════════════

  # Step 1: Installation
  echo "# Step 1: Install globally"
  sleep 0.5
  echo "$ npm link"
  sleep 1

  # Step 2: View help
  echo ""
  echo "# Step 2: View available commands"
  sleep 0.5
  echo "$ flaky --help"
  sleep 0.5
  flaky --help | head -25
  sleep 3

  # Step 3: Basic flakiness detection
  echo ""
  echo "# Step 3: Detect flaky tests (5 runs)"
  sleep 0.5
  echo "$ flaky --test \"npm test\" --runs 5"
  sleep 0.5
  flaky --test "echo 'Test passed'" --runs 5
  sleep 2

  # Step 4: With progress tracking (10 runs triggers progress)
  echo ""
  echo "# Step 4: Run with progress tracking (10 runs)"
  sleep 0.5
  echo "$ flaky --test \"npm test\" --runs 10 --verbose"
  sleep 0.5
  flaky --test "echo 'Test passed'" --runs 10 --verbose
  sleep 2

  # Step 5: JSON output for CI
  echo ""
  echo "# Step 5: JSON output for automation"
  sleep 0.5
  echo "$ flaky --test \"npm test\" --runs 5 --format json"
  sleep 0.5
  flaky --test "echo 'Test passed'" --runs 5 --format json | head -20
  sleep 3

  # Step 6: Error handling
  echo ""
  echo "# Step 6: Handle invalid test command"
  sleep 0.5
  echo "$ flaky --test \"invalid-command\" --runs 3"
  sleep 0.5
  flaky --test "invalid-command-that-does-not-exist" --runs 3 || echo "✓ Gracefully handled error"
  sleep 2

  echo ""
  echo "# Done! Detect unreliable tests with: flaky --test \"npm test\" --runs 10"
  sleep 1
}

run_demo
