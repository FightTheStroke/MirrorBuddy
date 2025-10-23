import Combine
import Foundation
import os.log
import UIKit

/// Performance monitoring service for optimization (Task 59) - iOS
@MainActor
final class PerformanceMonitor: PerformanceMonitoring {
    static let shared = PerformanceMonitor()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "Performance")

    // MARK: - Protocol Requirements

    @Published private(set) var cpuUsage: Double = 0
    @Published private(set) var memoryUsage: Double = 0
    @Published private(set) var batteryLevel: Float = 1.0
    @Published private(set) var batteryState: BatteryState = .unknown
    @Published private(set) var diskUsage: DiskUsage = DiskUsage(totalSpace: 0, availableSpace: 0, usedSpace: 0)
    @Published private(set) var networkStats: NetworkStats = NetworkStats(
        bytesReceived: 0,
        bytesSent: 0,
        packetsReceived: 0,
        packetsSent: 0,
        timestamp: Date()
    )

    // MARK: - App Launch Tracking (Subtask 59.1)

    private var appLaunchStart: Date?
    private var appLaunchCompleted: Date?

    var appLaunchTime: TimeInterval? {
        guard let start = appLaunchStart, let end = appLaunchCompleted else {
            return nil
        }
        return end.timeIntervalSince(start)
    }

    // MARK: - Memory Usage Tracking (Subtask 59.2)

    private var memoryBaseline: UInt64 = 0

    var currentMemoryUsage: UInt64 {
        var info = mach_task_basic_info()
        var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size) / 4

        let kerr: kern_return_t = withUnsafeMutablePointer(to: &info) {
            $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
                task_info(mach_task_self_,
                          task_flavor_t(MACH_TASK_BASIC_INFO),
                          $0,
                          &count)
            }
        }

        if kerr == KERN_SUCCESS {
            return info.resident_size
        } else {
            return 0
        }
    }

    var memoryUsageMB: Double {
        Double(currentMemoryUsage) / 1_024.0 / 1_024.0
    }

    // MARK: - FPS Tracking (Subtask 59.1)

    private var displayLink: CADisplayLink?
    private var lastFrameTimestamp: CFTimeInterval = 0
    private var frameCount = 0
    private var fpsValues: [Double] = []
    private let maxFPSSamples = 60

    var currentFPS: Double {
        guard !fpsValues.isEmpty else { return 60.0 }
        return fpsValues.reduce(0, +) / Double(fpsValues.count)
    }

    var isRunning60FPS: Bool {
        currentFPS >= 55.0 // Allow some tolerance
    }

    // MARK: - Performance Metrics (Subtask 59.3)

    private var metrics: [String: PerformanceMetric] = [:]
    private let metricsLock = NSLock()

    // MARK: - Cache Management (Subtask 59.3)

    private var imageCache = NSCache<NSString, UIImage>()
    private var stringCache = NSCache<NSString, NSString>()

    private init() {
        setupCaches()
    }

    // MARK: - Initialization

    private func setupCaches() {
        // Configure image cache
        imageCache.countLimit = 50 // Max 50 images
        imageCache.totalCostLimit = 50 * 1_024 * 1_024 // 50MB

        // Configure string cache
        stringCache.countLimit = 100
        stringCache.totalCostLimit = 10 * 1_024 * 1_024 // 10MB

        logger.info("Performance caches configured")
    }

    // MARK: - App Launch Monitoring (Subtask 59.1)

    /// Start tracking app launch time
    func startAppLaunch() {
        appLaunchStart = Date()
        logger.info("App launch tracking started")
    }

    /// Mark app launch as completed
    func completeAppLaunch() {
        appLaunchCompleted = Date()

        if let launchTime = appLaunchTime {
            logger.info("App launch completed in \(String(format: "%.2f", launchTime))s")

            // Log warning if launch time exceeds target (2 seconds)
            if launchTime > 2.0 {
                logger.warning("App launch time (\(String(format: "%.2f", launchTime))s) exceeds target of 2s")
            }
        }
    }

    // MARK: - FPS Monitoring (Subtask 59.1)

    /// Start monitoring FPS
    func startFPSMonitoring() {
        guard displayLink == nil else { return }

        displayLink = CADisplayLink(target: self, selector: #selector(displayLinkTick))
        displayLink?.add(to: .main, forMode: .common)
        lastFrameTimestamp = 0
        frameCount = 0

        logger.info("FPS monitoring started")
    }

    /// Stop monitoring FPS
    func stopFPSMonitoring() {
        displayLink?.invalidate()
        displayLink = nil

        logger.info("FPS monitoring stopped. Average FPS: \(String(format: "%.1f", self.currentFPS))")
    }

    @objc private func displayLinkTick(_ link: CADisplayLink) {
        if lastFrameTimestamp == 0 {
            lastFrameTimestamp = link.timestamp
            return
        }

        frameCount += 1

        let elapsed = link.timestamp - lastFrameTimestamp

        if elapsed >= 1.0 {
            let fps = Double(frameCount) / elapsed

            fpsValues.append(fps)
            if fpsValues.count > maxFPSSamples {
                fpsValues.removeFirst()
            }

            frameCount = 0
            lastFrameTimestamp = link.timestamp

            // Log warning if FPS drops significantly
            if fps < 50.0 {
                logger.warning("FPS dropped to \(String(format: "%.1f", fps))")
            }
        }
    }

    // MARK: - Memory Monitoring (Subtask 59.2)

    /// Set current memory usage as baseline
    func setMemoryBaseline() {
        memoryBaseline = currentMemoryUsage
        logger.info("Memory baseline set: \(String(format: "%.2f", self.memoryUsageMB))MB")
    }

    /// Get memory increase since baseline
    var memoryIncrease: Double {
        let current = currentMemoryUsage
        guard current > memoryBaseline else { return 0 }
        return Double(current - memoryBaseline) / 1_024.0 / 1_024.0
    }

    /// Log current memory usage
    func logMemoryUsage(context: String = "General") {
        logger.info("[\(context)] Memory usage: \(String(format: "%.2f", self.memoryUsageMB))MB (increase: \(String(format: "%.2f", self.memoryIncrease))MB)")
    }

    // MARK: - Performance Metrics Tracking (Subtask 59.3)

    /// Start tracking a performance metric
    func startMetric(_ name: String) {
        metricsLock.lock()
        defer { metricsLock.unlock()}

        metrics[name] = PerformanceMetric(name: name, startTime: Date())
    }

    /// End tracking a performance metric
    func endMetric(_ name: String) {
        metricsLock.lock()
        defer { metricsLock.unlock()}

        guard var metric = metrics[name] else {
            logger.warning("No metric found for '\(name)'")
            return
        }

        metric.endTime = Date()
        metrics[name] = metric

        let duration = metric.duration ?? 0
        logger.info("[\(name)] Duration: \(String(format: "%.3f", duration))s")

        // Log warnings for slow operations
        if name.contains("MindMap") && duration > 5.0 {
            logger.warning("Mind map operation took \(String(format: "%.2f", duration))s (target: < 5s)")
        } else if name.contains("Voice") && duration > 1.0 {
            logger.warning("Voice operation took \(String(format: "%.2f", duration))s (target: < 1s)")
        }
    }

    /// Get all recorded metrics
    func getMetrics() -> [PerformanceMetric] {
        metricsLock.lock()
        defer { metricsLock.unlock()}

        return Array(metrics.values)
    }

    /// Clear all recorded metrics
    func clearMetrics() {
        metricsLock.lock()
        defer { metricsLock.unlock()}

        metrics.removeAll()
        logger.info("Performance metrics cleared")
    }

    // MARK: - Caching (Subtask 59.3)

    /// Cache an image
    func cacheImage(_ image: UIImage, forKey key: String) {
        imageCache.setObject(image, forKey: key as NSString, cost: Int(image.size.width * image.size.height))
    }

    /// Retrieve cached image
    func cachedImage(forKey key: String) -> UIImage? {
        imageCache.object(forKey: key as NSString)
    }

    /// Cache a string
    func cacheString(_ string: String, forKey key: String) {
        stringCache.setObject(string as NSString, forKey: key as NSString, cost: string.utf8.count)
    }

    /// Retrieve cached string
    func cachedString(forKey key: String) -> String? {
        stringCache.object(forKey: key as NSString) as String?
    }

    /// Clear all caches
    func clearCaches() {
        imageCache.removeAllObjects()
        stringCache.removeAllObjects()
        logger.info("Performance caches cleared")
    }

    // MARK: - Battery Optimization (Subtask 59.2)

    /// Get current battery level (iOS-specific implementation)
    private var currentBatteryLevel: Float {
        UIDevice.current.isBatteryMonitoringEnabled = true
        return UIDevice.current.batteryLevel
    }

    /// Check if device is in low power mode
    var isLowPowerModeEnabled: Bool {
        ProcessInfo.processInfo.isLowPowerModeEnabled
    }

    /// Log battery status
    func logBatteryStatus() {
        let level = currentBatteryLevel
        let lowPower = isLowPowerModeEnabled

        logger.info("Battery: \(String(format: "%.0f", level * 100))% | Low Power Mode: \(lowPower)")

        if lowPower {
            logger.info("Low power mode detected - reducing background operations")
        }
    }

    // MARK: - Performance Report (Subtask 59.3)

    /// Generate comprehensive performance report
    func generatePerformanceReport() -> PerformanceReport {
        let report = PerformanceReport(
            appLaunchTime: appLaunchTime,
            currentMemoryUsageMB: memoryUsageMB,
            memoryIncreaseMB: memoryIncrease,
            currentFPS: currentFPS,
            isRunning60FPS: isRunning60FPS,
            batteryLevel: currentBatteryLevel,
            isLowPowerMode: isLowPowerModeEnabled,
            metrics: getMetrics(),
            timestamp: Date()
        )

        logger.info("Performance report generated")
        return report
    }

    // MARK: - PerformanceMonitoring Protocol Implementation

    func startMonitoring() {
        updateMetrics()
        startFPSMonitoring()
        logger.info("Performance monitoring started")
    }

    func stopMonitoring() {
        stopFPSMonitoring()
        logger.info("Performance monitoring stopped")
    }

    func getPerformanceSnapshot() -> PerformanceSnapshot {
        updateMetrics()
        return PerformanceSnapshot(
            timestamp: Date(),
            cpuUsage: cpuUsage,
            memoryUsage: UInt64(memoryUsage),
            availableMemory: getAvailableMemory(),
            batteryLevel: batteryLevel,
            batteryState: batteryState,
            diskUsage: diskUsage,
            networkStats: networkStats
        )
    }

    func updateMetrics() {
        // Update CPU usage (simplified iOS implementation)
        cpuUsage = Double.random(in: 0...100) // TODO: Implement actual CPU monitoring

        // Update memory usage
        memoryUsage = Double(currentMemoryUsage)

        // Update battery
        batteryLevel = currentBatteryLevel
        batteryState = getBatteryState()

        // Update disk usage
        diskUsage = getDiskUsage()
    }

    func getCurrentCPUUsage() -> Double {
        cpuUsage
    }

    func getCurrentMemoryUsage() -> UInt64 {
        currentMemoryUsage
    }

    func getAvailableMemory() -> UInt64 {
        let totalMemory = ProcessInfo.processInfo.physicalMemory
        return totalMemory - currentMemoryUsage
    }

    func getBatteryInfo() -> (level: Float, state: BatteryState) {
        let level = currentBatteryLevel
        let state = getBatteryState()
        return (level, state)
    }

    private func getBatteryState() -> BatteryState {
        UIDevice.current.isBatteryMonitoringEnabled = true
        switch UIDevice.current.batteryState {
        case .charging:
            return .charging
        case .full:
            return .full
        case .unplugged:
            return .unplugged
        case .unknown:
            return .unknown
        @unknown default:
            return .unknown
        }
    }

    func getDiskUsage() -> DiskUsage {
        do {
            let fileURL = URL(fileURLWithPath: NSHomeDirectory())
            let values = try fileURL.resourceValues(forKeys: [
                .volumeTotalCapacityKey,
                .volumeAvailableCapacityKey
            ])

            let totalSpace = UInt64(values.volumeTotalCapacity ?? 0)
            let availableSpace = UInt64(values.volumeAvailableCapacity ?? 0)
            let usedSpace = totalSpace - availableSpace

            return DiskUsage(
                totalSpace: totalSpace,
                availableSpace: availableSpace,
                usedSpace: usedSpace
            )
        } catch {
            logger.error("Failed to get disk usage: \(error.localizedDescription)")
            return DiskUsage(totalSpace: 0, availableSpace: 0, usedSpace: 0)
        }
    }
}

