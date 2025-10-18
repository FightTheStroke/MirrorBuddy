import os.log
import SwiftData
import SwiftUI

/// Task detail view with completion functionality (Task 45)
struct TaskDetailView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @Bindable var task: Task

    @State private var showEditSheet = false
    @State private var showDeleteConfirmation = false
    @State private var showXPAnimation = false
    @State private var showShareSheet = false
    @State private var earnedXP = 0

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "TaskDetail")
    private let hapticFeedback = UIImpactFeedbackGenerator(style: .medium)
    private let successHaptic = UINotificationFeedbackGenerator()

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header section (Subtask 45.1)
                headerSection

                // Description section (Subtask 45.1)
                if let description = task.taskDescription {
                    descriptionSection(description)
                }

                // Linked material (Subtask 45.1)
                if let material = task.material {
                    linkedMaterialSection(material)
                }

                // Due date countdown (Subtask 45.1)
                dueDateSection

                // Action buttons (Subtask 45.2)
                actionButtonsSection

                // Additional details
                detailsSection

                Spacer(minLength: 40)
            }
            .padding()
        }
        .navigationTitle("Task Details")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            toolbarContent
        }
        .sheet(isPresented: $showEditSheet) {
            EditTaskView(task: task)
        }
        .sheet(isPresented: $showShareSheet) {
            ShareSheet(items: [generateShareText()])
        }
        .confirmationDialog("Delete Task", isPresented: $showDeleteConfirmation) {
            Button("Delete", role: .destructive) {
                deleteTask()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Are you sure you want to delete this task? This action cannot be undone.")
        }
        .overlay {
            if showXPAnimation {
                xpRewardAnimation
            }
        }
    }

    // MARK: - Header Section (Subtask 45.1)

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 16) {
                // Completion checkbox
                Button {
                    toggleCompletion()
                } label: {
                    Image(systemName: task.isCompleted ? "checkmark.circle.fill" : "circle")
                        .font(.system(size: 44))
                        .foregroundStyle(task.isCompleted ? .green : subjectColor)
                }
                .accessibilityLabel(task.isCompleted ? "Mark as incomplete" : "Mark as complete")

                VStack(alignment: .leading, spacing: 6) {
                    Text(task.title)
                        .font(.title2.bold())
                        .strikethrough(task.isCompleted)

                    if let subject = task.subject {
                        HStack(spacing: 6) {
                            Image(systemName: subject.iconName)
                            Text(subject.displayName)
                        }
                        .font(.subheadline)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(subjectColor.opacity(0.2))
                        .foregroundStyle(subjectColor)
                        .cornerRadius(8)
                    }
                }
            }

            // Priority indicator
            if task.priority >= 4 {
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(.red)
                    Text(task.priority == 5 ? "High Priority" : "Medium-High Priority")
                        .font(.subheadline.weight(.medium))
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(.red.opacity(0.1))
                .cornerRadius(8)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }

    // MARK: - Description Section (Subtask 45.1)

    private func descriptionSection(_ description: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Description", systemImage: "doc.text")
                .font(.headline)

            Text(description)
                .font(.body)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }

    // MARK: - Linked Material Section (Subtask 45.1)

    private func linkedMaterialSection(_ material: Material) -> some View {
        NavigationLink {
            MaterialDetailView(material: material)
        } label: {
            VStack(alignment: .leading, spacing: 12) {
                Label("Linked Material", systemImage: "link")
                    .font(.headline)
                    .foregroundStyle(.primary)

                HStack(spacing: 12) {
                    if let subject = material.subject {
                        Image(systemName: subject.iconName)
                            .font(.title2)
                            .foregroundStyle(subject.color)
                            .frame(width: 50, height: 50)
                            .background(subject.color.opacity(0.2))
                            .cornerRadius(12)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text(material.title)
                            .font(.body.weight(.medium))
                            .foregroundStyle(.primary)

                        if let summary = material.summary {
                            Text(summary)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(2)
                        }
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
            .background(Color(.secondarySystemBackground))
            .cornerRadius(16)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Due Date Section (Subtask 45.1)

    private var dueDateSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Due Date", systemImage: "calendar")
                .font(.headline)

            if let dueDate = task.dueDate {
                VStack(spacing: 8) {
                    HStack {
                        Text(dueDate, style: .date)
                            .font(.body)
                        Text("at")
                            .foregroundStyle(.secondary)
                        Text(dueDate, style: .time)
                            .font(.body)

                        Spacer()
                    }

                    // Countdown (Subtask 45.1)
                    if !task.isCompleted {
                        HStack(spacing: 8) {
                            Image(systemName: countdownIcon)
                                .foregroundStyle(countdownColor)

                            Text(countdownText)
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(countdownColor)

                            Spacer()
                        }
                    }
                }
            } else {
                Text("No due date set")
                    .font(.body)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }

    // MARK: - Action Buttons (Subtask 45.2)

    private var actionButtonsSection: some View {
        VStack(spacing: 16) {
            // Start studying button (if material linked)
            if let material = task.material, !task.isCompleted {
                NavigationLink {
                    MaterialDetailView(material: material)
                } label: {
                    Label("Start Studying", systemImage: "play.circle.fill")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                }
                .buttonStyle(.borderedProminent)
                .accessibilityLabel("Start studying linked material")
            }

            // Complete task button (Subtask 45.2)
            if !task.isCompleted {
                Button {
                    completeTask()
                } label: {
                    Label("Complete Task", systemImage: "checkmark.circle.fill")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                }
                .buttonStyle(.borderedProminent)
                .tint(.green)
                .accessibilityLabel("Mark task as complete with XP reward")
            }
        }
    }

    // MARK: - Details Section

    private var detailsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Details", systemImage: "info.circle")
                .font(.headline)

            VStack(alignment: .leading, spacing: 8) {
                DetailRow(label: "Created", value: task.createdAt.formatted(date: .abbreviated, time: .shortened))

                if task.isCompleted, let completedAt = task.completedAt {
                    DetailRow(label: "Completed", value: completedAt.formatted(date: .abbreviated, time: .shortened))
                }

                DetailRow(label: "Source", value: task.source.displayName)

                if let eventID = task.googleCalendarEventID {
                    DetailRow(label: "Calendar Event", value: String(eventID.prefix(20)) + "...")
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }

    // MARK: - Toolbar (Subtask 45.3)

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            Menu {
                Button {
                    showEditSheet = true
                } label: {
                    Label("Edit", systemImage: "pencil")
                }

                Button {
                    showShareSheet = true
                } label: {
                    Label("Share", systemImage: "square.and.arrow.up")
                }

                Divider()

                Button(role: .destructive) {
                    showDeleteConfirmation = true
                } label: {
                    Label("Delete", systemImage: "trash")
                }
            } label: {
                Image(systemName: "ellipsis.circle")
                    .font(.title3)
            }
            .accessibilityLabel("More options")
        }
    }

    // MARK: - Completion Logic (Subtask 45.2)

    private func toggleCompletion() {
        hapticFeedback.impactOccurred()

        withAnimation {
            if task.isCompleted {
                task.uncomplete()
            } else {
                task.complete()
            }

            do {
                try modelContext.save()
                logger.info("Task toggled: \(task.title)")
            } catch {
                logger.error("Failed to save task: \(error.localizedDescription)")
            }
        }
    }

    private func completeTask() {
        // Haptic feedback (Subtask 45.2)
        successHaptic.notificationOccurred(.success)

        withAnimation {
            task.complete()

            // Calculate XP reward based on priority and overdue status (Subtask 45.2)
            earnedXP = calculateXP()

            do {
                try modelContext.save()
                logger.info("Task completed with \(earnedXP) XP: \(task.title)")

                // Show XP animation (Subtask 45.2)
                showXPAnimation = true

                // Auto-dismiss after animation
                DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
                    withAnimation {
                        showXPAnimation = false
                    }

                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                        dismiss()
                    }
                }
            } catch {
                logger.error("Failed to save task: \(error.localizedDescription)")
            }
        }
    }

    private func calculateXP() -> Int {
        var xp = 10 // Base XP

        // Priority bonus
        xp += (task.priority - 1) * 5

        // Overdue penalty (still get XP but less)
        if task.isOverdue {
            xp = max(xp / 2, 5)
        }

        // On-time bonus
        if let dueDate = task.dueDate, dueDate >= Date() {
            xp += 10
        }

        return xp
    }

    // MARK: - XP Reward Animation (Subtask 45.2)

    private var xpRewardAnimation: some View {
        ZStack {
            Color.black.opacity(0.3)
                .ignoresSafeArea()

            VStack(spacing: 20) {
                Image(systemName: "star.fill")
                    .font(.system(size: 80))
                    .foregroundStyle(.yellow)
                    .scaleEffect(showXPAnimation ? 1.0 : 0.1)
                    .rotationEffect(.degrees(showXPAnimation ? 360 : 0))
                    .animation(.spring(response: 0.6, dampingFraction: 0.6), value: showXPAnimation)

                Text("+\(earnedXP) XP")
                    .font(.system(size: 48, weight: .bold))
                    .foregroundStyle(.white)
                    .scaleEffect(showXPAnimation ? 1.0 : 0.5)
                    .opacity(showXPAnimation ? 1.0 : 0.0)
                    .animation(.spring(response: 0.6, dampingFraction: 0.7).delay(0.2), value: showXPAnimation)

                Text("Task Completed!")
                    .font(.title2)
                    .foregroundStyle(.white)
                    .opacity(showXPAnimation ? 1.0 : 0.0)
                    .animation(.easeIn(duration: 0.3).delay(0.4), value: showXPAnimation)
            }
            .padding(40)
            .background(.ultraThinMaterial)
            .cornerRadius(20)
            .shadow(radius: 20)
        }
    }

    // MARK: - Actions (Subtask 45.3)

    private func deleteTask() {
        modelContext.delete(task)

        do {
            try modelContext.save()
            logger.info("Task deleted: \(task.title)")
            dismiss()
        } catch {
            logger.error("Failed to delete task: \(error.localizedDescription)")
        }
    }

    private func generateShareText() -> String {
        var text = "📝 \(task.title)\n\n"

        if let description = task.taskDescription {
            text += "\(description)\n\n"
        }

        if let dueDate = task.dueDate {
            text += "📅 Due: \(dueDate.formatted(date: .long, time: .shortened))\n"
        }

        if let subject = task.subject {
            text += "📚 Subject: \(subject.displayName)\n"
        }

        text += "\n✨ Shared from MirrorBuddy"

        return text
    }

    // MARK: - Helpers

    private var subjectColor: Color {
        task.subject?.color ?? .gray
    }

    private var countdownIcon: String {
        if task.isOverdue {
            return "exclamationmark.triangle.fill"
        } else if task.isDueSoon {
            return "clock.fill"
        } else {
            return "calendar.badge.clock"
        }
    }

    private var countdownColor: Color {
        if task.isOverdue {
            return .red
        } else if task.isDueSoon {
            return .orange
        } else {
            return .blue
        }
    }

    private var countdownText: String {
        guard let dueDate = task.dueDate else { return "No deadline" }

        let now = Date()
        let calendar = Calendar.current

        if task.isOverdue {
            let components = calendar.dateComponents([.day, .hour], from: dueDate, to: now)
            if let days = components.day, days > 0 {
                return "\(days) day\(days == 1 ? "" : "s") overdue"
            } else if let hours = components.hour {
                return "\(hours) hour\(hours == 1 ? "" : "s") overdue"
            }
            return "Overdue"
        } else {
            let components = calendar.dateComponents([.day, .hour, .minute], from: now, to: dueDate)
            if let days = components.day, days > 0 {
                return "Due in \(days) day\(days == 1 ? "" : "s")"
            } else if let hours = components.hour, hours > 0 {
                return "Due in \(hours) hour\(hours == 1 ? "" : "s")"
            } else if let minutes = components.minute {
                return "Due in \(minutes) minute\(minutes == 1 ? "" : "s")"
            }
            return "Due soon"
        }
    }
}

// MARK: - Detail Row

struct DetailRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Spacer()

            Text(value)
                .font(.subheadline)
                .foregroundStyle(.primary)
        }
    }
}

