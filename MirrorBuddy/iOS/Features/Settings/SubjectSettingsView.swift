//
//  SubjectSettingsView.swift
//  MirrorBuddy
//
//  Task 83.3: Complete subject management UI
//  Allows users to activate/deactivate subjects, reorder, add custom subjects, and edit properties
//

import SwiftData
import SwiftUI

struct SubjectSettingsView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @Query(sort: \SubjectEntity.sortOrder) private var allSubjects: [SubjectEntity]

    @State private var showingAddSubject = false
    @State private var editingSubject: SubjectEntity?
    @State private var showingDeleteConfirmation = false
    @State private var subjectToDelete: SubjectEntity?

    var body: some View {
        NavigationStack {
            List {
                // Active subjects section
                Section {
                    ForEach(activeSubjects) { subject in
                        SubjectRow(subject: subject, onEdit: {
                            editingSubject = subject
                        }, onDelete: canDelete(subject) ? {
                            subjectToDelete = subject
                            showingDeleteConfirmation = true
                        } : nil)
                    }
                    .onMove(perform: moveSubjects)
                } header: {
                    Text("Active Subjects")
                } footer: {
                    Text("Subjects shown in the app. Drag to reorder.")
                }

                // Inactive subjects section
                if !inactiveSubjects.isEmpty {
                    Section {
                        ForEach(inactiveSubjects) { subject in
                            SubjectRow(subject: subject, onEdit: {
                                editingSubject = subject
                            }, onDelete: canDelete(subject) ? {
                                subjectToDelete = subject
                                showingDeleteConfirmation = true
                            } : nil)
                        }
                    } header: {
                        Text("Inactive Subjects")
                    } footer: {
                        Text("Hidden subjects. Tap to activate.")
                    }
                }
            }
            .navigationTitle("Subjects")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    EditButton()
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showingAddSubject = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingAddSubject) {
                AddCustomSubjectView()
            }
            .sheet(item: $editingSubject) { subject in
                EditSubjectView(subject: subject)
            }
            .alert("Delete Subject", isPresented: $showingDeleteConfirmation, presenting: subjectToDelete) { subject in
                Button("Cancel", role: .cancel) {}
                Button("Delete", role: .destructive) {
                    deleteSubject(subject)
                }
            } message: { subject in
                Text("Are you sure you want to delete \"\(subject.displayName)\"? This will remove it from all materials and tasks.")
            }
        }
    }

    // MARK: - Computed Properties

    private var activeSubjects: [SubjectEntity] {
        allSubjects.filter { $0.isActive }
    }

    private var inactiveSubjects: [SubjectEntity] {
        allSubjects.filter { !$0.isActive }
    }

    // MARK: - Actions

    private func canDelete(_ subject: SubjectEntity) -> Bool {
        // Can only delete custom subjects
        subject.isCustom
    }

    private func moveSubjects(from source: IndexSet, to destination: Int) {
        var subjects = activeSubjects
        subjects.move(fromOffsets: source, toOffset: destination)

        // Update sort order
        for (index, subject) in subjects.enumerated() {
            subject.sortOrder = index
        }

        try? modelContext.save()
    }

    private func deleteSubject(_ subject: SubjectEntity) {
        modelContext.delete(subject)
        try? modelContext.save()
    }
}

// MARK: - Subject Row

private struct SubjectRow: View {
    @Bindable var subject: SubjectEntity
    let onEdit: () -> Void
    let onDelete: (() -> Void)?

    var body: some View {
        HStack(spacing: 12) {
            // Icon
            Image(systemName: subject.iconName)
                .font(.title2)
                .foregroundStyle(subject.color)
                .frame(width: 32)

            // Name
            VStack(alignment: .leading, spacing: 4) {
                Text(subject.displayName)
                    .font(.headline)

                if subject.isCustom {
                    Text("Custom")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            // Active toggle
            Toggle("", isOn: $subject.isActive)
                .labelsHidden()
        }
        .contentShape(Rectangle())
        .onTapGesture {
            onEdit()
        }
        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
            if let onDelete = onDelete {
                Button(role: .destructive) {
                    onDelete()
                } label: {
                    Label("Delete", systemImage: "trash")
                }
            }

            Button {
                onEdit()
            } label: {
                Label("Edit", systemImage: "pencil")
            }
            .tint(.blue)
        }
    }
}

// MARK: - Add Custom Subject View

private struct AddCustomSubjectView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var selectedIcon = "book.fill"
    @State private var selectedColor = "blue"

