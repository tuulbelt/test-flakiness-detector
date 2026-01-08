/**
 * Tests for streaming API (Phase 4)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detect, isFlaky, compileDetector } from '../src/index.js';
import type { ProgressEvent } from '../src/index.js';

/**
 * Helper: Create a test command that succeeds
 */
const successCommand = 'echo "test passed"';

/**
 * Helper: Create a test command that fails
 */
const failCommand = 'exit 1';

/**
 * Helper: Create a flaky test command (alternates pass/fail using file counter)
 */
function createFlakyCommand(): string {
  const counterFile = `/tmp/flaky-counter-${Date.now()}-${Math.random()}.txt`;
  return `bash -c 'if [ ! -f ${counterFile} ]; then echo 0 > ${counterFile}; fi; COUNT=$(cat ${counterFile}); echo $((COUNT + 1)) > ${counterFile}; [ $((COUNT % 2)) -eq 0 ]'`;
}

// ============================================================================
// Event Emission Tests
// ============================================================================

test('streaming - emits start event with correct totalRuns', async () => {
  const events: ProgressEvent[] = [];

  await detect({
    test: successCommand,
    runs: 3,
    onProgress: (event) => events.push(event),
  });

  const startEvents = events.filter(e => e.type === 'start');
  assert.strictEqual(startEvents.length, 1, 'Should emit exactly one start event');
  assert.strictEqual(startEvents[0]!.totalRuns, 3, 'Start event should have correct totalRuns');
});

test('streaming - emits run-start event for each run', async () => {
  const events: ProgressEvent[] = [];

  await detect({
    test: successCommand,
    runs: 5,
    onProgress: (event) => events.push(event),
  });

  const runStartEvents = events.filter(e => e.type === 'run-start');
  assert.strictEqual(runStartEvents.length, 5, 'Should emit run-start for each run');

  // Verify run numbers are sequential
  runStartEvents.forEach((event, index) => {
    assert.strictEqual(event.runNumber, index + 1, `Run ${index + 1} should have correct runNumber`);
    assert.strictEqual(event.totalRuns, 5, 'Each event should have correct totalRuns');
  });
});

test('streaming - emits run-complete event for each run with result', async () => {
  const events: ProgressEvent[] = [];

  await detect({
    test: successCommand,
    runs: 3,
    onProgress: (event) => events.push(event),
  });

  const runCompleteEvents = events.filter(e => e.type === 'run-complete');
  assert.strictEqual(runCompleteEvents.length, 3, 'Should emit run-complete for each run');

  // Verify all runs succeeded
  runCompleteEvents.forEach((event, index) => {
    assert.strictEqual(event.runNumber, index + 1, `Run ${index + 1} should have correct runNumber`);
    assert.strictEqual(event.totalRuns, 3, 'Each event should have correct totalRuns');
    assert.strictEqual(event.success, true, `Run ${index + 1} should be successful`);
    assert.strictEqual(event.exitCode, 0, `Run ${index + 1} should have exit code 0`);
  });
});

test('streaming - run-complete event includes failure information', async () => {
  const events: ProgressEvent[] = [];

  await detect({
    test: failCommand,
    runs: 2,
    onProgress: (event) => events.push(event),
  });

  const runCompleteEvents = events.filter(e => e.type === 'run-complete');
  assert.strictEqual(runCompleteEvents.length, 2, 'Should emit run-complete for each run');

  // Verify all runs failed
  runCompleteEvents.forEach((event, index) => {
    assert.strictEqual(event.success, false, `Run ${index + 1} should fail`);
    assert.strictEqual(event.exitCode, 1, `Run ${index + 1} should have exit code 1`);
  });
});

test('streaming - emits complete event with full report', async () => {
  const events: ProgressEvent[] = [];

  const result = await detect({
    test: successCommand,
    runs: 3,
    onProgress: (event) => events.push(event),
  });

  const completeEvents = events.filter(e => e.type === 'complete');
  assert.strictEqual(completeEvents.length, 1, 'Should emit exactly one complete event');

  const completeEvent = completeEvents[0]!;
  assert.strictEqual(completeEvent.report.totalRuns, 3, 'Complete event should have full report');
  assert.strictEqual(completeEvent.report.passedRuns, 3);
  assert.strictEqual(completeEvent.report.failedRuns, 0);

  // Complete event report should match returned report
  if (result.ok) {
    assert.deepStrictEqual(completeEvent.report, result.value, 'Complete event report should match returned report');
  }
});

