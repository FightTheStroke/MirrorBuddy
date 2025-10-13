import SwiftUI
import SwiftData
import Combine

// MARK: - Context Banner View (Task 75)

/// Persistent banner showing current subject, task, and progress for working memory support
struct ContextBannerView: View {
    @Environment(\.modelContext) private var modelContext
    @ObservedObject var contextManager = ContextManager.shared

    @State private var isExpanded = false
    @State private var showHistory = false

    var body: some View {
        VStack(spacing: 0) {
            // Compact banner
            compactBanner
                .frame(height: 60)
                .background(.ultraThinMaterial)
                .overlay(
                    Rectangle()
                        .fill(contextManager.currentSubject.map { colorForSubject($0) } ?? .gray)
                        .frame(height: 3),
                    alignment: .bottom
                )

            // Expanded view
            if isExpanded {
                expandedContextView
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .animation(.spring(response: 0.3), value: isExpanded)
    }

    // MARK: - Compact Banner

    @ViewBuilder
    private var compactBanner: some View {
        HStack(spacing: 12) {
            // Subject indicator
            if let subject = contextManager.currentSubject {
                Circle()
                    .fill(colorForSubject(subject))
                    .frame(width: 8, height: 8)

                VStack(alignment: .leading, spacing: 2) {
                    Text(subject.rawValue)
                        .font(.headline)
                        .lineLimit(1)

                    if let task = contextManager.currentTask {
                        Text(task.title)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                }
            } else {
                Text("Nessun contesto attivo")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Progress indicator
            if let progress = contextManager.currentProgress {
                HStack(spacing: 4) {
                    ProgressView(value: progress)
                        .frame(width: 50)

                    Text("\(Int(progress * 100))%")
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(.secondary)
                }
            }

            // Expand button
            Button {
                withAnimation {
                    isExpanded.toggle()
                }
            } label: {
                Image(systemName: isExpanded ? "chevron.up.circle.fill" : "chevron.down.circle.fill")
                    .font(.title3)
                    .foregroundStyle(.secondary)
            }
            .accessibilityLabel(isExpanded ? "Comprimi contesto" : "Espandi contesto")
        }
        .padding(.horizontal)
        .contentShape(Rectangle())
        .onTapGesture {
            withAnimation {
                isExpanded.toggle()
            }
        }
    }

    // MARK: - Expanded View

    @ViewBuilder
    private var expandedContextView: some View {
        VStack(spacing: 16) {
            if let subject = contextManager.currentSubject {
                // Subject info
                HStack {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Materia")
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        HStack {
                            Circle()
                                .fill(colorForSubject(subject))
                                .frame(width: 12, height: 12)

                            Text(subject.rawValue)
                                .font(.title3.bold())
                        }
                    }

                    Spacer()

                    // Quick actions
                    HStack(spacing: 12) {
                        Button {
                            showHistory = true
                        } label: {
                            Image(systemName: "clock.arrow.circlepath")
                                .font(.title3)
                        }
                        .accessibilityLabel("Mostra cronologia")

                        Button {
                            contextManager.clearContext()
                        } label: {
                            Image(systemName: "xmark.circle")
                                .font(.title3)
                        }
                        .accessibilityLabel("Cancella contesto")
                    }
                }

                Divider()

                // Current task
                if let task = contextManager.currentTask {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Attività Corrente")
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        Text(task.title)
                            .font(.subheadline)

                        if let description = task.taskDescription {
                            Text(description)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(2)
                        }
                    }

                    Divider()
                }

                // Progress details
                if let progress = contextManager.currentProgress {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Progresso")
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        HStack {
                            ProgressView(value: progress)
                            Text("\(Int(progress * 100))%")
                                .font(.subheadline.monospacedDigit())
                        }

                        // Time information
                        if let timeSpent = contextManager.timeSpentInContext {
                            HStack {
                                Image(systemName: "clock")
                                    .font(.caption)
                                Text("Tempo: \(formatDuration(timeSpent))")
                                    .font(.caption)
                            }
                            .foregroundStyle(.secondary)
                        }
                    }
                }

                // Recent materials
                if !contextManager.recentMaterials.isEmpty {
                    Divider()

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Materiali Recenti")
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(contextManager.recentMaterials.prefix(5)) { material in
                                    MaterialChip(material: material)
                                }
                            }
                        }
                    }
                }
            } else {
                Text("Seleziona una materia per iniziare")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding()
            }
        }
        .padding()
        .background(.ultraThinMaterial)
        .sheet(isPresented: $showHistory) {
            ContextHistoryView()
        }
    }

    private func formatDuration(_ duration: TimeInterval) -> String {
        let minutes = Int(duration / 60)
        if minutes < 60 {
            return "\(minutes) min"
        } else {
            let hours = minutes / 60
            let remainingMinutes = minutes % 60
            return "\(hours)h \(remainingMinutes)m"
        }
    }

    private func colorForSubject(_ subject: Subject) -> Color {
        switch subject.colorName {
        case "purple": return .purple
        case "blue": return .blue
        case "red": return .red
        case "green": return .green
        case "orange": return .orange
        case "yellow": return .yellow
        case "cyan": return .cyan
        case "mint": return .mint
        case "pink": return .pink
        case "brown": return .brown
        default: return .gray
        }
    }
}