// MARK: - Edit Task View (Placeholder for Subtask 45.3)

struct EditTaskView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext

    @Bindable var task: Task

    @State private var title: String
    @State private var description: String
    @State private var dueDate: Date
    @State private var priority: Int

    init(task: Task) {
        self.task = task
        _title = State(initialValue: task.title)
        _description = State(initialValue: task.taskDescription ?? "")
        _dueDate = State(initialValue: task.dueDate ?? Date())
        _priority = State(initialValue: task.priority)
    }

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
            .navigationTitle("Edit Task")
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
                    .disabled(title.isEmpty)
                }
            }
        }
    }

    private func saveChanges() {
        task.title = title
        task.taskDescription = description.isEmpty ? nil : description
        task.dueDate = dueDate
        task.priority = min(max(priority, 1), 5)

        do {
            try modelContext.save()
            dismiss()
        } catch {
            print("Failed to save task: \(error)")
        }
    }
}

// MARK: - Share Sheet

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

// MARK: - Task Source Extension

extension TaskSource {
    var displayName: String {
        switch self {
        case .manual: return "Manual"
        case .googleCalendar: return "Google Calendar"
        case .aiSuggested: return "AI Suggested"
        }
    }
}

// MARK: - Preview

#Preview {
    let config = ModelConfiguration(isStoredInMemoryOnly: true)
    let container = try! ModelContainer(for: Task.self, Material.self, SubjectEntity.self, configurations: config)

    let context = container.mainContext

    let math = SubjectEntity(localizationKey: "Matematica", iconName: "function", colorName: "blue", sortOrder: 1)
    let material = Material(title: "Calculus Chapter 5", subject: math)
    let task = Task(
        title: "Complete calculus homework",
        description: "Review limits and derivatives from Chapter 5. Make sure to complete all practice problems and review the examples.",
        subject: math,
        material: material,
        dueDate: Calendar.current.date(byAdding: .day, value: 1, to: Date()),
        priority: 5
    )

    context.insert(task)
    context.insert(material)

    return NavigationStack {
        TaskDetailView(task: task)
    }
    .modelContainer(container)
}
