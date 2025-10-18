@preconcurrency import Combine
import SwiftData
import SwiftUI

/// List view for managing voice conversations
struct ConversationListView: View {
    @Environment(\.modelContext) private var modelContext
    @StateObject private var viewModel: ConversationListViewModel

    init() {
        _viewModel = StateObject(wrappedValue: ConversationListViewModel())
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search bar
                searchBar

                // Subject filter
                if !viewModel.subjects.isEmpty {
                    subjectFilterView
                }

                // Conversations list
                if viewModel.filteredConversations.isEmpty {
                    emptyStateView
                } else {
                    conversationsList
                }
            }
            .navigationTitle("Conversazioni")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    NavigationLink(destination: VoiceConversationView()) {
                        Image(systemName: "plus.circle.fill")
                            .font(.title2)
                    }
                }
            }
            .onAppear {
                viewModel.configure(modelContext: modelContext)
                viewModel.loadConversations()
            }
            .alert("Errore", isPresented: $viewModel.showError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(viewModel.errorMessage)
            }
        }
    }

    // MARK: - Search Bar

    private var searchBar: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(.secondary)

            TextField("Cerca conversazioni...", text: $viewModel.searchQuery)
                .textFieldStyle(.plain)

            if !viewModel.searchQuery.isEmpty {
                Button {
                    viewModel.searchQuery = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 10)
        .background(Color(.systemGray6))
        .cornerRadius(10)
        .padding()
    }

    // MARK: - Subject Filter

    private var subjectFilterView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                // "All" filter button
                FilterButton(
                    title: "Tutte",
                    isSelected: viewModel.selectedSubject == nil
                )                    { viewModel.selectedSubject = nil }

                // Subject filter buttons
                ForEach(viewModel.subjects) { subject in
                    FilterButton(
                        title: subject.displayName,
                        isSelected: viewModel.selectedSubject?.id == subject.id
                    )                        { viewModel.selectedSubject = subject }
                }
            }
            .padding(.horizontal)
        }
        .padding(.vertical, 8)
        .background(Color(.systemBackground))
    }

    // MARK: - Conversations List

    private var conversationsList: some View {
        List {
            ForEach(viewModel.filteredConversations) { conversation in
                NavigationLink(destination: VoiceConversationView(conversationID: conversation.id)) {
                    ConversationRowView(conversation: conversation)
                }
                .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                    Button(role: .destructive) {
                        viewModel.deleteConversation(conversation)
                    } label: {
                        Label("Elimina", systemImage: "trash")
                    }
                }
            }
        }
        .listStyle(.plain)
    }

    // MARK: - Empty State

    private var emptyStateView: some View {
        VStack(spacing: 20) {
            Image(systemName: "bubble.left.and.bubble.right")
                .font(.system(size: 60))
                .foregroundStyle(.secondary)

            Text("Nessuna Conversazione")
                .font(.title2)
                .fontWeight(.semibold)

            Text("Inizia una nuova conversazione con il Coach Vocale")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)

            NavigationLink(destination: VoiceConversationView()) {
                Label("Nuova Conversazione", systemImage: "plus.circle.fill")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(12)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Filter Button

private struct FilterButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .fontWeight(isSelected ? .semibold : .regular)
                .foregroundStyle(isSelected ? .white : .primary)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(isSelected ? Color.blue : Color(.systemGray5))
                .cornerRadius(20)
        }
    }
}

// MARK: - Conversation Row

private struct ConversationRowView: View {
    let conversation: VoiceConversation

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(conversation.title)
                    .font(.headline)
                    .lineLimit(2)

                Spacer()

                Text(formatDate(conversation.updatedAt))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: 8) {
                if let subject = conversation.subject {
                    HStack(spacing: 4) {
                        Image(systemName: subject.iconName)
                            .font(.caption)
                        Text(subject.displayName)
                            .font(.caption)
                    }
                    .foregroundStyle(.blue)
                }

                if let material = conversation.material {
                    HStack(spacing: 4) {
                        Image(systemName: "doc.text")
                            .font(.caption)
                        Text(material.title)
                            .font(.caption)
                    }
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                }

                Spacer()

                Text("\(conversation.messageCount) messaggi")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

// MARK: - ViewModel

@MainActor
final class ConversationListViewModel: ObservableObject {
    @Published var conversations: [VoiceConversation] = []
    @Published var subjects: [SubjectEntity] = []
    @Published var searchQuery = ""
    @Published var selectedSubject: SubjectEntity?
    @Published var showError = false
    @Published var errorMessage = ""

    private var conversationService: VoiceConversationService?
    private var subjectService: SubjectService?

    /// Filtered conversations based on search and subject filter
    var filteredConversations: [VoiceConversation] {
        var filtered = conversations

        // Filter by subject
        if let selectedSubject = selectedSubject {
            filtered = filtered.filter { $0.subjectID == selectedSubject.id }
        }

        // Filter by search query
        if !searchQuery.isEmpty {
            filtered = filtered.filter { conversation in
                conversation.title.localizedCaseInsensitiveContains(searchQuery)
            }
        }

        return filtered
    }

    func configure(modelContext: ModelContext) {
        if conversationService == nil {
            conversationService = VoiceConversationService(modelContext: modelContext)
            subjectService = SubjectService(modelContext: modelContext)
        }
    }

    func loadConversations() {
        guard let service = conversationService else {
            showError("Servizio conversazioni non disponibile")
            return
        }

        do {
            conversations = try service.fetchAllConversations()
            loadSubjects()
        } catch {
            showError("Errore caricamento conversazioni: \(error.localizedDescription)")
        }
    }

    private func loadSubjects() {
        guard let service = subjectService else { return }

        do {
            subjects = try service.getAllSubjects()
        } catch {
            // Non-critical error, don't show to user
            print("Error loading subjects: \(error)")
        }
    }

    func deleteConversation(_ conversation: VoiceConversation) {
        guard let service = conversationService else {
            showError("Servizio conversazioni non disponibile")
            return
        }

        do {
            try service.deleteConversation(conversation)
            // Remove from local array
            conversations.removeAll { $0.id == conversation.id }
        } catch {
            showError("Errore eliminazione conversazione: \(error.localizedDescription)")
        }
    }

    private func showError(_ message: String) {
        errorMessage = message
        showError = true
    }
}

#Preview {
    ConversationListView()
}