test('streaming - events are emitted in correct order', async () => {
  const events: ProgressEvent[] = [];

  await detect({
    test: successCommand,
    runs: 3,
    onProgress: (event) => events.push(event),
  });

  // Expected order: start, run-start, run-complete, run-start, run-complete, run-start, run-complete, complete
  assert.strictEqual(events.length, 8, 'Should emit 8 events total (1 start + 3 run-start + 3 run-complete + 1 complete)');

  assert.strictEqual(events[0]!.type, 'start', 'First event should be start');
  assert.strictEqual(events[1]!.type, 'run-start', 'Second event should be run-start');
  assert.strictEqual(events[2]!.type, 'run-complete', 'Third event should be run-complete');
  assert.strictEqual(events[3]!.type, 'run-start', 'Fourth event should be run-start');
  assert.strictEqual(events[4]!.type, 'run-complete', 'Fifth event should be run-complete');
  assert.strictEqual(events[5]!.type, 'run-start', 'Sixth event should be run-start');
  assert.strictEqual(events[6]!.type, 'run-complete', 'Seventh event should be run-complete');
  assert.strictEqual(events[7]!.type, 'complete', 'Eighth event should be complete');
});

test('streaming - complete event report includes flaky tests', async () => {
  const events: ProgressEvent[] = [];
  const flakyCmd = createFlakyCommand();

  await detect({
    test: flakyCmd,
    runs: 4,
    onProgress: (event) => events.push(event),
  });

  const completeEvent = events.find(e => e.type === 'complete');
  assert(completeEvent && completeEvent.type === 'complete', 'Should have complete event');

  assert(completeEvent.report.flakyTests.length > 0, 'Complete event should include flaky tests');
  assert(completeEvent.report.passedRuns > 0, 'Should have some passed runs');
  assert(completeEvent.report.failedRuns > 0, 'Should have some failed runs');
});

// ============================================================================
// Callback Invocation Tests
// ============================================================================

test('streaming - onProgress callback is called for each event', async () => {
  let callCount = 0;

  await detect({
    test: successCommand,
    runs: 2,
    onProgress: () => {
      callCount++;
    },
  });

  // Expected: 1 start + 2 run-start + 2 run-complete + 1 complete = 6 events
  assert.strictEqual(callCount, 6, 'Callback should be called 6 times');
});

test('streaming - callback receives correct event types', async () => {
  const eventTypes = new Set<string>();

  await detect({
    test: successCommand,
    runs: 2,
    onProgress: (event) => {
      eventTypes.add(event.type);
    },
  });

  assert(eventTypes.has('start'), 'Should receive start event');
  assert(eventTypes.has('run-start'), 'Should receive run-start event');
  assert(eventTypes.has('run-complete'), 'Should receive run-complete event');
  assert(eventTypes.has('complete'), 'Should receive complete event');
});

test('streaming - callback is optional (no error if undefined)', async () => {
  // Should not throw
  const result = await detect({
    test: successCommand,
    runs: 2,
    // onProgress not specified
  });

  assert(result.ok, 'Should succeed without onProgress callback');
});

test('streaming - callback errors do not crash detector', async () => {
  const events: ProgressEvent[] = [];

  const result = await detect({
    test: successCommand,
    runs: 2,
    onProgress: (event) => {
      events.push(event);
      // Throw error in callback
      throw new Error('Callback error');
    },
  });

  // Should still complete despite callback errors
  assert(result.ok, 'Detector should complete despite callback errors');
  assert(events.length > 0, 'Events should still be emitted');
});

// ============================================================================
// API Integration Tests
// ============================================================================

test('streaming - detect() API supports onProgress', async () => {
  const events: ProgressEvent[] = [];

  const result = await detect({
    test: successCommand,
    runs: 3,
    onProgress: (event) => events.push(event),
  });

  assert(result.ok, 'detect() should succeed');
  assert(events.length > 0, 'detect() should emit events');
  assert(events.some(e => e.type === 'start'), 'detect() should emit start event');
  assert(events.some(e => e.type === 'complete'), 'detect() should emit complete event');
});

test('streaming - isFlaky() API supports onProgress', async () => {
  const events: ProgressEvent[] = [];

  const result = await isFlaky({
    test: successCommand,
    runs: 3,
    onProgress: (event) => events.push(event),
  });

  assert(result.ok, 'isFlaky() should succeed');
  assert(events.length > 0, 'isFlaky() should emit events');
  assert(events.some(e => e.type === 'start'), 'isFlaky() should emit start event');
  assert(events.some(e => e.type === 'complete'), 'isFlaky() should emit complete event');
});

test('streaming - compileDetector().run() supports onProgress', async () => {
  const events: ProgressEvent[] = [];

  const detector = compileDetector({
    test: successCommand,
    onProgress: (event) => events.push(event),
  });

  const result = await detector.run(3);

  assert(result.ok, 'compileDetector().run() should succeed');
  assert(events.length > 0, 'compileDetector().run() should emit events');
  assert(events.some(e => e.type === 'start'), 'compileDetector().run() should emit start event');
  assert(events.some(e => e.type === 'complete'), 'compileDetector().run() should emit complete event');
});

