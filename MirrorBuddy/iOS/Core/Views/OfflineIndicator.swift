//
//  OfflineIndicator.swift
//  MirrorBuddy
//
//  Task 57: Offline Mode Functionality
//  UI indicator showing offline status
//

import Network
import SwiftUI

/// Visual indicator displayed when the app is in offline mode
struct OfflineIndicator: View {
    @StateObject private var offlineManager = OfflineManager.shared

    var body: some View {
        if !offlineManager.isOnline {
            HStack(spacing: 6) {
                Image(systemName: "wifi.slash")
                    .font(.caption)
                Text("Offline Mode")
                    .font(.caption)
                    .fontWeight(.medium)
            }
            .foregroundColor(.white)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(
                Capsule()
                    .fill(Color.orange)
            )
            .shadow(color: Color.black.opacity(0.1), radius: 2, x: 0, y: 1)
            .transition(.scale.combined(with: .opacity))
            .animation(.spring(response: 0.3), value: offlineManager.isOnline)
        }
    }
}

/// Connection status banner with more detail
struct ConnectionStatusBanner: View {
    @StateObject private var offlineManager = OfflineManager.shared
    @State private var isDismissed = false

    var body: some View {
        if !offlineManager.isOnline && !isDismissed {
            HStack {
                Image(systemName: "wifi.slash")
                    .font(.title3)

                VStack(alignment: .leading, spacing: 2) {
                    Text("No Internet Connection")
                        .font(.subheadline)
                        .fontWeight(.semibold)

                    Text("Some features are limited in offline mode")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.9))
                }

                Spacer()

                Button {
                    withAnimation {
                        isDismissed = true
                    }
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title3)
                        .foregroundColor(.white.opacity(0.7))
                }
            }
            .foregroundColor(.white)
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.orange.gradient)
            )
            .padding(.horizontal)
            .shadow(color: Color.black.opacity(0.15), radius: 5, x: 0, y: 2)
            .transition(.move(edge: .top).combined(with: .opacity))
            .animation(.spring(response: 0.4), value: offlineManager.isOnline)
            .onReceive(NotificationCenter.default.publisher(for: .didGoOnline)) { _ in
                isDismissed = false
            }
        }
    }
}

/// Connection type indicator (WiFi, Cellular, Offline)
struct ConnectionTypeIndicator: View {
    @StateObject private var offlineManager = OfflineManager.shared

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: iconName)
                .font(.caption)

            if offlineManager.isConstrained {
                Image(systemName: "exclamationmark.circle.fill")
                    .font(.caption2)
            }
        }
        .foregroundColor(color)
    }

    private var iconName: String {
        guard offlineManager.isOnline else { return "wifi.slash" }

        switch offlineManager.connectionType {
        case .wifi:
            return "wifi"
        case .cellular:
            return "antenna.radiowaves.left.and.right"
        case .wiredEthernet:
            return "cable.connector"
        default:
            return "network"
        }
    }

    private var color: Color {
        guard offlineManager.isOnline else { return .orange }

        if offlineManager.isConstrained {
            return .yellow
        } else if offlineManager.isExpensive {
            return .blue
        } else {
            return .green
        }
    }
}

// MARK: - Preview

#Preview("Offline Indicator") {
    VStack(spacing: 20) {
        OfflineIndicator()
        ConnectionStatusBanner()
        ConnectionTypeIndicator()
    }
    .padding()
}