// MARK: - Material Chip

private struct MaterialChip: View {
    let material: Material

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(material.title)
                .font(.caption.bold())
                .lineLimit(1)

            Text(material.processingStatus.rawValue)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .padding(8)
        .background(Color(.systemBackground))
        .cornerRadius(8)
        .shadow(color: .black.opacity(0.05), radius: 2)
    }
}

// MARK: - Context History View

struct ContextHistoryView: View {
    @ObservedObject var contextManager = ContextManager.shared
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                if contextManager.contextHistory.isEmpty {
                    ContentUnavailableView(
                        "Nessuna Cronologia",
                        systemImage: "clock.arrow.circlepath",
                        description: Text("La tua cronologia dei contesti apparirà qui")
                    )
                } else {
                    ForEach(contextManager.contextHistory) { entry in
                        ContextHistoryRow(entry: entry)
                    }
                }
            }
            .navigationTitle("Cronologia Contesto")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Chiudi") {
                        dismiss()
                    }
                }

                if !contextManager.contextHistory.isEmpty {
                    ToolbarItem(placement: .destructiveAction) {
                        Button("Cancella") {
                            contextManager.clearHistory()
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Context History Row

private struct ContextHistoryRow: View {
    let entry: ContextHistoryEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Circle()
                    .fill(entry.subjectColor)
                    .frame(width: 10, height: 10)

                Text(entry.subjectName)
                    .font(.headline)

                Spacer()

                Text(entry.timestamp, style: .relative)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if let taskTitle = entry.taskTitle {
                Text(taskTitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            HStack {
                Label("\(Int(entry.duration / 60)) min", systemImage: "clock")
                    .font(.caption)

                if let progress = entry.progress {
                    Label("\(Int(progress * 100))%", systemImage: "chart.bar")
                        .font(.caption)
                }
            }
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Context Manager (Task 75)

@MainActor
final class ContextManager: ObservableObject {
    static let shared = ContextManager()

    @Published var currentSubject: Subject?
    @Published var currentTask: Task?
    @Published var currentProgress: Double?
    @Published var recentMaterials: [Material] = []
    @Published var contextHistory: [ContextHistoryEntry] = []

    private(set) var contextStartTime: Date?

    var timeSpentInContext: TimeInterval? {
        guard let startTime = contextStartTime else { return nil }
        return Date().timeIntervalSince(startTime)
    }

    private init() {}

    func setContext(subject: Subject?, task: Task? = nil, progress: Double? = nil) {
        // Save current context to history if there was one
        if let currentSubject = self.currentSubject {
            saveToHistory(subject: currentSubject, task: self.currentTask, progress: self.currentProgress)
        }

        self.currentSubject = subject
        self.currentTask = task
        self.currentProgress = progress
        self.contextStartTime = subject != nil ? Date() : nil
    }

    func updateProgress(_ progress: Double) {
        self.currentProgress = progress
    }

    func addRecentMaterial(_ material: Material) {
        // Remove if already exists
        recentMaterials.removeAll { $0.id == material.id }

        // Add to front
        recentMaterials.insert(material, at: 0)

        // Keep only last 10
        if recentMaterials.count > 10 {
            recentMaterials = Array(recentMaterials.prefix(10))
        }
    }

    func clearContext() {
        if let currentSubject = self.currentSubject {
            saveToHistory(subject: currentSubject, task: currentTask, progress: currentProgress)
        }

        currentSubject = nil
        currentTask = nil
        currentProgress = nil
        contextStartTime = nil
    }

    private func saveToHistory(subject: Subject, task: Task?, progress: Double?) {
        guard let startTime = contextStartTime else { return }

        let duration = Date().timeIntervalSince(startTime)

        let entry = ContextHistoryEntry(
            subjectName: subject.rawValue,
            subjectColorName: subject.colorName,
            taskTitle: task?.title,
            duration: duration,
            progress: progress,
            timestamp: Date()
        )

        contextHistory.insert(entry, at: 0)

        // Keep only last 50
        if contextHistory.count > 50 {
            contextHistory = Array(contextHistory.prefix(50))
        }
    }

    func clearHistory() {
        contextHistory.removeAll()
    }
}

// MARK: - Context History Entry

struct ContextHistoryEntry: Identifiable {
    let id = UUID()
    let subjectName: String
    let subjectColorName: String
    let taskTitle: String?
    let duration: TimeInterval
    let progress: Double?
    let timestamp: Date

    var subjectColor: Color {
        switch subjectColorName {
        case "purple": return .purple
        case "blue": return .blue
        case "red": return .red
        case "green": return .green
        case "orange": return .orange
        case "yellow": return .yellow
        case "cyan": return .cyan
        case "mint": return .mint
        case "pink": return .pink
        case "brown": return .brown
        default: return .gray
        }
    }
}

// MARK: - Preview

#Preview("Compact") {
    ContextBannerView()
        .onAppear {
            ContextManager.shared.setContext(
                subject: .matematica,
                task: nil,
                progress: 0.45
            )
        }
}

#Preview("Expanded") {
    ContextBannerView()
        .onAppear {
            ContextManager.shared.setContext(
                subject: .fisica,
                task: nil,
                progress: 0.65
            )
        }
}

#Preview("History") {
    ContextHistoryView()
}
