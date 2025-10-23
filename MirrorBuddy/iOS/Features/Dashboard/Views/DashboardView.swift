//
//  DashboardView.swift
//  MirrorBuddy
//
//  Task 109: Extracted from MainTabView for better code organization
//  Main dashboard tab showing materials, quick actions, and context banner
//

import SwiftData
import SwiftUI

/// Main dashboard view for materials and quick actions (Task 109)
struct DashboardView: View {
    @Environment(\.modelContext) private var modelContext
    @EnvironmentObject var voiceCommandHandler: AppVoiceCommandHandler
    @Query private var materials: [Material]
    @Query private var subjects: [SubjectEntity]
    @Query private var userProgress: [UserProgress]
    @Query private var tasks: [Task]

    @State private var showingImport = false
    @State private var selectedMaterial: Material?
    @State private var showingStreakHistory = false
    @State private var showingGoalSettings = false

    private var currentProgress: UserProgress {
        if let progress = userProgress.first {
            return progress
        } else {
            let newProgress = UserProgress()
            modelContext.insert(newProgress)
            return newProgress
        }
    }

    private var todayPriorities: [Material] {
        calculatePriorities()
    }

    private var completedToday: Int {
        tasks.filter { task in
            guard task.isCompleted, let completedAt = task.completedAt else { return false }
            return Calendar.current.isDateInToday(completedAt)
        }.count
    }

    private var upcomingDeadlines: Int {
        tasks.filter { task in
            !task.isCompleted && (task.isDueSoon || task.isOverdue)
        }.count
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Context Banner at the top (Task 102.1)
                ContextBannerView()

                // Task 57: Offline mode banner
                ConnectionStatusBanner()
                    .padding(.top, 8)

                ScrollView {
                    VStack(spacing: 20) {
                        // Task 137.2: Today Card with personalized priorities
                        TodayCard(
                            todayPriorities: todayPriorities,
                            studyStreak: currentProgress.currentStreak,
                            completedToday: completedToday,
                            upcomingDeadlines: upcomingDeadlines
                        )
                        .padding(.horizontal)
                        .padding(.top)
                        .onTapGesture {
                            showingStreakHistory = true
                        }

                        // Big "Aggiornami" button - front and center
                        UpdateButtonView()

                        QuickActionsSection(showingImport: $showingImport)
                        MaterialsSection(
                            materials: materials,
                            subjects: subjects,
                            showingImport: $showingImport,
                            selectedMaterial: $selectedMaterial
                        )
                    }
                    .padding(.vertical)
                }
                .refreshable {
                    await refreshDashboardData()
                }
            }
            .navigationTitle("MirrorBuddy")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    HStack(spacing: 8) {
                        CompactSyncStatusView()
                        // Task 57: Connection type indicator
                        ConnectionTypeIndicator()
                    }
                }

                ToolbarItem {
                    Button {
                        showingImport = true
                    } label: {
                        Image(systemName: "plus")
                    }
                    .buttonStyle(.icon(color: .blue, size: 48))
                    .accessibilityLabel("Aggiungi materiale")
                    .accessibilityHint("Tocca due volte per importare nuovo materiale")
                }
            }
            .sheet(isPresented: $showingImport) {
                MaterialImportView()
            }
            .sheet(item: $selectedMaterial) { material in
                MaterialDetailView(material: material)
            }
            .sheet(isPresented: $showingStreakHistory) {
                StreakHistoryView(userProgress: currentProgress)
            }
            .sheet(isPresented: $showingGoalSettings) {
                GoalSettingsView(userProgress: currentProgress)
            }
            // Task 112: Voice command material detail navigation (enhanced with smart parsing)
            .onChange(of: voiceCommandHandler.selectedMaterialID) { _, materialQuery in
                guard let materialQuery = materialQuery else { return }

                // Parse query using smart material query parser
                // Supports: UUIDs, "last:geometry", "newest", "title:Storia", or direct title match
                if let materialID = MaterialQueryParser.findMaterial(
                    query: materialQuery,
                    in: materials,
                    subjects: subjects
                ) {
                    if let material = materials.first(where: { $0.id == materialID }) {
                        selectedMaterial = material
                    }
                }

                // Reset flag
                voiceCommandHandler.selectedMaterialID = nil
            }
        }
    }

    // MARK: - Data Functions (Task 137.3)

    /// Calculate priority materials for today based on deadlines, readiness, and activity
    private func calculatePriorities() -> [Material] {
        let calendar = Calendar.current
        let now = Date()

        let scoredMaterials = materials.map { material -> (material: Material, score: Double) in
            var score: Double = 0

            // 1. Deadline proximity (highest weight: 100 points max)
            if let task = material.tasks?.first(where: { !$0.isCompleted }), let dueDate = task.dueDate {
                let daysUntil = calendar.dateComponents([.day], from: now, to: dueDate).day ?? 999
                if daysUntil < 0 {
                    score += 100 // Overdue - highest priority
                } else if daysUntil == 0 {
                    score += 90 // Due today
                } else if daysUntil == 1 {
                    score += 70 // Due tomorrow
                } else if daysUntil <= 3 {
                    score += 50 // Due in 3 days
                } else if daysUntil <= 7 {
                    score += 30 // Due this week
                } else {
                    score += 10 // Future deadline
                }
            }

            // 2. Has study assets ready (40 points max)
            if material.mindMap != nil {
                score += 20 // Mind map available
            }
            if !(material.flashcards?.isEmpty ?? true) {
                score += 20 // Flashcards available
            }

            // 3. Recent activity (20 points max)
            if let lastAccessed = material.lastAccessedAt {
                let hoursSince = calendar.dateComponents([.hour], from: lastAccessed, to: now).hour ?? 999
                if hoursSince <= 24 {
                    score += 20 // Studied today
                } else if hoursSince <= 48 {
                    score += 10 // Studied yesterday
                }
            }

            // 4. New materials never accessed (15 points)
            if material.lastAccessedAt == nil && material.processingStatus == .completed {
                score += 15
            }

            // 5. Processing completed (5 points)
            if material.processingStatus == .completed {
                score += 5
            }

            return (material, score)
        }

        // Sort by score descending and return top 3
        return scoredMaterials
            .sorted { $0.score > $1.score }
            .prefix(3)
            .map { $0.material }
    }

    /// Refresh dashboard data from Google Calendar and other services
    private func refreshDashboardData() async {
        do {
            _ = try await GoogleCalendarService.shared.syncCalendarEvents()
            currentProgress.updateStreak()
            try? modelContext.save()
        } catch {
            print("Error refreshing dashboard: \(error)")
        }
    }
}

