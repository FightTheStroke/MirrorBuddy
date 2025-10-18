import SwiftData
import SwiftUI

/// Main dashboard UI organized by subject (Task 26)
struct SubjectDashboardView: View {
    @Environment(\.modelContext) private var modelContext

    @Query(sort: \Material.createdAt, order: .reverse) private var allMaterials: [Material]

    @State private var viewModel = DashboardViewModel()
    @State private var selectedSubject: Subject?
    @State private var searchText = ""
    @State private var showFilters = false

    var body: some View {
        NavigationStack {
            ZStack {
                if filteredMaterials.isEmpty {
                    emptyState
                } else {
                    materialsList
                }
            }
            .navigationTitle("My Materials")
            .searchable(text: $searchText, prompt: "Search materials...")
            .toolbar {
                toolbarContent
            }
            .sheet(isPresented: $showFilters) {
                FiltersSheet(
                    selectedSubject: $selectedSubject,
                    sortOption: $viewModel.sortOption
                )
            }
        }
    }

    // MARK: - Materials List (Subtasks 26.1, 26.2)

    private var materialsList: some View {
        ScrollView {
            LazyVStack(spacing: 20, pinnedViews: [.sectionHeaders]) {
                if viewModel.groupBySubject {
                    // Grouped by subject
                    ForEach(groupedMaterials.keys.sorted(by: subjectOrder), id: \.self) { subject in
                        Section {
                            materialsGrid(for: groupedMaterials[subject] ?? [])
                        } header: {
                            SubjectHeader(subject: subject)
                        }
                    }
                } else {
                    // Single list
                    materialsGrid(for: filteredMaterials)
                }
            }
            .padding()
        }
    }

    // MARK: - Materials Grid (Subtask 26.3)

    private func materialsGrid(for materials: [Material]) -> some View {
        LazyVGrid(columns: gridColumns, spacing: 16) {
            ForEach(materials) { material in
                NavigationLink {
                    MaterialDetailView(material: material)
                } label: {
                    MaterialCard(material: material)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(material.title), \(material.subject?.displayName ?? "no subject")")
            }
        }
    }

    // MARK: - Grid Layout

    private var gridColumns: [GridItem] {
        [
            GridItem(.flexible(), spacing: 16),
            GridItem(.flexible(), spacing: 16)
        ]
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 20) {
            Image(systemName: "doc.text.magnifyingglass")
                .font(.system(size: 64))
                .foregroundStyle(.secondary)

            Text("No Materials")
                .font(.title2.bold())

            Text(searchText.isEmpty ? "Add your first study material to get started" : "No materials match your search")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            if searchText.isEmpty {
                Button {
                    // TODO: Add material action
                } label: {
                    Label("Add Material", systemImage: "plus")
                        .frame(height: 44) // Min touch target
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding()
    }

    // MARK: - Toolbar (Subtask 26.4)

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            Menu {
                Button {
                    viewModel.groupBySubject.toggle()
                } label: {
                    Label(
                        viewModel.groupBySubject ? "List View" : "Group by Subject",
                        systemImage: viewModel.groupBySubject ? "list.bullet" : "square.grid.2x2"
                    )
                }

                Button {
                    showFilters = true
                } label: {
                    Label("Filters & Sort", systemImage: "line.3.horizontal.decrease.circle")
                }
            } label: {
                Image(systemName: "ellipsis.circle")
                    .font(.title3)
                    .frame(width: 44, height: 44) // Min touch target
            }
            .accessibilityLabel("Options menu")
        }

        ToolbarItem(placement: .topBarTrailing) {
            Button {
                // TODO: Add material action
            } label: {
                Image(systemName: "plus")
                    .font(.title3)
                    .frame(width: 44, height: 44) // Min touch target
            }
            .accessibilityLabel("Add material")
        }
    }

    // MARK: - Filtering & Sorting (Subtask 26.4)

    private var filteredMaterials: [Material] {
        var materials = allMaterials

        // Filter by search
        if !searchText.isEmpty {
            materials = materials.filter { material in
                material.title.localizedCaseInsensitiveContains(searchText) ||
                (material.summary?.localizedCaseInsensitiveContains(searchText) ?? false)
            }
        }

        // Filter by subject
        if let selectedSubject = selectedSubject {
            materials = materials.filter { material in
                subjectFromEntity(material.subject) == selectedSubject
            }
        }

        // Sort
        return viewModel.sort(materials: materials)
    }

    private var groupedMaterials: [Subject: [Material]] {
        Dictionary(grouping: filteredMaterials) { material in
            subjectFromEntity(material.subject) ?? .other
        }
    }

    private func subjectOrder(_ lhs: Subject, _ rhs: Subject) -> Bool {
        lhs.rawValue < rhs.rawValue
    }

    private func subjectFromEntity(_ entity: SubjectEntity?) -> Subject? {
        guard let entity = entity else { return nil }
        return Subject(rawValue: entity.displayName) ?? .other
    }
}

// MARK: - Material Card (Subtask 26.3)

struct MaterialCard: View {
    let material: Material

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Thumbnail placeholder
            thumbnailView

