//
//  TasksView.swift
//  MirrorBuddy
//
//  Task 109: Extracted from MainTabView for better code organization
//  Tasks tab showing personal tasks, calendar events, and teacher emails
//

import SwiftData
import SwiftUI

/// Tasks view with email and calendar integration (Task 109)
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
                EmailCalendarSyncView                    {
                        await syncEmailsAndCalendar()
                    }
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
