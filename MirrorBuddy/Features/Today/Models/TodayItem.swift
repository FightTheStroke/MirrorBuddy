//
//  TodayItem.swift
//  MirrorBuddy
//
//  Model for items displayed on Today screen
//

import Foundation
import SwiftUI

/// Item to display on Today screen
struct TodayItem: Identifiable {
    let id: String
    let title: String
    let subtitle: String
    let icon: String
    let color: Color
    let progress: Double? // Optional progress (0.0 - 1.0)
    let actionTitle: String
    let action: () -> Void
}

// MARK: - Sample Data

extension TodayItem {
    static let sampleMath = TodayItem(
        id: "1",
        title: "Matematica",
        subtitle: "Verifica domani · 75% pronto",
        icon: "function",
        color: .blue,
        progress: 0.75,
        actionTitle: "Inizia Ripasso",
        action: { print("Start math review") }
    )

    static let sampleEnglish = TodayItem(
        id: "2",
        title: "Inglese - Vocaboli",
        subtitle: "Completato ieri · Rivedi",
        icon: "abc",
        color: .green,
        progress: 1.0,
        actionTitle: "Ripassa Veloce",
        action: { print("Quick English review") }
    )

    static let sampleHistory = TodayItem(
        id: "3",
        title: "Storia",
        subtitle: "Prossimo: oggi 15:30",
        icon: "hourglass",
        color: .orange,
        progress: 0.3,
        actionTitle: "Prepara",
        action: { print("Prepare history") }
    )

    static let samples: [TodayItem] = [
        sampleMath,
        sampleEnglish,
        sampleHistory
    ]
}
