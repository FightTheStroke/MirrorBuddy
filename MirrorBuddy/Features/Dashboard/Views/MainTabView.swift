//
//  MainTabView.swift
//  MirrorBuddy
//
//  Main tab-based navigation for the app
//

import SwiftUI
import SwiftData

struct MainTabView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            // MARK: - Dashboard Tab
            DashboardView()
                .tabItem {
                    Label("Materiali", systemImage: "books.vertical")
                }
                .tag(0)

            // MARK: - Study Tab
            StudyView()
                .tabItem {
                    Label("Studia", systemImage: "brain.head.profile")
                }
                .tag(1)

            // MARK: - Tasks Tab
            TasksView()
                .tabItem {
                    Label("Compiti", systemImage: "checklist")
                }
                .tag(2)

            // MARK: - Voice Tab
            VoiceView()
                .tabItem {
                    Label("Voice", systemImage: "waveform")
                }
                .tag(3)

            // MARK: - Settings Tab
            SettingsView()
                .tabItem {
                    Label("Impostazioni", systemImage: "gearshape")
                }
                .tag(4)
        }
    }
}

// MARK: - Dashboard View
struct DashboardView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var materials: [Material]
    @Query private var subjects: [SubjectEntity]
    @State private var showingImport = false
    @State private var selectedMaterial: Material?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
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
            .navigationTitle("MirrorBuddy")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    CompactSyncStatusView()
                }

                ToolbarItem {
                    Button {
                        showingImport = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingImport) {
                MaterialImportView()
            }
            .sheet(item: $selectedMaterial) { material in
                MaterialDetailView(material: material)
            }
        }
    }
}

// MARK: - Quick Actions Section
struct QuickActionsSection: View {
    @Binding var showingImport: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Azioni rapide")
                .font(.headline)
                .padding(.horizontal)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    QuickActionCard(
                        icon: "cloud.fill",
                        title: "Importa da Drive",
                        color: .blue
                    ) {
                        showingImport = true
                    }

                    QuickActionCard(
                        icon: "doc.text.viewfinder",
                        title: "Scansiona",
                        color: .green
                    ) {
                        // TODO: Open camera scanner
                    }