// MARK: - Quick Actions Section

/// Quick action cards for common tasks (Task 109)
struct QuickActionsSection: View {
    @Binding var showingImport: Bool
    @State private var showingScanner = false
    @State private var scannedMaterial: Material?
    @State private var showingStudyTimer = false
    @StateObject private var timer = StudyTimerService.shared
    // Note: Voice conversation removed - now handled by SmartVoiceButton (Task 139.3)

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Azioni rapide")
                .font(.headline)
                .padding(.horizontal)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    // Task 78: Study Timer Quick Action
                    StudyTimerCard(
                        showingStudyTimer: $showingStudyTimer,
                        timer: timer
                    )
                    .accessibilityLabelWithVoiceCommand("Timer di studio", voiceCommand: "avvia timer")

                    QuickActionCard(
                        icon: "cloud.fill",
                        title: "Importa da Drive",
                        color: .blue
                    ) {
                        showingImport = true
                    }
                    .accessibilityLabelWithVoiceCommand("Importa materiali da Google Drive", voiceCommand: "importa materiale")

                    QuickActionCard(
                        icon: "doc.text.viewfinder",
                        title: "Scansiona",
                        color: .green
                    ) {
                        showingScanner = true
                    }
                    .accessibilityLabelWithVoiceCommand("Scansiona documento", voiceCommand: "fotografa")

                    // Note: "Lezione vocale" quick action removed (Task 139.3)
                    // Use SmartVoiceButton (bottom-right floating button) instead
                }
                .padding(.horizontal)
            }
        }
        .fullScreenCover(isPresented: $showingScanner) {
            DocumentScannerView { material in
                scannedMaterial = material
            }
            .ignoresSafeArea()
        }
        .sheet(item: $scannedMaterial) { material in
            MaterialDetailView(material: material)
        }
        .sheet(isPresented: $showingStudyTimer) {
            NavigationStack {
                StudyTimerView()
            }
        }
        // Note: Voice conversation sheet removed - now handled by SmartVoiceButton (Task 139.3)
    }
}

// MARK: - Materials Section

