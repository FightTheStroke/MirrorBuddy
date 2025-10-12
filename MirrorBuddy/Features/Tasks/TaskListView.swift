import SwiftUI
import SwiftData
import os.log

/// Task list view for assignments and due dates (Task 44)
struct TaskListView: View {
    @Environment(\.modelContext) private var modelContext

    @Query(sort: \Task.dueDate) private var allTasks: [Task]

    @State private var viewModel = TaskListViewModel()
    @State private var searchText = ""
    @State private var showFilters = false
    @State private var showAddTask = false

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "TaskList")

    var body: some View {
        NavigationStack {
            ZStack {
                if filteredTasks.isEmpty {
                    emptyState
                } else {
                    taskSections
                }
            }
            .navigationTitle("Tasks")
            .searchable(text: $searchText, prompt: "Search tasks...")
            .toolbar {
                toolbarContent
            }
            .sheet(isPresented: $showFilters) {
                TaskFiltersSheet(
                    selectedSubject: $viewModel.selectedSubject,
                    showCompletedTasks: $viewModel.showCompletedTasks,
                    sortOption: $viewModel.sortOption
                )
            }
            .sheet(isPresented: $showAddTask) {
                AddTaskView()
            }
        }
    }

    // MARK: - Task Sections (Subtasks 44.1, 44.2)

    private var taskSections: some View {
        ScrollView {
            LazyVStack(spacing: 24, pinnedViews: [.sectionHeaders]) {
                // Overdue tasks with encouraging messaging (Subtask 44.2)
                if !overdueTasks.isEmpty {
                    Section {
                        ForEach(overdueTasks) { task in
                            NavigationLink {
                                TaskDetailView(task: task)
                            } label: {
                                TaskRow(task: task, onToggle: { toggleTask(task) })
                            }
                            .buttonStyle(.plain)
                        }
                    } header: {
                        SectionHeader(
                            title: "Overdue",
                            subtitle: "Let's catch up! 💪",
                            color: .red,
                            count: overdueTasks.count
                        )
                    }
                }

                // Today's tasks (Subtask 44.2)
                if !todayTasks.isEmpty {
                    Section {
                        ForEach(todayTasks) { task in
                            NavigationLink {
                                TaskDetailView(task: task)
                            } label: {
                                TaskRow(task: task, onToggle: { toggleTask(task) })
                            }
                            .buttonStyle(.plain)
                        }
                    } header: {
                        SectionHeader(
                            title: "Today",
                            subtitle: "Focus on these",
                            color: .orange,
                            count: todayTasks.count
                        )
                    }
                }

                // Upcoming week (Subtask 44.2)
                if !upcomingTasks.isEmpty {
                    Section {
                        ForEach(upcomingTasks) { task in
                            NavigationLink {
                                TaskDetailView(task: task)
                            } label: {
                                TaskRow(task: task, onToggle: { toggleTask(task) })
                            }
                            .buttonStyle(.plain)
                        }
                    } header: {
                        SectionHeader(
                            title: "This Week",
                            subtitle: "Coming up soon",
                            color: .blue,
                            count: upcomingTasks.count
                        )
                    }
                }

                // Later tasks
                if !laterTasks.isEmpty {
                    Section {
                        ForEach(laterTasks) { task in
                            NavigationLink {
                                TaskDetailView(task: task)
                            } label: {
                                TaskRow(task: task, onToggle: { toggleTask(task) })
                            }
                            .buttonStyle(.plain)
                        }
                    } header: {
                        SectionHeader(
                            title: "Later",
                            subtitle: "Plan ahead",
                            color: .gray,
                            count: laterTasks.count
                        )
                    }
                }

                // Completed tasks (optional)
                if viewModel.showCompletedTasks && !completedTasks.isEmpty {
                    Section {
                        ForEach(completedTasks) { task in
                            NavigationLink {
                                TaskDetailView(task: task)
                            } label: {
                                TaskRow(task: task, onToggle: { toggleTask(task) })
                            }
                            .buttonStyle(.plain)
                        }
                    } header: {
                        SectionHeader(
                            title: "Completed",
                            subtitle: "Great work!",
                            color: .green,
                            count: completedTasks.count
                        )
                    }
                }
            }
            .padding(.horizontal)
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 20) {
            Image(systemName: "checklist")
                .font(.system(size: 64))
                .foregroundStyle(.secondary)

            Text("No Tasks")
                .font(.title2.bold())

            Text(searchText.isEmpty ? "Add your first task to get started" : "No tasks match your search")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            if searchText.isEmpty {
                Button {
                    showAddTask = true
                } label: {
                    Label("Add Task", systemImage: "plus")
                        .frame(height: 44)
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding()
    }

    // MARK: - Toolbar (Subtask 44.3)

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            Menu {
                Button {
                    showFilters = true
                } label: {
                    Label("Filters & Sort", systemImage: "line.3.horizontal.decrease.circle")
                }

                Divider()

                Button {
                    viewModel.showCompletedTasks.toggle()
                } label: {
                    Label(
                        viewModel.showCompletedTasks ? "Hide Completed" : "Show Completed",
                        systemImage: viewModel.showCompletedTasks ? "eye.slash" : "eye"
                    )
                }
            } label: {
                Image(systemName: "ellipsis.circle")
                    .font(.title3)
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel("Options menu")
        }

        ToolbarItem(placement: .topBarTrailing) {
            Button {
                showAddTask = true
            } label: {
                Image(systemName: "plus")
                    .font(.title3)
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel("Add task")
        }
    }

    // MARK: - Task Filtering & Sorting (Subtask 44.3)

    private var filteredTasks: [Task] {
        var tasks = allTasks

        // Filter by search
        if !searchText.isEmpty {
            tasks = tasks.filter { task in
                task.title.localizedCaseInsensitiveContains(searchText) ||
                (task.taskDescription?.localizedCaseInsensitiveContains(searchText) ?? false)
            }
        }

        // Filter by subject
        if let selectedSubject = viewModel.selectedSubject {
            tasks = tasks.filter { task in
                task.subject?.displayName == selectedSubject.rawValue
            }
        }

        // Filter completed
        if !viewModel.showCompletedTasks {
            tasks = tasks.filter { !$0.isCompleted }
        }

        // Sort
        return viewModel.sort(tasks: tasks)
    }

    // Task sections by time (Subtask 44.2)

    private var overdueTasks: [Task] {
        filteredTasks.filter { $0.isOverdue }
    }

    private var todayTasks: [Task] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let tomorrow = calendar.date(byAdding: .day, value: 1, to: today)!

        return filteredTasks.filter { task in
            guard let dueDate = task.dueDate, !task.isCompleted else { return false }
            return dueDate >= today && dueDate < tomorrow
        }
    }

    private var upcomingTasks: [Task] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let tomorrow = calendar.date(byAdding: .day, value: 1, to: today)!
        let nextWeek = calendar.date(byAdding: .day, value: 7, to: today)!

        return filteredTasks.filter { task in
            guard let dueDate = task.dueDate, !task.isCompleted else { return false }
            return dueDate >= tomorrow && dueDate < nextWeek
        }
    }

    private var laterTasks: [Task] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let nextWeek = calendar.date(byAdding: .day, value: 7, to: today)!

        return filteredTasks.filter { task in
            guard let dueDate = task.dueDate, !task.isCompleted else { return false }
            return dueDate >= nextWeek
        }
    }

    private var completedTasks: [Task] {
        filteredTasks.filter { $0.isCompleted }
    }

    // MARK: - Actions

    private func toggleTask(_ task: Task) {
        withAnimation {
            if task.isCompleted {
                task.uncomplete()
            } else {
                task.complete()
            }

            do {
                try modelContext.save()
                logger.info("Task \(task.title) toggled to: \(task.isCompleted ? "completed" : "incomplete")")
            } catch {
                logger.error("Failed to save task: \(error.localizedDescription)")
            }
        }
    }
}