                    QuickActionCard(
                        icon: "waveform",
                        title: "Lezione vocale",
                        color: .purple
                    ) {
                        // TODO: Start voice lesson
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

// MARK: - Materials Section
struct MaterialsSection: View {
    let materials: [Material]
    let subjects: [SubjectEntity]
    @Binding var showingImport: Bool
    @Binding var selectedMaterial: Material?

    var body: some View {
        Group {
            if materials.isEmpty {
                emptyState
            } else {
                materialsList
            }
        }
    }

    private var emptyState: some View {
        ContentUnavailableView {
            Label("Nessun materiale", systemImage: "book.closed")
        } description: {
            Text("Importa materiali da Google Drive per iniziare")
        } actions: {
            Button {
                showingImport = true
            } label: {
                Label("Importa materiali", systemImage: "cloud.fill")
            }
            .buttonStyle(.borderedProminent)
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
    }
}

// MARK: - Study View Placeholder
struct StudyView: View {
    @Query private var materials: [Material]
    @State private var selectedMaterial: Material?

    var body: some View {
        NavigationStack {
            List {
                Section("Flashcard") {
                    ForEach(materials.filter { !$0.flashcards.isEmpty }) { material in
                        NavigationLink {
                            // TODO: FlashcardStudyView(material: material)
                            Text("Flashcard per \(material.title)")
                        } label: {
                            HStack {
                                Image(systemName: "rectangle.portrait.on.rectangle.portrait")
                                    .foregroundStyle(.blue)
                                VStack(alignment: .leading) {
                                    Text(material.title)
                                        .font(.headline)
                                    Text("\(material.flashcards.count) flashcard")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }

                Section("Mappe mentali") {
                    ForEach(materials.filter { $0.mindMap != nil }) { material in
                        NavigationLink {
                            // TODO: MindMapView(material: material)
                            Text("Mappa mentale per \(material.title)")
                        } label: {
                            HStack {
                                Image(systemName: "brain.head.profile")
                                    .foregroundStyle(.purple)
                                VStack(alignment: .leading) {
                                    Text(material.title)
                                        .font(.headline)
                                    Text("Mappa mentale")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Studia")
        }
    }
}

// MARK: - Tasks View with Email & Calendar
struct TasksView: View {
    @Query private var tasks: [Task]
    @State private var showingSyncSheet = false
    @State private var isSyncing = false
    @State private var syncError: String?
    @State private var gmailMessages: [MBGmailMessage] = []
    @State private var calendarEvents: [GCalendarEvent] = []

    var body: some View {
        NavigationStack {
            List {
                // Calendar Events Section
                if !calendarEvents.isEmpty {
                    Section("Prossimi Eventi") {
                        ForEach(calendarEvents.prefix(5), id: \.id) { event in
                            HStack {
                                Image(systemName: "calendar")
                                    .foregroundStyle(.orange)

                                VStack(alignment: .leading, spacing: 4) {
                                    Text(event.summary)
                                        .font(.headline)
                                    Text(event.startDate, style: .date)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }

                // Teacher Emails Section
                if !gmailMessages.isEmpty {
                    Section("Email Professori") {
                        ForEach(gmailMessages.prefix(5), id: \.id) { message in
                            HStack {
                                Image(systemName: message.isRead ? "envelope.open" : "envelope.badge")
                                    .foregroundStyle(message.isRead ? .gray : .blue)

                                VStack(alignment: .leading, spacing: 4) {
                                    Text(message.subject)
                                        .font(.headline)
                                        .lineLimit(1)
                                    Text(message.from)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }

                // Tasks Section
                Section("I Miei Compiti") {
                    ForEach(tasks) { task in
                        HStack {
                            Image(systemName: task.isCompleted ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle(task.isCompleted ? .green : .gray)

                            VStack(alignment: .leading) {
                                Text(task.title)
                                    .font(.headline)
                                if let dueDate = task.dueDate {
                                    Text(dueDate, style: .date)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Compiti")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        showingSyncSheet = true
                    } label: {
                        Image(systemName: isSyncing ? "arrow.triangle.2.circlepath" : "envelope.arrow.triangle.branch")
                    }
                    .disabled(isSyncing)
                }

                ToolbarItem {
                    Button {
                        // TODO: Add task
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingSyncSheet) {
                EmailCalendarSyncView(
                    onSync: {
                        await syncEmailsAndCalendar()
                    }
                )
            }
            .task {
                // Load cached data on appear
                loadCachedData()
            }
            .refreshable {
                await syncEmailsAndCalendar()
            }
        }
    }

    private func loadCachedData() {
        // TODO: Load from SwiftData
    }

    private func syncEmailsAndCalendar() async {
        guard !isSyncing else { return }
        isSyncing = true
        defer { isSyncing = false }

        do {
            // Sync Gmail
            let messages = try await GmailService.shared.syncEmails(fromTeachersOnly: true)
            await MainActor.run {
                gmailMessages = messages
            }

            // Sync Calendar
            let events = try await GoogleCalendarService.shared.syncCalendarEvents()
            await MainActor.run {
                calendarEvents = events.filter { $0.startDate > Date() }.sorted { $0.startDate < $1.startDate }
            }
        } catch {
            await MainActor.run {
                syncError = error.localizedDescription
            }
        }
    }
}

// MARK: - Voice View Placeholder
struct VoiceView: View {
    @State private var isRecording = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 40) {
                Spacer()

                Image(systemName: isRecording ? "waveform.circle.fill" : "waveform.circle")
                    .font(.system(size: 100))
                    .foregroundStyle(isRecording ? .red : .blue)
                    .symbolEffect(.pulse, isActive: isRecording)

                VStack(spacing: 8) {
                    Text(isRecording ? "In ascolto..." : "Tocca per iniziare")
                        .font(.title2)
                        .fontWeight(.semibold)

                    Text(isRecording ? "Fai una domanda sul materiale" : "Assistente vocale per lo studio")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }

                Button {
                    isRecording.toggle()
                    // TODO: Start/stop voice interaction
                } label: {
                    Image(systemName: isRecording ? "stop.circle.fill" : "mic.circle.fill")
                        .font(.system(size: 60))
                        .foregroundStyle(isRecording ? .red : .blue)
                }

                Spacer()
            }
            .padding()
            .navigationTitle("Assistente vocale")
        }
    }
}

#Preview {
    MainTabView()
        .modelContainer(for: Material.self, inMemory: true)
}
