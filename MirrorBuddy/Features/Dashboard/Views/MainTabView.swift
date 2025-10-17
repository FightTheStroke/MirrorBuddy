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
    @State private var showingVoiceInterface = false

    var body: some View {
        ZStack {
            // Main tab view
            TabView(selection: $selectedTab) {
            // MARK: - Dashboard Tab (Materiali)
            DashboardView()
                .tabItem {
                    Label {
                        Text("Materiali")
                            .font(.headline)
                    } icon: {
                        Image(systemName: "books.vertical")
                            .font(.system(size: 28))
                    }
                }
                .tag(0)

            // MARK: - Study Tab (Studia)
            StudyView()
                .tabItem {
                    Label {
                        Text("Studia")
                            .font(.headline)
                    } icon: {
                        Image(systemName: "brain.head.profile")
                            .font(.system(size: 28))
                    }
                }
                .tag(1)

            // MARK: - Tasks Tab (Compiti)
            TasksView()
                .tabItem {
                    Label {
                        Text("Compiti")
                            .font(.headline)
                    } icon: {
                        Image(systemName: "checklist")
                            .font(.system(size: 28))
                    }
                }
                .tag(2)

            // MARK: - Voice Tab (Voce)
            VoiceView()
                .tabItem {
                    Label {
                        Text("Voce")
                            .font(.headline)
                    } icon: {
                        Image(systemName: "waveform")
                            .font(.system(size: 28))
                    }
                }
                .tag(3)
        }
        // Larger tab bar for child-friendly touch targets
        .onAppear {
            let appearance = UITabBarAppearance()
            appearance.configureWithDefaultBackground()

            // Increase tab bar height and icon size via item appearance
            let itemAppearance = UITabBarItemAppearance()
            itemAppearance.normal.iconColor = UIColor.systemGray
            itemAppearance.selected.iconColor = UIColor.systemBlue

            // Larger font for labels
            let normalAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 12, weight: .medium)
            ]
            let selectedAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 12, weight: .semibold)
            ]

            itemAppearance.normal.titleTextAttributes = normalAttributes
            itemAppearance.selected.titleTextAttributes = selectedAttributes

            appearance.stackedLayoutAppearance = itemAppearance
            appearance.inlineLayoutAppearance = itemAppearance
            appearance.compactInlineLayoutAppearance = itemAppearance

            UITabBar.appearance().standardAppearance = appearance
            UITabBar.appearance().scrollEdgeAppearance = appearance
        }

            // MARK: - Persistent Voice Button (Task 106)
            // Floating voice activation button accessible from all tabs
            VStack {
                Spacer()
                HStack {
                    Spacer()
                    PersistentVoiceButton(isPresented: $showingVoiceInterface)
                        .padding(.trailing, 16)
                        .padding(.bottom, 90) // Position above tab bar
                        .shadow(color: .black.opacity(0.2), radius: 8, y: 4)
                }
            }
            .allowsHitTesting(true)

            // MARK: - Voice Command Feedback (Task 103)
            // Global feedback overlay for voice commands
            VoiceCommandFeedbackView()
                .zIndex(999)

            // Voice interface sheet
            .sheet(isPresented: $showingVoiceInterface) {
                NavigationStack {
                    VoiceConversationView()
                }
            }
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
            VStack(spacing: 0) {
                // Context Banner at the top (Task 102.1)
                ContextBannerView()

                ScrollView {
                    VStack(spacing: 20) {
                        // Big "Aggiornami" button - front and center
                        UpdateButtonView()
                            .padding(.top)

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
        }
    }
}

// MARK: - Quick Actions Section
struct QuickActionsSection: View {
    @Binding var showingImport: Bool
    @State private var showingScanner = false
    @State private var scannedMaterial: Material?
    @State private var showingVoiceConversation = false // Task 102.3

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
                    .accessibilityLabelWithVoiceCommand("Importa materiali da Google Drive", voiceCommand: "importa materiale")

                    QuickActionCard(
                        icon: "doc.text.viewfinder",
                        title: "Scansiona",
                        color: .green
                    ) {
                        showingScanner = true
                    }
                    .accessibilityLabelWithVoiceCommand("Scansiona documento", voiceCommand: "fotografa")

                    QuickActionCard(
                        icon: "waveform",
                        title: "Lezione vocale",
                        color: .purple
                    ) {
                        // Launch voice conversation (Task 102.3)
                        showingVoiceConversation = true
                    }
                    .accessibilityLabelWithVoiceCommand("Avvia lezione vocale", voiceCommand: QuickActionVoiceCommands.voiceLesson)
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
        .sheet(isPresented: $showingVoiceConversation) {
            // Task 102.3: Wire voice conversation integration
            NavigationStack {
                VoiceConversationView()
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
        .buttonStyle(.childFriendly)
        .accessibilityLabel(title)
        .accessibilityHint("Tocca due volte per aprire")
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
                    ForEach(materials.filter { !($0.flashcards?.isEmpty ?? true) }) { material in
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
                                    Text("\(material.flashcards?.count ?? 0) flashcard")
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
                    .buttonStyle(.icon(color: .blue, size: 48))
                    .disabled(isSyncing)
                    .accessibilityLabel(isSyncing ? "Sincronizzazione in corso" : "Sincronizza email e calendario")
                    .accessibilityHint("Tocca due volte per aprire le impostazioni di sincronizzazione")
                }

                ToolbarItem {
                    Button {
                        // TODO: Add task
                    } label: {
                        Image(systemName: "plus")
                    }
                    .buttonStyle(.icon(color: .blue, size: 48))
                    .accessibilityLabel("Aggiungi compito")
                    .accessibilityHint("Tocca due volte per creare un nuovo compito")
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

// MARK: - Voice View with Real Conversation
struct VoiceView: View {
    @State private var showingConversation = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 40) {
                Spacer()

                Image(systemName: "waveform.circle")
                    .font(.system(size: 100))
                    .foregroundStyle(.blue)

                VStack(spacing: 8) {
                    Text("Assistente Vocale")
                        .font(.title2)
                        .fontWeight(.semibold)

                    Text("Parla con il tuo coach di studio personale")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }

                Button {
                    showingConversation = true
                } label: {
                    HStack {
                        Image(systemName: "mic.fill")
                        Text("Inizia Conversazione")
                    }
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(12)
                    .padding(.horizontal, 32)
                }

                Spacer()

                // Info box
                VStack(alignment: .leading, spacing: 12) {
                    HStack(alignment: .top, spacing: 12) {
                        Image(systemName: "info.circle.fill")
                            .font(.title3)
                            .foregroundStyle(.blue)

                        VStack(alignment: .leading, spacing: 4) {
                            Text("Cosa puoi fare:")
                                .font(.headline)

                            Text("• Chiedi aiuto con i compiti")
                            Text("• Fai domande sul materiale")
                            Text("• Chiedi spiegazioni semplici")
                            Text("• Parla in italiano naturalmente")
                        }
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    }
                }
                .padding()
                .background(Color.blue.opacity(0.1))
                .cornerRadius(12)
                .padding(.horizontal, 32)
            }
            .padding()
            .navigationTitle("Voice Coach")
            .sheet(isPresented: $showingConversation) {
                VoiceConversationView()
            }
        }
    }
}

#Preview {
    MainTabView()
        .modelContainer(for: Material.self, inMemory: true)
}
