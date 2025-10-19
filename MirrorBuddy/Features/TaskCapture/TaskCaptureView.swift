import SwiftUI

/// View for capturing tasks via voice or manual input
struct TaskCaptureView: View {

    @StateObject private var captureService = TaskCaptureService()
    @Environment(\.dismiss) private var dismiss

    @State private var showManualEntry = false
    @State private var manualTitle = ""
    @State private var manualSubject: String?
    @State private var manualDueDate = Date()
    @State private var manualPriority: NaturalLanguageTaskParser.ParsedTask.TaskPriority = .medium
    @State private var manualNotes = ""

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // Voice Capture Section
                voiceCaptureSection

                Divider()

                // Manual Entry Section
                manualEntrySection

                Spacer()

                // Saved Tasks List
                if !captureService.savedTasks.isEmpty {
                    savedTasksList
                }
            }
            .padding()
            .navigationTitle(TaskCaptureStrings.UI.addTask)
            .overlay {
                if captureService.isConfirming {
                    confirmationOverlay
                }
            }
            .sheet(isPresented: $showManualEntry) {
                manualEntrySheet
            }
        }
    }

    // MARK: - Voice Capture

    private var voiceCaptureSection: some View {
        VStack(spacing: 16) {
            Button {
                if captureService.isListening {
                    captureService.stopVoiceCapture()
                } else {
                    captureService.startVoiceCapture()
                }
            } label: {
                HStack {
                    Image(systemName: captureService.isListening ? "mic.fill" : "mic")
                        .font(.title)
                        .foregroundColor(captureService.isListening ? .red : .blue)

                    Text(captureService.isListening ?
                         "Sto ascoltando..." :
                         TaskCaptureStrings.UI.voiceCapture)
                        .font(.headline)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(captureService.isListening ?
                           Color.red.opacity(0.1) :
                           Color.blue.opacity(0.1))
                .cornerRadius(12)
            }

            if !captureService.capturedText.isEmpty {
                Text(captureService.capturedText)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .padding()
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(8)
            }
        }
    }

    // MARK: - Manual Entry

    private var manualEntrySection: some View {
        Button {
            showManualEntry = true
        } label: {
            Label(TaskCaptureStrings.UI.manualEntry, systemImage: "square.and.pencil")
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color(.secondarySystemBackground))
                .cornerRadius(12)
        }
    }

    private var manualEntrySheet: some View {
        NavigationView {
            Form {
                Section {
                    TextField(TaskCaptureStrings.UI.taskTitle, text: $manualTitle)
                }

                Section {
                    Picker(TaskCaptureStrings.UI.subject, selection: $manualSubject) {
                        Text("Nessuna").tag(nil as String?)
                        Text(TaskCaptureStrings.Subject.math).tag(TaskCaptureStrings.Subject.math as String?)
                        Text(TaskCaptureStrings.Subject.italian).tag(TaskCaptureStrings.Subject.italian as String?)
                        Text(TaskCaptureStrings.Subject.history).tag(TaskCaptureStrings.Subject.history as String?)
                        Text(TaskCaptureStrings.Subject.science).tag(TaskCaptureStrings.Subject.science as String?)
                        Text(TaskCaptureStrings.Subject.language).tag(TaskCaptureStrings.Subject.language as String?)
                    }

                    DatePicker(TaskCaptureStrings.UI.dueDate, selection: $manualDueDate, displayedComponents: .date)

                    Picker(TaskCaptureStrings.UI.priority, selection: $manualPriority) {
                        Text(TaskCaptureStrings.Priority.name(for: .low)).tag(NaturalLanguageTaskParser.ParsedTask.TaskPriority.low)
                        Text(TaskCaptureStrings.Priority.name(for: .medium)).tag(NaturalLanguageTaskParser.ParsedTask.TaskPriority.medium)
                        Text(TaskCaptureStrings.Priority.name(for: .high)).tag(NaturalLanguageTaskParser.ParsedTask.TaskPriority.high)
                    }
                }

                Section {
                    TextEditor(text: $manualNotes)
                        .frame(minHeight: 100)
                } header: {
                    Text(TaskCaptureStrings.UI.notes)
                }
            }
            .navigationTitle(TaskCaptureStrings.UI.addTask)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(TaskCaptureStrings.UI.cancel) {
                        showManualEntry = false
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button(TaskCaptureStrings.UI.save) {
                        saveManualTask()
                    }
                    .disabled(manualTitle.isEmpty)
                }
            }
        }
    }

    private func saveManualTask() {
        captureService.addTask(
            title: manualTitle,
            subject: manualSubject,
            dueDate: manualDueDate,
            priority: manualPriority,
            notes: manualNotes.isEmpty ? nil : manualNotes
        )

        // Reset fields
        manualTitle = ""
        manualSubject = nil
        manualDueDate = Date()
        manualPriority = .medium
        manualNotes = ""

        showManualEntry = false
    }

    // MARK: - Confirmation Overlay

    private var confirmationOverlay: some View {
        ZStack {
            Color.black.opacity(0.4)
                .edgesIgnoringSafeArea(.all)

            VStack(spacing: 20) {
                if let task = captureService.parsedTask {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(task.title)
                            .font(.title2)
                            .fontWeight(.bold)

                        if let subject = task.subject {
                            HStack {
                                Image(systemName: "book")
                                Text(subject)
                            }
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        }

                        if let dueDate = task.dueDate {
                            HStack {
                                Image(systemName: "calendar")
                                Text(dueDate, style: .date)
                            }
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        }

                        HStack {
                            Image(systemName: "flag.fill")
                            Text(task.priority.displayName)
                        }
                        .font(.subheadline)
                        .foregroundColor(priorityColor(task.priority))
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(12)

                    HStack(spacing: 12) {
                        Button {
                            captureService.cancelTask()
                        } label: {
                            Text(TaskCaptureStrings.UI.cancel)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color(.secondarySystemBackground))
                                .foregroundColor(.primary)
                                .cornerRadius(10)
                        }

                        Button {
                            captureService.confirmAndSaveTask()
                        } label: {
                            Text(TaskCaptureStrings.UI.confirm)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.blue)
                                .foregroundColor(.white)
                                .cornerRadius(10)
                        }
                    }
                }
            }
            .padding()
        }
    }

    // MARK: - Saved Tasks

    private var savedTasksList: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Task Salvati")
                .font(.headline)

            ScrollView {
                LazyVStack(spacing: 8) {
                    ForEach(captureService.savedTasks) { task in
                        taskRow(task)
                    }
                }
            }
            .frame(maxHeight: 300)
        }
    }

    private func taskRow(_ task: CapturedTask) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(task.title)
                    .font(.subheadline)
                    .fontWeight(.medium)

                HStack {
                    if let subject = task.subject {
                        Text(subject)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }

                    if let dueDate = task.dueDate {
                        Text(dueDate, style: .date)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            }

            Spacer()

            Image(systemName: "flag.fill")
                .foregroundColor(priorityColor(task.priority))
                .font(.caption)
        }
        .padding()
        .background(Color(.tertiarySystemBackground))
        .cornerRadius(8)
    }

    private func priorityColor(_ priority: NaturalLanguageTaskParser.ParsedTask.TaskPriority) -> Color {
        switch priority {
        case .high: return .red
        case .medium: return .orange
        case .low: return .blue
        }
    }
}

// MARK: - Nightly Plan View

struct NightlyPlanView: View {

    @StateObject private var captureService = TaskCaptureService()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "moon.stars.fill")
                .font(.system(size: 60))
                .foregroundColor(.orange)

            Text(TaskCaptureStrings.NightlyPlan.greeting)
                .font(.title2)
                .fontWeight(.bold)
                .multilineTextAlignment(.center)

            ScrollView {
                Text(captureService.generateNightlyPlan())
                    .font(.body)
                    .padding()
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(12)
            }

            Button {
                captureService.speakNightlyPlan()
            } label: {
                Label("Ascolta Riepilogo", systemImage: "speaker.wave.2.fill")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(12)
            }

            Button {
                dismiss()
            } label: {
                Text(TaskCaptureStrings.NightlyPlan.goodNight)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(12)
            }
        }
        .padding()
    }
}

// MARK: - Preview

#Preview {
    TaskCaptureView()
}

#Preview("Nightly Plan") {
    NightlyPlanView()
}
