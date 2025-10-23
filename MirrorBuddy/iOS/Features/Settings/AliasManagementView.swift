//
//  AliasManagementView.swift
//  MirrorBuddy
//
//  Task 115.3: UI for managing user-defined material aliases
//  Allows users to create, edit, delete, and search aliases
//

import SwiftData
import SwiftUI

struct AliasManagementView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @Query(sort: \MaterialAlias.usageCount, order: .reverse) private var allAliases: [MaterialAlias]
    @Query private var materials: [Material]

    @State private var searchText = ""
    @State private var showingAddSheet = false
    @State private var showingEditSheet = false
    @State private var selectedAlias: MaterialAlias?
    @State private var sortBy: AliasSortCriteria = .usageCount
    @State private var showActiveOnly = true
    @State private var showingDeleteConfirmation = false
    @State private var aliasToDelete: MaterialAlias?

    private var aliasService: MaterialAliasService {
        MaterialAliasService(modelContext: modelContext)
    }

    // Filtered aliases based on search
    private var filteredAliases: [MaterialAlias] {
        let filtered = showActiveOnly ? allAliases.filter { $0.isActive } : allAliases

        if searchText.isEmpty {
            return filtered
        }

        return filtered.filter { alias in
            alias.alias.localizedCaseInsensitiveContains(searchText) ||
                alias.materialTitle.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search bar
                searchBar

                // Sort and filter controls
                controlBar

                // Alias list
                if filteredAliases.isEmpty {
                    emptyState
                } else {
                    aliasList
                }
            }
            .navigationTitle("Material Aliases")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingAddSheet = true }) {
                        Image(systemName: "plus.circle.fill")
                            .font(.title2)
                    }
                }
            }
            .sheet(isPresented: $showingAddSheet) {
                AddAliasView(aliasService: aliasService, materials: materials)
            }
            .sheet(item: $selectedAlias) { alias in
                EditAliasView(alias: alias, aliasService: aliasService, materials: materials)
            }
            .alert("Delete Alias", isPresented: $showingDeleteConfirmation) {
                Button("Cancel", role: .cancel) { }
                Button("Delete", role: .destructive) {
                    if let alias = aliasToDelete {
                        deleteAlias(alias)
                    }
                }
            } message: {
                if let alias = aliasToDelete {
                    Text("Are you sure you want to delete the alias '\(alias.alias)'? This action cannot be undone.")
                }
            }
        }
    }

    // MARK: - View Components

    private var searchBar: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.secondary)
            TextField("Search aliases...", text: $searchText)
                .textFieldStyle(.plain)
            if !searchText.isEmpty {
                Button(action: { searchText = "" }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
    }

    private var controlBar: some View {
        HStack {
            // Sort picker
            Menu {
                Button {
                    sortBy = .usageCount
                } label: {
                    Label("Usage Count", systemImage: sortBy == .usageCount ? "checkmark" : "")
                }

                Button {
                    sortBy = .createdAt
                } label: {
                    Label("Creation Date", systemImage: sortBy == .createdAt ? "checkmark" : "")
                }

                Button {
                    sortBy = .alphabetical
                } label: {
                    Label("Alphabetical", systemImage: sortBy == .alphabetical ? "checkmark" : "")
                }

                Button {
                    sortBy = .lastUsed
                } label: {
                    Label("Last Used", systemImage: sortBy == .lastUsed ? "checkmark" : "")
                }
            } label: {
                Label("Sort: \(sortBy.displayName)", systemImage: "arrow.up.arrow.down")
                    .font(.subheadline)
            }

            Spacer()

            // Active filter toggle
            Toggle("Active Only", isOn: $showActiveOnly)
                .font(.subheadline)
                .toggleStyle(.switch)
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(Color(.systemBackground))
    }

    private var aliasList: some View {
        List {
            ForEach(filteredAliases) { alias in
                AliasRow(alias: alias)
                    .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                        Button(role: .destructive) {
                            aliasToDelete = alias
                            showingDeleteConfirmation = true
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }

                        Button {
                            selectedAlias = alias
                            showingEditSheet = true
                        } label: {
                            Label("Edit", systemImage: "pencil")
                        }
                        .tint(.blue)
                    }
                    .onTapGesture {
                        selectedAlias = alias
                        showingEditSheet = true
                    }
            }

            // Statistics footer
            Section {
                statisticsView
            }
        }
        .listStyle(.insetGrouped)
    }

    private var emptyState: some View {
        VStack(spacing: 20) {
            Image(systemName: "text.badge.plus")
                .font(.system(size: 60))
                .foregroundColor(.secondary)

            Text("No Aliases Yet")
                .font(.title2)
                .fontWeight(.semibold)

            Text("Create shortcuts for your materials to access them quickly with voice commands.")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)

            Button(action: { showingAddSheet = true }) {
                Label("Create Alias", systemImage: "plus.circle.fill")
                    .font(.headline)
                    .padding()
                    .background(Color.accentColor)
                    .foregroundColor(.white)
                    .cornerRadius(12)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var statisticsView: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Statistics")
                .font(.headline)

            HStack {
                StatLabel(title: "Total Aliases", value: "\(allAliases.count)")
                Spacer()
                StatLabel(title: "Active", value: "\(allAliases.filter { $0.isActive }.count)")
            }

            if let stats = try? aliasService.getAliasStatistics() {
                HStack {
                    StatLabel(title: "Total Uses", value: "\(stats.totalUsageCount)")
                    Spacer()
                    StatLabel(title: "Avg Uses", value: String(format: "%.1f", stats.averageUsageCount))
                }

                if let mostUsed = stats.mostUsedAlias {
                    Text("Most used: '\(mostUsed.alias)' (\(mostUsed.usageCount) uses)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(.vertical, 8)
    }

    // MARK: - Actions

    private func deleteAlias(_ alias: MaterialAlias) {
        do {
            try aliasService.deleteAlias(aliasID: alias.id)
        } catch {
            print("Error deleting alias: \(error.localizedDescription)")
        }
    }
}

// MARK: - Alias Row

struct AliasRow: View {
    let alias: MaterialAlias

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(alias.alias)
                    .font(.headline)

                Spacer()

                if alias.usageCount > 0 {
                    HStack(spacing: 4) {
                        Image(systemName: "chart.bar.fill")
                            .font(.caption)
                        Text("\(alias.usageCount)")
                            .font(.caption)
                    }
                    .foregroundColor(.secondary)
                }
            }

            Text(alias.materialTitle)
                .font(.subheadline)
                .foregroundColor(.secondary)

            if let notes = alias.notes, !notes.isEmpty {
                Text(notes)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }

            HStack {
                Label(alias.createdAt.formatted(date: .abbreviated, time: .omitted), systemImage: "calendar")
                    .font(.caption2)
                    .foregroundColor(.secondary)

                Spacer()

                if let lastUsed = alias.lastUsedAt {
                    Label("Last used: \(lastUsed.formatted(.relative(presentation: .named)))", systemImage: "clock")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(.vertical, 4)
        .opacity(alias.isActive ? 1.0 : 0.5)
    }
}

// MARK: - Add Alias View

struct AddAliasView: View {
    @Environment(\.dismiss) private var dismiss

    let aliasService: MaterialAliasService
    let materials: [Material]

    @State private var aliasName = ""
    @State private var selectedMaterial: Material?
    @State private var notes = ""
    @State private var searchText = ""
    @State private var errorMessage: String?

    private var filteredMaterials: [Material] {
        if searchText.isEmpty {
            return materials
        }
        return materials.filter { $0.title.localizedCaseInsensitiveContains(searchText) }
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Alias Name") {
                    TextField("e.g., 'bio', 'math notes', 'history ch3'", text: $aliasName)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                }

                Section("Target Material") {
                    TextField("Search materials...", text: $searchText)
                        .textInputAutocapitalization(.never)

                    if let selected = selectedMaterial {
                        HStack {
                            VStack(alignment: .leading) {
                                Text(selected.title)
                                    .font(.headline)
                                if let subject = selected.subject {
                                    Text(subject.displayName)
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                            Spacer()
                            Button("Change") {
                                selectedMaterial = nil
                            }
                            .font(.caption)
                        }
                    } else {
                        ForEach(filteredMaterials.prefix(10)) { material in
                            Button {
                                selectedMaterial = material
                            } label: {
                                VStack(alignment: .leading) {
                                    Text(material.title)
                                    if let subject = material.subject {
                                        Text(subject.displayName)
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                }
                            }
                        }
                    }
                }

                Section("Notes (Optional)") {
                    TextEditor(text: $notes)
                        .frame(height: 100)
                }

                if let error = errorMessage {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("New Alias")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        saveAlias()
                    }
                    .disabled(aliasName.isEmpty || selectedMaterial == nil)
                }
            }
        }
    }

    private func saveAlias() {
        guard let material = selectedMaterial else { return }

        do {
            _ = try aliasService.createAlias(
                alias: aliasName,
                materialID: material.id,
                materialTitle: material.title,
                notes: notes.isEmpty ? nil : notes
            )
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Edit Alias View

struct EditAliasView: View {
    @Environment(\.dismiss) private var dismiss

    let alias: MaterialAlias
    let aliasService: MaterialAliasService
    let materials: [Material]

    @State private var aliasName: String
    @State private var notes: String
    @State private var errorMessage: String?

    init(alias: MaterialAlias, aliasService: MaterialAliasService, materials: [Material]) {
        self.alias = alias
        self.aliasService = aliasService
        self.materials = materials
        _aliasName = State(initialValue: alias.alias)
        _notes = State(initialValue: alias.notes ?? "")
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Alias Name") {
                    TextField("Alias", text: $aliasName)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                }

                Section("Target Material") {
                    Text(alias.materialTitle)
                        .foregroundColor(.secondary)
                }

                Section("Notes") {
                    TextEditor(text: $notes)
                        .frame(height: 100)
                }

                Section("Usage Statistics") {
                    HStack {
                        Text("Usage Count")
                        Spacer()
                        Text("\(alias.usageCount)")
                            .foregroundColor(.secondary)
                    }

                    if let lastUsed = alias.lastUsedAt {
                        HStack {
                            Text("Last Used")
                            Spacer()
                            Text(lastUsed.formatted(.relative(presentation: .named)))
                                .foregroundColor(.secondary)
                        }
                    }

                    HStack {
                        Text("Created")
                        Spacer()
                        Text(alias.createdAt.formatted(date: .abbreviated, time: .shortened))
                            .foregroundColor(.secondary)
                    }
                }

                if let error = errorMessage {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Edit Alias")
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
                    .disabled(aliasName.isEmpty)
                }
            }
        }
    }

    private func saveChanges() {
        do {
            try aliasService.updateAlias(
                aliasID: alias.id,
                newAlias: aliasName != alias.alias ? aliasName : nil,
                notes: notes.isEmpty ? nil : notes
            )
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - Helper Views

struct StatLabel: View {
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
            Text(value)
                .font(.headline)
        }
    }
}

// MARK: - Extensions

extension AliasSortCriteria {
    var displayName: String {
        switch self {
        case .usageCount: return "Usage"
        case .createdAt: return "Date"
        case .alphabetical: return "A-Z"
        case .lastUsed: return "Recent"
        }
    }
}

// MARK: - Preview

#Preview {
    AliasManagementView()
        .modelContainer(for: [MaterialAlias.self, Material.self])
}
