import Foundation
import os.log

/// Protocol for cross-platform performance monitoring
@MainActor
protocol PerformanceMonitoring: AnyObject {
    // MARK: - Published State

    var cpuUsage: Double { get }
    var memoryUsage: Double { get }
    var batteryLevel: Float { get }
    var batteryState: BatteryState { get }
    var diskUsage: DiskUsage { get }
    var networkStats: NetworkStats { get }

    // MARK: - Monitoring Control

    /// Start performance monitoring
    func startMonitoring()

    /// Stop performance monitoring
    func stopMonitoring()

    /// Get current performance snapshot
    func getPerformanceSnapshot() -> PerformanceSnapshot

    // MARK: - Metrics Collection

    /// Update all metrics
    func updateMetrics()

    /// Get CPU usage percentage (0-100)
    func getCurrentCPUUsage() -> Double

    /// Get memory usage in bytes
    func getCurrentMemoryUsage() -> UInt64

    /// Get available memory in bytes
    func getAvailableMemory() -> UInt64

    /// Get battery information
    func getBatteryInfo() -> (level: Float, state: BatteryState)

    /// Get disk usage information
    func getDiskUsage() -> DiskUsage
}

// MARK: - Supporting Types

enum BatteryState {
    case unknown
    case unplugged
    case charging
    case full
}

struct DiskUsage {
    let totalSpace: UInt64
    let availableSpace: UInt64
    let usedSpace: UInt64

    var usagePercentage: Double {
        guard totalSpace > 0 else { return 0 }
        return Double(usedSpace) / Double(totalSpace) * 100
    }
}

struct NetworkStats {
    let bytesReceived: UInt64
    let bytesSent: UInt64
    let packetsReceived: UInt64
    let packetsSent: UInt64
    let timestamp: Date
}

struct PerformanceSnapshot {
    let timestamp: Date
    let cpuUsage: Double
    let memoryUsage: UInt64
    let availableMemory: UInt64
    let batteryLevel: Float
    let batteryState: BatteryState
    let diskUsage: DiskUsage
    let networkStats: NetworkStats
}