            // Content
            VStack(alignment: .leading, spacing: 6) {
                Text(material.title)
                    .font(.headline)
                    .lineLimit(2)
                    .foregroundStyle(.primary)

                if let subject = material.subject {
                    SubjectBadge(subjectEntity: subject)
                }

                if let summary = material.summary {
                    Text(summary)
                        .font(.caption)
                        .lineLimit(2)
                        .foregroundStyle(.secondary)
                }

                HStack {
                    if material.mindMap != nil {
                        Image(systemName: "brain")
                            .font(.caption)
                            .foregroundStyle(.blue)
                    }

                    if let flashcards = material.flashcards, !flashcards.isEmpty {
                        Image(systemName: "rectangle.stack")
                            .font(.caption)
                            .foregroundStyle(.orange)
                    }

                    Spacer()

                    Text(material.createdAt, style: .relative)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.horizontal, 12)
            .padding(.bottom, 12)
        }
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.1), radius: 8, y: 4)
        // Min touch target ensured by card size
    }

    private var thumbnailView: some View {
        ZStack {
            Rectangle()
                .fill(subjectColor.opacity(0.2))

            if let subject = material.subject {
                Image(systemName: subject.iconName)
                    .font(.largeTitle)
                    .foregroundStyle(subjectColor)
            } else {
                Image(systemName: "doc.text")
                    .font(.largeTitle)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(height: 120)
        .cornerRadius(16, corners: [.topLeft, .topRight])
    }

    private var subjectColor: Color {
        material.subject?.color ?? .gray
    }
}

// MARK: - Subject Badge

struct SubjectBadge: View {
    let subjectEntity: SubjectEntity

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: subjectEntity.iconName)
                .font(.caption2)

            Text(subjectEntity.displayName)
                .font(.caption2.weight(.medium))
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(subjectEntity.color.opacity(0.2))
        .foregroundStyle(subjectEntity.color)
        .cornerRadius(8)
    }
}

// MARK: - Subject Header (Subtask 26.2)

struct SubjectHeader: View {
    let subject: Subject

    var body: some View {
        HStack {
            Image(systemName: subject.iconName)
                .font(.title3)

            Text(subject.rawValue)
                .font(.title3.bold())

            Spacer()
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(.ultraThinMaterial)
    }
}

// MARK: - Filters Sheet (Subtask 26.4)

struct FiltersSheet: View {
    @Binding var selectedSubject: Subject?
    @Binding var sortOption: SortOption

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Subject Filter") {
                    Picker("Subject", selection: $selectedSubject) {
                        Text("All Subjects")
                            .tag(Subject?.none)

                        ForEach(Subject.allCases) { subject in
                            HStack {
                                Image(systemName: subject.iconName)
                                Text(subject.rawValue)
                            }
                            .tag(Subject?.some(subject))
                        }
                    }
                    .pickerStyle(.inline)
                }

                Section("Sort By") {
                    Picker("Sort", selection: $sortOption) {
                        ForEach(SortOption.allCases) { option in
                            Text(option.displayName)
                                .tag(option)
                        }
                    }
                    .pickerStyle(.inline)
                }
            }
            .navigationTitle("Filters & Sort")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .cancellationAction) {
                    Button("Clear All") {
                        selectedSubject = nil
                        sortOption = .dateDescending
                    }
                }
            }
        }
    }
}

// MARK: - View Model

@Observable
@MainActor
final class DashboardViewModel {
    var groupBySubject = false
    var sortOption: SortOption = .dateDescending

    func sort(materials: [Material]) -> [Material] {
        switch sortOption {
        case .dateAscending:
            return materials.sorted { $0.createdAt < $1.createdAt }
        case .dateDescending:
            return materials.sorted { $0.createdAt > $1.createdAt }
        case .nameAscending:
            return materials.sorted { $0.title.localizedStandardCompare($1.title) == .orderedAscending }
        case .nameDescending:
            return materials.sorted { $0.title.localizedStandardCompare($1.title) == .orderedDescending }
        case .subject:
            return materials.sorted { lhs, rhs in
                let lhsSubject = lhs.subject?.displayName ?? "zzz"
                let rhsSubject = rhs.subject?.displayName ?? "zzz"
                return lhsSubject < rhsSubject
            }
        }
    }
}

// MARK: - Sort Options

enum SortOption: String, CaseIterable, Identifiable {
    case dateDescending = "date_desc"
    case dateAscending = "date_asc"
    case nameAscending = "name_asc"
    case nameDescending = "name_desc"
    case subject = "subject"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .dateDescending: return "Newest First"
        case .dateAscending: return "Oldest First"
        case .nameAscending: return "Name (A-Z)"
        case .nameDescending: return "Name (Z-A)"
        case .subject: return "Subject"
        }
    }
}

// MARK: - View Extensions

extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}

// MARK: - Preview

#Preview {
    let config = ModelConfiguration(isStoredInMemoryOnly: true)
    let container = try! ModelContainer(for: Material.self, configurations: config)

    // Add sample data
    let context = container.mainContext

    let mathSubject = SubjectEntity(
        localizationKey: "Matematica",
        iconName: "function",
        colorName: "blue",
        sortOrder: 1
    )
    let physicsSubject = SubjectEntity(
        localizationKey: "Fisica",
        iconName: "atom",
        colorName: "purple",
        sortOrder: 2
    )

    let material1 = Material(title: "Calculus Fundamentals", subject: mathSubject)
    material1.summary = "Introduction to limits, derivatives, and integrals"

    let material2 = Material(title: "Newton's Laws", subject: physicsSubject)
    material2.summary = "Classical mechanics and motion"

    let material3 = Material(title: "Algebra Review", subject: mathSubject)

    context.insert(material1)
    context.insert(material2)
    context.insert(material3)

    return SubjectDashboardView()
        .modelContainer(container)
}
