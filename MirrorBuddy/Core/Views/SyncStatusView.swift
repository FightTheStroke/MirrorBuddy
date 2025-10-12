import SwiftUI

/// View for displaying CloudKit sync status
struct SyncStatusView: View {
    @Environment(CloudKitSyncMonitor.self) private var syncMonitor

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: syncMonitor.syncStatus.iconName)
                .font(.caption)
                .symbolEffect(.pulse, isActive: syncMonitor.isSyncing)
                .foregroundStyle(statusColor)

            Text(syncMonitor.syncStatus.displayText)
                .font(.caption)
                .foregroundStyle(.secondary)

            if let lastSync = syncMonitor.lastSyncDate {
                Text("• \(lastSync, style: .relative)")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(.regularMaterial, in: Capsule())
    }

    private var statusColor: Color {
        switch syncMonitor.syncStatus {
        case .idle:
            return .secondary
        case .syncing:
            return .blue
        case .synced:
            return .green
        case .failed:
            return .red
        }
    }
}

/// Compact sync status indicator (icon only)
struct CompactSyncStatusView: View {
    @Environment(CloudKitSyncMonitor.self) private var syncMonitor

    var body: some View {
        Button(
            action: {
                if !syncMonitor.isSyncing {
                    syncMonitor.requestManualSync()
                }
            },
            label: {
                Image(systemName: syncMonitor.syncStatus.iconName)
                    .symbolEffect(.pulse, isActive: syncMonitor.isSyncing)
                    .foregroundStyle(statusColor)
            }
        )
        .buttonStyle(.plain)
        .disabled(syncMonitor.isSyncing)
        .help(syncMonitor.syncStatus.displayText)
    }

    private var statusColor: Color {
        switch syncMonitor.syncStatus {
        case .idle:
            return .secondary
        case .syncing:
            return .blue
        case .synced:
            return .green
        case .failed:
            return .red
        }
    }
}

#Preview("Full Status") {
    @Previewable @State var monitor = CloudKitSyncMonitor.shared
    SyncStatusView()
        .environment(monitor)
        .padding()
}

#Preview("Compact Status") {
    @Previewable @State var monitor = CloudKitSyncMonitor.shared
    CompactSyncStatusView()
        .environment(monitor)
        .padding()
}