/// Section displaying materials grouped by subject (Task 109)
struct MaterialsSection: View {
    let materials: [Material]
    let subjects: [SubjectEntity]
    @Binding var showingImport: Bool
    @Binding var selectedMaterial: Material?
    @StateObject private var offlineManager = OfflineManager.shared

    var body: some View {
        Group {
            if materials.isEmpty {
                emptyState
            } else {
                VStack(spacing: 0) {
                    // Task 57: Offline materials indicator
                    if !offlineManager.isOnline {
                        HStack {
                            Image(systemName: "arrow.down.circle.fill")
                                .foregroundColor(.green)
                            Text("Showing cached materials")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Spacer()
                        }
                        .padding(.horizontal)
                        .padding(.vertical, 8)
                        .background(Color.green.opacity(0.1))
                    }

                    materialsList
                }
            }
        }
    }

    private var emptyState: some View {
        ContentUnavailableView {
            Label("Nessun materiale", systemImage: "book.closed")
        } description: {
            Text(offlineManager.isOnline ? "Importa materiali da Google Drive per iniziare" : "Offline - cannot import materials")
        } actions: {
            if offlineManager.isOnline {
                Button {
                    showingImport = true
                } label: {
                    Label("Importa materiali", systemImage: "cloud.fill")
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .frame(height: 300)
    }

    private var materialsList: some View {
        ForEach(subjects) { subject in
            SubjectMaterialsRow(
                subject: subject,
                materials: materials.filter { $0.subject?.id == subject.id },
                selectedMaterial: $selectedMaterial
            )
        }
    }
}

// MARK: - Subject Materials Row

/// Row displaying materials for a specific subject (Task 109)
struct SubjectMaterialsRow: View {
    let subject: SubjectEntity
    let materials: [Material]
    @Binding var selectedMaterial: Material?

    var body: some View {
        if !materials.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Label(subject.displayName, systemImage: subject.iconName)
                        .font(.headline)
                        .foregroundStyle(subject.color)

                    Spacer()

                    Text("\(materials.count)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding(.horizontal)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(materials) { material in
                            MaterialCardView(material: material) {
                                selectedMaterial = material
                            }
                            .frame(width: 160, height: 200)
                        }
                    }
                    .padding(.horizontal)
                }
            }
        }
    }
}

// MARK: - Quick Action Card

/// Card view for quick action buttons (Task 109)
struct QuickActionCard: View {
    let icon: String
    let title: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 32))
                    .foregroundStyle(color)

                Text(title)
                    .font(.caption)
                    .foregroundStyle(.primary)
                    .multilineTextAlignment(.center)
            }
            .frame(width: 120, height: 100)
            .background(color.opacity(0.1))
            .cornerRadius(12)
        }
        .buttonStyle(.childFriendly)
        .accessibilityLabel(title)
        .accessibilityHint("Tocca due volte per aprire")
    }
}

// MARK: - Study Timer Card (Task 78)

/// Study timer quick action card with live timer display
struct StudyTimerCard: View {
    @Binding var showingStudyTimer: Bool
    @ObservedObject var timer: StudyTimerService

    var body: some View {
        Button {
            showingStudyTimer = true
        } label: {
            VStack(spacing: 8) {
                HStack(spacing: 4) {
                    Image(systemName: timer.isRunning ? "timer.circle.fill" : "timer")
                        .font(.system(size: 32))
                        .foregroundStyle(timer.isRunning ? .blue : .orange)
                        .symbolEffect(.pulse, isActive: timer.isRunning)

                    if timer.isRunning {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(timer.formattedTime)
                                .font(.caption.bold().monospaced())
                                .foregroundStyle(.blue)
                            if timer.isPaused {
                                Text("In pausa")
                                    .font(.system(size: 8))
                                    .foregroundStyle(.orange)
                            }
                        }
                    }
                }

                Text(timer.isRunning ? "Timer attivo" : "Timer di studio")
                    .font(.caption)
                    .foregroundStyle(.primary)
                    .multilineTextAlignment(.center)
            }
            .frame(width: 120, height: 100)
            .background(timer.isRunning ? Color.blue.opacity(0.1) : Color.orange.opacity(0.1))
            .cornerRadius(12)
        }
        .buttonStyle(.childFriendly)
        .accessibilityLabel("Timer di studio")
        .accessibilityHint("Tocca due volte per aprire il timer")
    }
}