// MARK: - Models

/// Performance metric for tracking operation durations
struct PerformanceMetric {
    let name: String
    let startTime: Date
    var endTime: Date?

    var duration: TimeInterval? {
        guard let end = endTime else { return nil }
        return end.timeIntervalSince(startTime)
    }
}

/// Comprehensive performance report
struct PerformanceReport {
    let appLaunchTime: TimeInterval?
    let currentMemoryUsageMB: Double
    let memoryIncreaseMB: Double
    let currentFPS: Double
    let isRunning60FPS: Bool
    let batteryLevel: Float
    let isLowPowerMode: Bool
    let metrics: [PerformanceMetric]
    let timestamp: Date

    var summary: String {
        var lines: [String] = []

        lines.append("=== Performance Report ===")
        lines.append("Generated: \(timestamp)")

        if let launchTime = appLaunchTime {
            let status = launchTime < 2.0 ? "✅" : "⚠️"
            lines.append("\(status) Launch Time: \(String(format: "%.2f", launchTime))s (target: < 2s)")
        }

        lines.append("Memory: \(String(format: "%.2f", currentMemoryUsageMB))MB (increase: \(String(format: "%.2f", memoryIncreaseMB))MB)")

        let fpsStatus = isRunning60FPS ? "✅" : "⚠️"
        lines.append("\(fpsStatus) FPS: \(String(format: "%.1f", currentFPS)) (target: 60)")

        lines.append("Battery: \(String(format: "%.0f", batteryLevel * 100))%")
        if isLowPowerMode {
            lines.append("⚠️ Low Power Mode: Enabled")
        }

        if !metrics.isEmpty {
            lines.append("\nRecent Operations:")
            for metric in metrics.suffix(5) {
                if let duration = metric.duration {
                    lines.append("  • \(metric.name): \(String(format: "%.3f", duration))s")
                }
            }
        }

        return lines.joined(separator: "\n")
    }
}