// MARK: - Task Row (Subtask 44.1, 44.2)

struct TaskRow: View {
    let task: Task
    let onToggle: () -> Void

    var body: some View {
        HStack(spacing: 16) {
            // Large checkbox (44×44pt) (Subtask 44.1)
            Button {
                onToggle()
            } label: {
                Image(systemName: task.isCompleted ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 28))
                    .foregroundStyle(task.isCompleted ? .green : subjectColor)
                    .frame(width: 44, height: 44)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(task.isCompleted ? "Mark as incomplete" : "Mark as complete")

            VStack(alignment: .leading, spacing: 6) {
                // Title
                Text(task.title)
                    .font(.body)
                    .fontWeight(task.isCompleted ? .regular : .medium)
                    .strikethrough(task.isCompleted)
                    .foregroundStyle(task.isCompleted ? .secondary : .primary)

                // Metadata
                HStack(spacing: 12) {
                    // Subject badge with color-coding (Subtask 44.2)
                    if let subject = task.subject {
                        HStack(spacing: 4) {
                            Image(systemName: subject.iconName)
                                .font(.caption2)
                            Text(subject.displayName)
                                .font(.caption2.weight(.medium))
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(subjectColor.opacity(0.2))
                        .foregroundStyle(subjectColor)
                        .cornerRadius(8)
                    }

                    // Due date
                    if let dueDate = task.dueDate {
                        HStack(spacing: 4) {
                            Image(systemName: "calendar")
                                .font(.caption2)
                            Text(dueDate, style: .date)
                                .font(.caption2)
                        }
                        .foregroundStyle(dueDateColor)
                    }

                    // Priority indicator
                    if task.priority >= 4 {
                        Image(systemName: "exclamationmark.circle.fill")
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                }
            }

            Spacer()

            // Chevron for navigation
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 16)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }

    private var subjectColor: Color {
        task.subject?.color ?? .gray
    }

    private var dueDateColor: Color {
        if task.isOverdue {
            return .red
        } else if task.isDueSoon {
            return .orange
        } else {
            return .secondary
        }
    }
}

// MARK: - Section Header (Subtask 44.2)

struct SectionHeader: View {
    let title: String
    let subtitle: String
    let color: Color
    let count: Int

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Text(title)
                        .font(.title3.bold())
                        .foregroundStyle(color)

                    Text("\(count)")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(color)
                        .cornerRadius(8)
                }

                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(.ultraThinMaterial)
    }
}

