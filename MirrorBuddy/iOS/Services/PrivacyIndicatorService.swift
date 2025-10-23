import Combine
import Foundation
import SwiftUI

/// Service for displaying privacy indicators throughout the app
@MainActor
final class PrivacyIndicatorService: ObservableObject {
    @Published var isRecording: Bool = false
    @Published var isExporting: Bool = false
    @Published var activeDataCollection: Set<DataCollectionType> = []

    enum DataCollectionType: String, CaseIterable {
        case voiceRecording = "Voice Recording"
        case screenCapture = "Screen Capture"
        case analytics = "Analytics"
        case thirdPartySharing = "Third-Party Sharing"

        var icon: String {
            switch self {
            case .voiceRecording: return "mic.fill"
            case .screenCapture: return "camera.fill"
            case .analytics: return "chart.bar.fill"
            case .thirdPartySharing: return "arrow.up.doc.fill"
            }
        }

        var color: Color {
            switch self {
            case .voiceRecording: return .red
            case .screenCapture: return .orange
            case .analytics: return .blue
            case .thirdPartySharing: return .purple
            }
        }
    }

    func startDataCollection(_ type: DataCollectionType) {
        activeDataCollection.insert(type)

        if type == .voiceRecording {
            isRecording = true
        }
    }

    func stopDataCollection(_ type: DataCollectionType) {
        activeDataCollection.remove(type)

        if type == .voiceRecording {
            isRecording = false
        }
    }

    func getActiveIndicatorText() -> String {
        guard !activeDataCollection.isEmpty else {
            return "No active data collection"
        }

        let types = activeDataCollection.map { $0.rawValue }.sorted()
        return "Active: " + types.joined(separator: ", ")
    }
}
