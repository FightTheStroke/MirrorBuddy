# MirrorBuddy Performance Baselines & Thresholds

> **Purpose**: Document performance expectations and testing methodology
> **Created**: October 18, 2025 (Task 122)
> **Test Suite**: `MirrorBuddyTests/PerformanceTests.swift`

---

## Overview

This document defines performance baselines and thresholds for MirrorBuddy's critical operations. These metrics ensure the app maintains acceptable performance as it scales to handle real-world educational workloads.

## Test Execution

```bash
# Run all performance tests
xcodebuild test -project MirrorBuddy.xcodeproj \
  -scheme MirrorBuddy \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  -only-testing:MirrorBuddyTests/PerformanceTests

# Run specific test
xcodebuild test ... -only-testing:MirrorBuddyTests/PerformanceTests/testDriveSyncPerformance100Files
```

## Performance Categories

### 1. Google Drive Sync Performance

#### Test: `testDriveSyncPerformance100Files`
- **Scenario**: Sync 100 PDF files from Google Drive
- **Expected Baseline**:
  - Time: <5.0 seconds
  - Memory: <500MB peak usage
- **Iterations**: 5
- **Metrics**: Clock time, Memory
- **Threshold**: ⚠️ Warning if >6s, ❌ Fail if >8s

#### Test: `testDriveSyncPerformance500Files`
- **Scenario**: Stress test with 500 files
- **Expected Baseline**:
  - Time: <20.0 seconds
  - Memory: <1GB peak usage
- **Iterations**: 3
- **Metrics**: Clock time, Memory
- **Threshold**: ⚠️ Warning if >25s, ❌ Fail if >30s

#### Test: `testDriveSyncPerformanceIncremental`
- **Scenario**: Incremental sync (10 new files among 100 existing)
- **Expected Baseline**:
  - Time: <1.0 second
- **Iterations**: 10
- **Metrics**: Clock time
- **Threshold**: ⚠️ Warning if >1.5s, ❌ Fail if >2s

---

### 2. Whisper Transcription Performance

#### Test: `testWhisperTranscription1Hour`
- **Scenario**: Transcribe 1-hour audio lecture
- **Expected Baseline**:
  - Time: <60.0 seconds (1x realtime or better)
  - Memory: <1GB peak usage
- **Iterations**: 3
- **Metrics**: Clock time, Memory
- **Threshold**: ⚠️ Warning if >90s, ❌ Fail if >120s
- **Notes**: Target is realtime or better transcription speed

#### Test: `testWhisperTranscription3Hours`
- **Scenario**: Transcribe 3-hour lecture (full day scenario)
- **Expected Baseline**:
  - Time: <180.0 seconds (1x realtime)
  - Memory: <1.5GB peak usage
- **Iterations**: 2
- **Metrics**: Clock time, Memory
- **Threshold**: ⚠️ Warning if >240s, ❌ Fail if >300s

#### Test: `testWhisperTranscriptionBatch`
- **Scenario**: Batch process 10 short audio segments (5 min each)
- **Expected Baseline**:
  - Time: <30.0 seconds total
  - Memory: <500MB peak usage
- **Iterations**: 5
- **Metrics**: Clock time, Memory
- **Threshold**: ⚠️ Warning if >40s, ❌ Fail if >50s

---

### 3. Mind Map Rendering Performance

#### Test: `testMindMapRendering100Nodes`
- **Scenario**: Render mind map with 100 nodes (typical lecture)
- **Expected Baseline**:
  - Time: <1.0 second
  - Memory: <200MB peak usage
- **Iterations**: 10
- **Metrics**: Clock time, Memory
- **Threshold**: ⚠️ Warning if >1.5s, ❌ Fail if >2s
- **Notes**: Must feel instant to user

#### Test: `testMindMapRendering500Nodes`
- **Scenario**: Stress test with 500 nodes (full semester content)
- **Expected Baseline**:
  - Time: <3.0 seconds
  - Memory: <500MB peak usage
- **Iterations**: 5
- **Metrics**: Clock time, Memory
- **Threshold**: ⚠️ Warning if >4s, ❌ Fail if >5s

#### Test: `testMindMapInteractiveUpdates`
- **Scenario**: Interactive zoom/pan operations (200 nodes visible)
- **Expected Baseline**:
  - Time: <100ms per interaction
- **Iterations**: 20
- **Metrics**: Clock time
- **Threshold**: ⚠️ Warning if >150ms, ❌ Fail if >200ms
- **Notes**: Critical for smooth 60fps user experience (16.67ms per frame)

#### Test: `testMindMapSearchPerformance`
- **Scenario**: Search across 300 nodes with 4 queries
- **Expected Baseline**:
  - Time: <500ms for 4 searches
- **Iterations**: 10
- **Metrics**: Clock time
- **Threshold**: ⚠️ Warning if >750ms, ❌ Fail if >1000ms

---

### 4. Full Pipeline Performance