// MARK: - Filters Sheet (Subtask 44.3)

struct TaskFiltersSheet: View {
    @Binding var selectedSubject: Subject?
    @Binding var showCompletedTasks: Bool
    @Binding var sortOption: TaskSortOption

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

                Section("Display Options") {
                    Toggle("Show Completed Tasks", isOn: $showCompletedTasks)
                }

                Section("Sort By") {
                    Picker("Sort", selection: $sortOption) {
                        ForEach(TaskSortOption.allCases) { option in
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
                        sortOption = .dueDate
                        showCompletedTasks = false
                    }
                }
            }
        }
    }
}

// MARK: - Add Task View (Placeholder)

struct AddTaskView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext

    @State private var title = ""
    @State private var description = ""
    @State private var dueDate = Date()
    @State private var priority = 3

    var body: some View {
        NavigationStack {
            Form {
                Section("Details") {
                    TextField("Task title", text: $title)
                    TextField("Description (optional)", text: $description, axis: .vertical)
                        .lineLimit(3...6)
                }

                Section("Due Date") {
                    DatePicker("Due date", selection: $dueDate, displayedComponents: [.date, .hourAndMinute])
                }

                Section("Priority") {
                    Picker("Priority", selection: $priority) {
                        Text("Low").tag(1)
                        Text("Medium").tag(3)
                        Text("High").tag(5)
                    }
                    .pickerStyle(.segmented)
                }
            }
            .navigationTitle("New Task")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        let task = Task(
                            title: title,
                            description: description.isEmpty ? nil : description,
                            dueDate: dueDate,
                            priority: priority
                        )
                        modelContext.insert(task)
                        try? modelContext.save()
                        dismiss()
                    }
                    .disabled(title.isEmpty)
                }
            }
        }
    }
}

// MARK: - View Model

@Observable
final class TaskListViewModel {
    var selectedSubject: Subject?
    var showCompletedTasks = false
    var sortOption: TaskSortOption = .dueDate

    func sort(tasks: [Task]) -> [Task] {
        switch sortOption {
        case .dueDate:
            return tasks.sorted { lhs, rhs in
                guard let lhsDate = lhs.dueDate else { return false }
                guard let rhsDate = rhs.dueDate else { return true }
                return lhsDate < rhsDate
            }
        case .priority:
            return tasks.sorted { $0.priority > $1.priority }
        case .title:
            return tasks.sorted { $0.title.localizedStandardCompare($1.title) == .orderedAscending }
        case .createdDate:
            return tasks.sorted { $0.createdAt > $1.createdAt }
        }
    }
}

// MARK: - Sort Options (Subtask 44.3)

enum TaskSortOption: String, CaseIterable, Identifiable {
    case dueDate = "due_date"
    case priority = "priority"
    case title = "title"
    case createdDate = "created_date"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .dueDate: return "Due Date"
        case .priority: return "Priority"
        case .title: return "Title"
        case .createdDate: return "Created Date"
        }
    }
}

// MARK: - Preview

#Preview {
    let config = ModelConfiguration(isStoredInMemoryOnly: true)
    let container = try! ModelContainer(for: Task.self, Material.self, SubjectEntity.self, configurations: config)

    let context = container.mainContext

    // Create subjects
    let math = SubjectEntity(localizationKey: "Matematica", iconName: "function", colorName: "blue", sortOrder: 1)
    let physics = SubjectEntity(localizationKey: "Fisica", iconName: "atom", colorName: "purple", sortOrder: 2)

    // Create tasks
    let task1 = Task(title: "Complete calculus homework", subject: math, dueDate: Date(), priority: 5)
    let task2 = Task(title: "Study for physics exam", subject: physics, dueDate: Calendar.current.date(byAdding: .day, value: 2, to: Date()), priority: 4)
    let task3 = Task(title: "Read chapter 5", subject: math, dueDate: Calendar.current.date(byAdding: .day, value: -1, to: Date()), priority: 3)
    task3.complete()

    context.insert(task1)
    context.insert(task2)
    context.insert(task3)

    return TaskListView()
        .modelContainer(container)
}