    private let availableIcons = [
        "book.fill", "pencil", "paintbrush.fill", "music.note",
        "sportscourt.fill", "figure.dance", "theatermasks.fill",
        "globe", "leaf.fill", "atom", "graduationcap.fill",
        "trophy.fill", "star.fill", "heart.fill", "flame.fill"
    ]

    private let availableColors = [
        "blue", "purple", "red", "green", "orange",
        "yellow", "cyan", "mint", "pink", "brown",
        "gray", "indigo", "teal"
    ]

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Subject Name", text: $name)
                } header: {
                    Text("Name")
                }

                Section {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 60))], spacing: 16) {
                        ForEach(availableIcons, id: \.self) { icon in
                            Button {
                                selectedIcon = icon
                            } label: {
                                VStack(spacing: 8) {
                                    Image(systemName: icon)
                                        .font(.title2)
                                        .foregroundStyle(selectedIcon == icon ? .primary : .secondary)
                                        .frame(width: 44, height: 44)
                                        .background(
                                            RoundedRectangle(cornerRadius: 8)
                                                .fill(selectedIcon == icon ? Color.accentColor.opacity(0.2) : Color.clear)
                                        )
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 8)
                                                .stroke(selectedIcon == icon ? Color.accentColor : Color.gray.opacity(0.3), lineWidth: 2)
                                        )
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.vertical, 8)
                } header: {
                    Text("Icon")
                }

                Section {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 60))], spacing: 16) {
                        ForEach(availableColors, id: \.self) { colorName in
                            Button {
                                selectedColor = colorName
                            } label: {
                                Circle()
                                    .fill(color(for: colorName))
                                    .frame(width: 44, height: 44)
                                    .overlay(
                                        Circle()
                                            .stroke(selectedColor == colorName ? Color.primary : Color.clear, lineWidth: 3)
                                    )
                                    .overlay(
                                        Circle()
                                            .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                                    )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.vertical, 8)
                } header: {
                    Text("Color")
                }

                Section {
                    // Preview
                    HStack(spacing: 12) {
                        Image(systemName: selectedIcon)
                            .font(.title)
                            .foregroundStyle(color(for: selectedColor))
                            .frame(width: 40)

                        Text(name.isEmpty ? "Subject Name" : name)
                            .font(.headline)
                            .foregroundStyle(name.isEmpty ? .secondary : .primary)

                        Spacer()
                    }
                    .padding(.vertical, 8)
                } header: {
                    Text("Preview")
                }
            }
            .navigationTitle("New Subject")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        addSubject()
                    }
                    .disabled(name.isEmpty)
                }
            }
        }
    }

    private func color(for colorName: String) -> Color {
        switch colorName {
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
        case "gray": return .gray
        case "indigo": return .indigo
        case "teal": return .teal
        default: return .blue
        }
    }

    private func addSubject() {
        // Get max sort order
        let descriptor = FetchDescriptor<SubjectEntity>(
            sortBy: [SortDescriptor(\.sortOrder, order: .reverse)]
        )
        let maxSortOrder = (try? modelContext.fetch(descriptor).first?.sortOrder) ?? 0

        let newSubject = SubjectEntity(
            localizationKey: name,  // For custom subjects, store actual name
            iconName: selectedIcon,
            colorName: selectedColor,
            sortOrder: maxSortOrder + 1,
            isActive: true,
            isCustom: true
        )

        modelContext.insert(newSubject)
        try? modelContext.save()

        dismiss()
    }
}

// MARK: - Edit Subject View

