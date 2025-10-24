import Combine
import Foundation
import IOKit.ps
import os.log

/// macOS-native performance monitoring using system APIs
@MainActor
final class macOSPerformanceMonitor: PerformanceMonitoring {
    static let shared = macOSPerformanceMonitor()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "Performance-macOS")

    // MARK: - Published State

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

    // MARK: - Monitoring State

    private var monitoringTimer: Timer?
    private var isMonitoring = false

    // MARK: - CPU Monitoring

    private var previousCPUInfo: host_cpu_load_info?

    // MARK: - Initialization

    private init() {}

    // MARK: - Monitoring Control

    func startMonitoring() {
        guard !isMonitoring else { return }

        isMonitoring = true
        updateMetrics()

        monitoringTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.updateMetrics()
            }
        }

        logger.info("Performance monitoring started (macOS)")
    }

    func stopMonitoring() {
        isMonitoring = false
        monitoringTimer?.invalidate()
        monitoringTimer = nil

        logger.info("Performance monitoring stopped")
    }

    func getPerformanceSnapshot() -> PerformanceSnapshot {
        PerformanceSnapshot(
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

    // MARK: - Metrics Collection

    func updateMetrics() {
        cpuUsage = getCurrentCPUUsage()
        memoryUsage = Double(getCurrentMemoryUsage())
        let battery = getBatteryInfo()
        batteryLevel = battery.level
        batteryState = battery.state
        diskUsage = getDiskUsage()
    }

    func getCurrentCPUUsage() -> Double {
        var size = mach_msg_type_number_t(MemoryLayout<host_cpu_load_info_data_t>.size / MemoryLayout<integer_t>.size)
        var cpuInfo = host_cpu_load_info_data_t()

        let result = withUnsafeMutablePointer(to: &cpuInfo) {
            $0.withMemoryRebound(to: integer_t.self, capacity: Int(size)) {
                host_statistics(mach_host_self(), HOST_CPU_LOAD_INFO, $0, &size)
            }
        }

        guard result == KERN_SUCCESS else {
            logger.error("Failed to get CPU info")
            return 0
        }

        let userDiff = Double(cpuInfo.cpu_ticks.0 - (previousCPUInfo?.cpu_ticks.0 ?? 0))
        let systemDiff = Double(cpuInfo.cpu_ticks.1 - (previousCPUInfo?.cpu_ticks.1 ?? 0))
        let idleDiff = Double(cpuInfo.cpu_ticks.2 - (previousCPUInfo?.cpu_ticks.2 ?? 0))
        let niceDiff = Double(cpuInfo.cpu_ticks.3 - (previousCPUInfo?.cpu_ticks.3 ?? 0))

        previousCPUInfo = cpuInfo

        let totalTicks = userDiff + systemDiff + idleDiff + niceDiff
        guard totalTicks > 0 else { return 0 }

        let usedTicks = userDiff + systemDiff + niceDiff
        return (usedTicks / totalTicks) * 100
    }

    func getCurrentMemoryUsage() -> UInt64 {
        var taskInfo = mach_task_basic_info()
        var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size) / 4

        let result = withUnsafeMutablePointer(to: &taskInfo) {
            $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
                task_info(mach_task_self_, task_flavor_t(MACH_TASK_BASIC_INFO), $0, &count)
            }
        }

        guard result == KERN_SUCCESS else {
            logger.error("Failed to get memory info")
            return 0
        }

        return taskInfo.resident_size
    }

    func getAvailableMemory() -> UInt64 {
        var stats = vm_statistics64()
        var count = mach_msg_type_number_t(MemoryLayout<vm_statistics64>.size / MemoryLayout<integer_t>.size)

        let result = withUnsafeMutablePointer(to: &stats) {
            $0.withMemoryRebound(to: integer_t.self, capacity: Int(count)) {
                host_statistics64(mach_host_self(), HOST_VM_INFO64, $0, &count)
            }
        }

        guard result == KERN_SUCCESS else {
            logger.error("Failed to get VM statistics")
            return 0
        }

        let pageSize = UInt64(vm_kernel_page_size)
        let freePages = UInt64(stats.free_count)

        return freePages * pageSize
    }

    func getBatteryInfo() -> (level: Float, state: BatteryState) {
        // Get battery info from IOKit
        let snapshot = IOPSCopyPowerSourcesInfo()?.takeRetainedValue()
        let sources = IOPSCopyPowerSourcesList(snapshot)?.takeRetainedValue() as? [CFTypeRef]

        guard let sources = sources, !sources.isEmpty else {
            // Desktop Mac without battery
            return (1.0, .full)
        }

        guard let source = sources.first,
              let info = IOPSGetPowerSourceDescription(snapshot, source)?.takeUnretainedValue() as? [String: Any] else {
            return (1.0, .unknown)
        }

        // Get battery level
        let capacity = info[kIOPSCurrentCapacityKey] as? Int ?? 100
        let maxCapacity = info[kIOPSMaxCapacityKey] as? Int ?? 100
        let level = Float(capacity) / Float(maxCapacity)

        // Get battery state
        let isCharging = info[kIOPSIsChargingKey] as? Bool ?? false
        let isCharged = info[kIOPSIsChargedKey] as? Bool ?? false
        let powerSource = info[kIOPSPowerSourceStateKey] as? String

        let state: BatteryState
        if isCharged || capacity >= 100 {
            state = .full
        } else if isCharging {
            state = .charging
        } else if powerSource == kIOPSBatteryPowerValue {
            state = .unplugged
        } else {
            state = .unknown
        }

        return (level, state)
    }

    func getDiskUsage() -> DiskUsage {
        do {
            let homeURL = FileManager.default.homeDirectoryForCurrentUser
            let values = try homeURL.resourceValues(forKeys: [
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
