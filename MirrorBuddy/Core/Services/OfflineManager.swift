//
//  OfflineManager.swift
//  MirrorBuddy
//
//  Task 57: Offline Mode Functionality
//  Network connectivity monitoring and offline state management
//

import Foundation
import Network
import Combine
import os.log

/// Monitors network connectivity and manages offline mode state
@MainActor
final class OfflineManager: ObservableObject {
    /// Shared singleton instance
    static let shared = OfflineManager()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "OfflineManager")
    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "com.mirrorbuddy.offline-monitor")

    // MARK: - Published Properties

    /// Whether the device currently has internet connectivity
    @Published private(set) var isOnline: Bool = true

    /// The type of network connection (WiFi, Cellular, etc.)
    @Published private(set) var connectionType: NWInterface.InterfaceType?

    /// Whether the device is on an expensive network (cellular)
    @Published private(set) var isExpensive: Bool = false

    /// Whether the device is on a constrained network (low data mode)
    @Published private(set) var isConstrained: Bool = false

    // MARK: - Initialization

    private init() {
        logger.info("OfflineManager initialized")
    }

    // MARK: - Network Monitoring

    /// Start monitoring network connectivity
    func startMonitoring() {
        logger.info("Starting network monitoring")

        monitor.pathUpdateHandler = { [weak self] path in
            _Concurrency.Task { @MainActor [weak self] in
                guard let self = self else { return }
                await self.updateStatus(path)
            }
        }

        monitor.start(queue: queue)
    }

    /// Stop monitoring network connectivity
    func stopMonitoring() {
        logger.info("Stopping network monitoring")
        monitor.cancel()
    }

    /// Update connectivity status based on network path
    private func updateStatus(_ path: NWPath) async {
        let wasOnline = isOnline

        isOnline = path.status == .satisfied
        connectionType = path.availableInterfaces.first?.type
        isExpensive = path.isExpensive
        isConstrained = path.isConstrained

        logger.debug("Network status updated - Online: \(self.isOnline), Type: \(String(describing: self.connectionType))")

        // Post notifications for state changes
        if wasOnline && !isOnline {
            NotificationCenter.default.post(name: .didGoOffline, object: nil)
            logger.info("Device went offline")
        } else if !wasOnline && isOnline {
            NotificationCenter.default.post(name: .didGoOnline, object: nil)
            logger.info("Device went online")

            // Trigger sync when going back online
            await triggerOfflineSync()
        }
    }

    // MARK: - Sync Coordination

    /// Trigger sync of offline actions when coming back online
    private func triggerOfflineSync() async {
        do {
            try await OfflineSyncQueue.shared.syncAll()
            logger.info("Offline sync completed successfully")
        } catch {
            logger.error("Offline sync failed: \(error.localizedDescription)")
        }
    }

    // MARK: - Helper Methods

    /// Check if network is suitable for large downloads
    var isSuitableForDownloads: Bool {
        isOnline && !isConstrained && !isExpensive
    }

    /// Get a user-friendly description of the current connection
    var connectionDescription: String {
        guard isOnline else { return "Offline" }

        guard let type = connectionType else { return "Online" }

        switch type {
        case .wifi:
            return "WiFi"
        case .cellular:
            return isConstrained ? "Cellular (Low Data)" : "Cellular"
        case .wiredEthernet:
            return "Ethernet"
        case .loopback:
            return "Loopback"
        case .other:
            return "Other"
        @unknown default:
            return "Unknown"
        }
    }
}

// MARK: - Notification Names

extension Notification.Name {
    /// Posted when the device goes offline
    static let didGoOffline = Notification.Name("com.mirrorbuddy.didGoOffline")

    /// Posted when the device goes online
    static let didGoOnline = Notification.Name("com.mirrorbuddy.didGoOnline")
}