private struct EditSubjectView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @Bindable var subject: SubjectEntity

    @State private var name: String = ""
    @State private var selectedIcon: String = ""
    @State private var selectedColor: String = ""

    private let availableIcons = [
        "book.fill", "pencil", "paintbrush.fill", "music.note",
        "sportscourt.fill", "figure.dance", "theatermasks.fill",
        "globe", "leaf.fill", "atom", "graduationcap.fill",
        "trophy.fill", "star.fill", "heart.fill", "flame.fill"
    ]

    private let availableColors = [
        "blue", "purple", "red", "green", "orange",
        "yellow", "cyan", "mint", "pink", "brown",
        "gray", "indigo", "teal"
    ]

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    if subject.isCustom {
                        TextField("Subject Name", text: $name)
                    } else {
                        HStack {
                            Text("Name")
                                .foregroundStyle(.secondary)
                            Spacer()
                            Text(subject.displayName)
                        }

                        Text("Default subjects cannot be renamed")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                } header: {
                    Text("Name")
                }

                Section {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 60))], spacing: 16) {
                        ForEach(availableIcons, id: \.self) { icon in
                            Button {
                                selectedIcon = icon
                            } label: {
                                Image(systemName: icon)
                                    .font(.title2)
                                    .foregroundStyle(selectedIcon == icon ? .primary : .secondary)
                                    .frame(width: 44, height: 44)
                                    .background(
                                        RoundedRectangle(cornerRadius: 8)
                                            .fill(selectedIcon == icon ? Color.accentColor.opacity(0.2) : Color.clear)
                                    )
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 8)
                                            .stroke(selectedIcon == icon ? Color.accentColor : Color.gray.opacity(0.3), lineWidth: 2)
                                    )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.vertical, 8)
                } header: {
                    Text("Icon")
                }

                Section {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 60))], spacing: 16) {
                        ForEach(availableColors, id: \.self) { colorName in
                            Button {
                                selectedColor = colorName
                            } label: {
                                Circle()
                                    .fill(color(for: colorName))
                                    .frame(width: 44, height: 44)
                                    .overlay(
                                        Circle()
                                            .stroke(selectedColor == colorName ? Color.primary : Color.clear, lineWidth: 3)
                                    )
                                    .overlay(
                                        Circle()
                                            .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                                    )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.vertical, 8)
                } header: {
                    Text("Color")
                }

                Section {
                    // Preview
                    HStack(spacing: 12) {
                        Image(systemName: selectedIcon)
                            .font(.title)
                            .foregroundStyle(color(for: selectedColor))
                            .frame(width: 40)

                        Text(name.isEmpty ? subject.displayName : name)
                            .font(.headline)

                        Spacer()
                    }
                    .padding(.vertical, 8)
                } header: {
                    Text("Preview")
                }
            }
            .navigationTitle("Edit Subject")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        saveChanges()
                    }
                    .disabled(subject.isCustom && name.isEmpty)
                }
            }
            .onAppear {
                // Initialize state
                name = subject.isCustom ? subject.localizationKey : ""
                selectedIcon = subject.iconName
                selectedColor = subject.colorName
            }
        }
    }

    private func color(for colorName: String) -> Color {
        switch colorName {
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
        case "gray": return .gray
        case "indigo": return .indigo
        case "teal": return .teal
        default: return .blue
        }
    }

    private func saveChanges() {
        if subject.isCustom && !name.isEmpty {
            subject.localizationKey = name
        }
        subject.iconName = selectedIcon
        subject.colorName = selectedColor

        try? modelContext.save()
        dismiss()
    }
}

// MARK: - Preview

#Preview {
    let config = ModelConfiguration(isStoredInMemoryOnly: true)
    // swiftlint:disable:next force_try
    let container = try! ModelContainer(for: SubjectEntity.self, configurations: config)
    let context = container.mainContext

    // Add some sample subjects
    let math = SubjectEntity(localizationKey: "subject.matematica", iconName: "function", colorName: "blue", sortOrder: 0)
    let physics = SubjectEntity(localizationKey: "subject.fisica", iconName: "atom", colorName: "purple", sortOrder: 1)
    let custom = SubjectEntity(localizationKey: "Music", iconName: "music.note", colorName: "pink", sortOrder: 2, isCustom: true)

    context.insert(math)
    context.insert(physics)
    context.insert(custom)

    return SubjectSettingsView()
        .modelContainer(container)
}
