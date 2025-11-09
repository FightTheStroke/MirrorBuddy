//
//  TaskCreationView.swift
//  MirrorBuddy
//
//  Task creation sheet - simple, voice-enabled form
//  MirrorBuddy 2.0 - Fixed implementation (no more TODOs)
//

import SwiftUI

/// Data structure for task creation
struct TaskCreationData {
    var title: String
    var description: String?
    var subject: String?
    var dueDate: Date?
    var priority: TaskPriority
}

/// Task priority levels
enum TaskPriority: String, CaseIterable, Codable {
    case low = "Bassa"
    case normal = "Normale"
    case high = "Alta"
    case urgent = "Urgente"

    var color: Color {
        switch self {
        case .low: return .gray
        case .normal: return .blue
        case .high: return .orange
        case .urgent: return .red
        }
    }

    var icon: String {
        switch self {
        case .low: return "arrow.down.circle"
        case .normal: return "minus.circle"
        case .high: return "arrow.up.circle"
        case .urgent: return "exclamationmark.circle"
        }
    }

    /// Convert to Int for Task model (1-5)
    func toInt() -> Int {
        switch self {
        case .low: return 1
        case .normal: return 3
        case .high: return 4
        case .urgent: return 5
        }
    }

    /// Initialize from Int
    init(fromInt value: Int) {
        switch value {
        case 1: self = .low
        case 4: self = .high
        case 5: self = .urgent
        default: self = .normal
        }
    }
}

/// Task creation view
struct TaskCreationView: View {
    @Environment(\.dismiss) private var dismiss

    let onSave: (TaskCreationData) -> Void

    // Form state
    @State private var title: String = ""
    @State private var description: String = ""
    @State private var selectedSubject: String?
    @State private var dueDate: Date = Date().addingTimeInterval(86400) // Tomorrow
    @State private var hasDueDate: Bool = false
    @State private var priority: TaskPriority = .normal

    // Voice input
    @StateObject private var voiceEngine = ContinuousVoiceEngine.shared

    // Validation
    private var canSave: Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        NavigationStack {
            Form {
                // MARK: - Title
                Section {
                    TextField("Titolo compito", text: $title, axis: .vertical)
                        .font(.openDyslexicBody)
                        .lineLimit(2...4)
                        .textInputAutocapitalization(.sentences)
                } header: {
                    Text("Titolo")
                        .font(.openDyslexicHeadline)
                } footer: {
                    Text("Inserisci il titolo del compito")
                        .font(.openDyslexicCaption)
                }

                // MARK: - Description
                Section {
                    TextField("Descrizione (opzionale)", text: $description, axis: .vertical)
                        .font(.openDyslexicBody)
                        .lineLimit(3...6)
                        .textInputAutocapitalization(.sentences)
                } header: {
                    Text("Descrizione")
                        .font(.openDyslexicHeadline)
                }

                // MARK: - Subject
                Section {
                    Picker("Materia", selection: $selectedSubject) {
                        Text("Nessuna").tag(String?.none)
                        ForEach(subjects, id: \.self) { subject in
                            Text(subject).tag(String?.some(subject))
                        }
                    }
                    .font(.openDyslexicBody)
                } header: {
                    Text("Materia")
                        .font(.openDyslexicHeadline)
                }

                // MARK: - Due Date
                Section {
                    Toggle("Ha scadenza", isOn: $hasDueDate)
                        .font(.openDyslexicBody)

                    if hasDueDate {
                        DatePicker(
                            "Data scadenza",
                            selection: $dueDate,
                            in: Date()...,
                            displayedComponents: [.date]
                        )
                        .font(.openDyslexicBody)
                    }
                } header: {
                    Text("Scadenza")
                        .font(.openDyslexicHeadline)
                }

                // MARK: - Priority
                Section {
                    Picker("Priorità", selection: $priority) {
                        ForEach(TaskPriority.allCases, id: \.self) { level in
                            Label {
                                Text(level.rawValue)
                                    .font(.openDyslexicBody)
                            } icon: {
                                Image(systemName: level.icon)
                                    .foregroundStyle(level.color)
                            }
                            .tag(level)
                        }
                    }
                    .pickerStyle(.menu)
                } header: {
                    Text("Priorità")
                        .font(.openDyslexicHeadline)
                }

                // MARK: - Voice Input Hint
                Section {
                    HStack {
                        Image(systemName: "mic.fill")
                            .foregroundStyle(.blue)

                        Text("Puoi anche dire: \"Aggiungi compito di matematica per domani\"")
                            .font(.openDyslexicCallout)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("Nuovo Compito")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Annulla") {
                        dismiss()
                    }
                    .font(.openDyslexicBody)
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Salva") {
                        saveTask()
                    }
                    .font(.openDyslexicBody)
                    .fontWeight(.semibold)
                    .disabled(!canSave)
                }
            }
        }
    }

    private func saveTask() {
        let taskData = TaskCreationData(
            title: title,
            description: description.isEmpty ? nil : description,
            subject: selectedSubject,
            dueDate: hasDueDate ? dueDate : nil,
            priority: priority
        )

        onSave(taskData)
        dismiss()
    }

    // Available subjects
    private let subjects = [
        "Matematica",
        "Italiano",
        "Inglese",
        "Storia",
        "Geografia",
        "Scienze",
        "Arte",
        "Musica",
        "Educazione Fisica",
        "Tecnologia"
    ]
}

// MARK: - Preview

#Preview {
    TaskCreationView { data in
        print("Task created: \(data.title)")
    }
}