#### Test: `testFullMaterialProcessingPipeline`
- **Scenario**: Complete material processing workflow
  - Drive sync → OCR → Summary → Mind map → Flashcards
- **Expected Baseline**:
  - Time: <30.0 seconds for single material
  - Memory: <800MB peak usage
- **Iterations**: 3
- **Metrics**: Clock time, Memory
- **Threshold**: ⚠️ Warning if >40s, ❌ Fail if >50s
- **Notes**: End-to-end user experience metric

---

## Baseline Capture Methodology

### Initial Baseline Capture

1. **Test Environment**:
   - Device: iPhone 16 Simulator
   - iOS Version: 26.0
   - Xcode Version: Latest stable
   - Build Configuration: Release (for accurate metrics)

2. **Execution**:
   ```bash
   # Run tests with baseline capture
   xcodebuild test -project MirrorBuddy.xcodeproj \
     -scheme MirrorBuddy \
     -destination 'platform=iOS Simulator,name=iPhone 16' \
     -only-testing:MirrorBuddyTests/PerformanceTests \
     -resultBundlePath ./performance-baseline.xcresult
   ```

3. **Analysis**:
   - Review XCTest metrics in Xcode Organizer
   - Document median values from iterations
   - Set thresholds at +50% (warning) and +100% (failure)

### Continuous Monitoring

- **Frequency**: Run performance tests in CI on every PR
- **Regression Detection**: Fail PR if any test exceeds failure threshold
- **Trend Analysis**: Track metrics over time using XCTest baseline comparison
- **Device Testing**: Validate on physical devices quarterly

---

## Automation Setup

### CI Integration (GitHub Actions)

```yaml
name: Performance Tests

on:
  pull_request:
    branches: [ main ]

jobs:
  performance:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run Performance Tests
        run: |
          xcodebuild test \
            -project MirrorBuddy.xcodeproj \
            -scheme MirrorBuddy \
            -destination 'platform=iOS Simulator,name=iPhone 16' \
            -only-testing:MirrorBuddyTests/PerformanceTests \
            -resultBundlePath ./performance.xcresult

      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: ./performance.xcresult
```

### Local Testing Script

Create `scripts/run-performance-tests.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Running MirrorBuddy Performance Tests..."

xcodebuild test \
  -project MirrorBuddy.xcodeproj \
  -scheme MirrorBuddy \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  -only-testing:MirrorBuddyTests/PerformanceTests \
  -resultBundlePath "./performance-$(date +%Y%m%d-%H%M%S).xcresult"

echo "✅ Performance tests complete! Check results in Xcode Organizer"
```

---

## Interpreting Results

### XCTest Performance Metrics

- **Clock Time**: Wall-clock execution time (includes system overhead)
- **Memory**: Peak memory usage during test execution
- **Iterations**: Multiple runs for statistical significance
- **Baseline Comparison**: XCTest tracks regressions automatically

### Result Analysis

1. **Green (✅)**: Within baseline threshold
2. **Yellow (⚠️)**: Within warning threshold (investigate)
3. **Red (❌)**: Exceeds failure threshold (fix required)

### Investigation Steps for Regressions

1. Compare with previous baseline using Xcode Organizer
2. Profile using Instruments (Time Profiler, Allocations)
3. Check for algorithmic changes in related code
4. Validate on physical device (simulators can vary)
5. Consider environmental factors (Xcode version, macOS updates)

---

## Mock Data Specifications

### Drive Files
- **Small file**: 100KB - 500KB PDF
- **Medium file**: 500KB - 2MB PDF
- **Large file**: 2MB - 5MB PDF
- **Mix**: 70% small, 20% medium, 10% large

### Audio Segments
- **Sample rate**: 16kHz (Whisper requirement)
- **Channels**: Mono (1 channel)
- **Format**: Simulated audio data (no actual audio file)

### Mind Map Nodes
- **Distribution**: Exponential depth (more nodes at shallow depths)
- **Max depth**: 5-8 levels typical
- **Node content**: Representative text lengths (10-50 characters)

---

## Device-Specific Baselines

### iPhone 16 (Simulator)
- Used for initial baselines
- Consistent CI environment

### iPhone 14 Pro (Physical)
- Target device for real-world validation
- May differ from simulator by ±20%

### iPad Pro M1 (Physical)
- Validation for larger screen workflows
- Expected better performance due to hardware

---

## Historical Baseline Changes

### Version 1.0 (October 2025)
- Initial baselines established (Task 122)
- Test suite created with 12 performance tests
- Thresholds defined at +50%/+100%

### Future Updates
- Document any baseline adjustments here
- Include rationale for changes
- Link to related tasks/commits

---

## Related Documentation

- [Testing Guide](./TESTING.md)
- [Architecture Decisions](./ADR/)
- [Development Workflow](./DEVELOPMENT.md)

---

**Last Updated**: October 18, 2025
**Maintained By**: MirrorBuddy Development Team
**Review Frequency**: Quarterly or after major performance optimizations