test('streaming - compileDetector() preserves onProgress across multiple runs', async () => {
  const events: ProgressEvent[] = [];

  const detector = compileDetector({
    test: successCommand,
    onProgress: (event) => events.push(event),
  });

  await detector.run(2);
  const firstRunEvents = events.length;

  await detector.run(2);
  const secondRunEvents = events.length;

  // Both runs should emit events
  assert(firstRunEvents > 0, 'First run should emit events');
  assert(secondRunEvents > firstRunEvents, 'Second run should emit additional events');
});

// ============================================================================
// Event Data Integrity Tests
// ============================================================================

test('streaming - run-start events have sequential runNumbers', async () => {
  const runStartEvents: ProgressEvent[] = [];

  await detect({
    test: successCommand,
    runs: 5,
    onProgress: (event) => {
      if (event.type === 'run-start') {
        runStartEvents.push(event);
      }
    },
  });

  for (let i = 0; i < runStartEvents.length; i++) {
    const event = runStartEvents[i]!;
    assert.strictEqual(event.type, 'run-start');
    assert.strictEqual(event.runNumber, i + 1, `Run ${i} should have runNumber ${i + 1}`);
  }
});

test('streaming - run-complete events match run-start events', async () => {
  const runStartEvents: Array<Extract<ProgressEvent, { type: 'run-start' }>> = [];
  const runCompleteEvents: Array<Extract<ProgressEvent, { type: 'run-complete' }>> = [];

  await detect({
    test: successCommand,
    runs: 3,
    onProgress: (event) => {
      if (event.type === 'run-start') {
        runStartEvents.push(event);
      } else if (event.type === 'run-complete') {
        runCompleteEvents.push(event);
      }
    },
  });

  assert.strictEqual(runStartEvents.length, runCompleteEvents.length, 'Should have matching run-start and run-complete events');

  for (let i = 0; i < runStartEvents.length; i++) {
    assert.strictEqual(runStartEvents[i]!.runNumber, runCompleteEvents[i]!.runNumber, `Run ${i} events should have matching runNumbers`);
    assert.strictEqual(runStartEvents[i]!.totalRuns, runCompleteEvents[i]!.totalRuns, `Run ${i} events should have matching totalRuns`);
  }
});

test('streaming - complete event report matches final state', async () => {
  const events: ProgressEvent[] = [];

  const result = await detect({
    test: successCommand,
    runs: 3,
    onProgress: (event) => events.push(event),
  });

  const completeEvent = events.find(e => e.type === 'complete');
  assert(completeEvent && completeEvent.type === 'complete', 'Should have complete event');

  if (result.ok) {
    // Complete event report should exactly match returned report
    assert.deepStrictEqual(completeEvent.report, result.value, 'Complete event report should match final returned report');
  }
});

// ============================================================================
// Edge Cases
// ============================================================================

test('streaming - works with runs=1 (minimum)', async () => {
  const events: ProgressEvent[] = [];

  await detect({
    test: successCommand,
    runs: 1,
    onProgress: (event) => events.push(event),
  });

  // Expected: 1 start + 1 run-start + 1 run-complete + 1 complete = 4 events
  assert.strictEqual(events.length, 4, 'Should emit 4 events for single run');

  const startEvent = events.find(e => e.type === 'start');
  assert(startEvent && startEvent.type === 'start');
  assert.strictEqual(startEvent.totalRuns, 1, 'Start event should show 1 total run');
});

test('streaming - works with large number of runs', async () => {
  const events: ProgressEvent[] = [];

  await detect({
    test: successCommand,
    runs: 50,
    onProgress: (event) => events.push(event),
  });

  // Expected: 1 start + 50 run-start + 50 run-complete + 1 complete = 102 events
  assert.strictEqual(events.length, 102, 'Should emit 102 events for 50 runs');

  const runCompleteEvents = events.filter(e => e.type === 'run-complete');
  assert.strictEqual(runCompleteEvents.length, 50, 'Should emit run-complete for all 50 runs');
});

test('streaming - onProgress not called when callback is undefined', async () => {
  // This test verifies no crashes occur when onProgress is not provided
  const result = await detect({
    test: successCommand,
    runs: 2,
    verbose: false,
    // onProgress explicitly undefined
    onProgress: undefined,
  });

  assert(result.ok, 'Should succeed without onProgress');
});

test('streaming - events emitted in real-time (not buffered)', async () => {
  const eventTimestamps: number[] = [];

  await detect({
    test: 'sleep 0.1 && echo done', // Command with delay
    runs: 3,
    onProgress: () => {
      eventTimestamps.push(Date.now());
    },
  });

  // Verify events are not all emitted at once (would have same timestamp if buffered)
  assert(eventTimestamps.length > 0, 'Should have events');

  // Check that events are spread over time (not all same timestamp)
  const uniqueTimestamps = new Set(eventTimestamps);
  assert(uniqueTimestamps.size > 1, 'Events should be emitted at different times (not buffered)');
});
