import AVFoundation
import Combine
import Foundation
import UserNotifications

/// Service for capturing and managing tasks via voice or manual input
@MainActor
final class TaskCaptureService: NSObject, ObservableObject {
    // MARK: - Published Properties

    @Published var isListening: Bool = false
    @Published var capturedText: String = ""
    @Published var parsedTask: NaturalLanguageTaskParser.ParsedTask?
    @Published var isConfirming: Bool = false
    @Published var savedTasks: [CapturedTask] = []

    // MARK: - Dependencies

    private let parser: NaturalLanguageTaskParser
    private let speechSynthesizer = AVSpeechSynthesizer()
    private let notificationCenter = UNUserNotificationCenter.current()

    // Speech recognition (placeholder - would use Speech framework)
    private var isRecognizing: Bool = false

    // MARK: - Initialization

    override init() {
        self.parser = NaturalLanguageTaskParser()
        super.init()

        requestNotificationPermissions()
    }

    // MARK: - Voice Capture

    func startVoiceCapture() {
        guard !isListening else { return }

        isListening = true
        speak(TaskCaptureStrings.VoicePrompts.listening)

        // Start speech recognition
        startSpeechRecognition()
    }

    func stopVoiceCapture() {
        isListening = false
        stopSpeechRecognition()
    }

    private func startSpeechRecognition() {
        // Placeholder for actual Speech framework integration
        // In real implementation, would use SFSpeechRecognizer
        isRecognizing = true

        // Simulate recognition after 3 seconds for testing
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in
            self?.simulateRecognizedText("ricordami di studiare matematica per domani")
        }
    }

    private func stopSpeechRecognition() {
        isRecognizing = false
    }

    private func simulateRecognizedText(_ text: String) {
        handleRecognizedText(text)
    }

    private func handleRecognizedText(_ text: String) {
        capturedText = text
        isListening = false

        // Parse the recognized text
        let task = parser.parse(text)
        parsedTask = task

        // Confirm with user
        confirmTask(task)
    }

    // MARK: - Task Confirmation

    private func confirmTask(_ task: NaturalLanguageTaskParser.ParsedTask) {
        isConfirming = true

        let confirmationMessage = TaskCaptureStrings.VoicePrompts.taskWithDetails(
            title: task.title,
            subject: task.subject,
            dueDate: task.dueDate
        )

        speak(confirmationMessage)
    }

    func confirmAndSaveTask() {
        guard let task = parsedTask else { return }

        let capturedTask = CapturedTask(
            id: UUID().uuidString,
            title: task.title,
            subject: task.subject,
            dueDate: task.dueDate,
            priority: task.priority,
            notes: task.notes,
            createdDate: Date()
        )

        savedTasks.append(capturedTask)
        isConfirming = false
        parsedTask = nil
        capturedText = ""

        // Schedule reminder if due date exists
        if let dueDate = task.dueDate {
            scheduleReminder(for: capturedTask, at: dueDate)
        }

        speak(TaskCaptureStrings.VoicePrompts.taskAdded)
    }

    func cancelTask() {
        parsedTask = nil
        isConfirming = false
        capturedText = ""

        speak(TaskCaptureStrings.VoicePrompts.taskCancelled)
    }

    // MARK: - Manual Task Entry

    func addTask(
        title: String,
        subject: String?,
        dueDate: Date?,
        priority: NaturalLanguageTaskParser.ParsedTask.TaskPriority,
        notes: String?
    ) {
        let task = CapturedTask(
            id: UUID().uuidString,
            title: title,
            subject: subject,
            dueDate: dueDate,
            priority: priority,
            notes: notes,
            createdDate: Date()
        )

        savedTasks.append(task)

        // Schedule reminder if due date exists
        if let dueDate = dueDate {
            scheduleReminder(for: task, at: dueDate)
        }
    }

    // MARK: - Reminders

    private func requestNotificationPermissions() {
        notificationCenter.requestAuthorization(options: [.alert, .sound, .badge]) { _, error in
            if let error = error {
                print("Notification permission error: \(error)")
            }
        }
    }

    private func scheduleReminder(for task: CapturedTask, at date: Date) {
        let content = UNMutableNotificationContent()
        content.title = task.title
        content.body = task.subject ?? TaskCaptureStrings.UI.notes
        content.sound = .default

        // Schedule for day before, at 18:00
        var components = Calendar.current.dateComponents([.year, .month, .day], from: date)
        components.hour = 18
        components.minute = 0

        // Adjust to day before
        if let adjustedDate = Calendar.current.date(from: components),
           let dayBefore = Calendar.current.date(byAdding: .day, value: -1, to: adjustedDate) {
            let trigger = UNCalendarNotificationTrigger(
                dateMatching: Calendar.current.dateComponents(
                    [.year, .month, .day, .hour, .minute],
                    from: dayBefore
                ),
                repeats: false
            )

            let request = UNNotificationRequest(
                identifier: task.id,
                content: content,
                trigger: trigger
            )

            notificationCenter.add(request) { error in
                if let error = error {
                    print("Failed to schedule notification: \(error)")
                }
            }
        }
    }

    // MARK: - Voice Output

    private func speak(_ text: String) {
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: "it-IT")
        utterance.rate = 0.5
        utterance.volume = 0.7

        speechSynthesizer.speak(utterance)
    }

    // MARK: - Nightly Plan

    func generateNightlyPlan() -> String {
        var plan = TaskCaptureStrings.NightlyPlan.greeting + " "

        let today = Calendar.current.startOfDay(for: Date())
        let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: today) ?? today

        // Tasks completed today
        let completedToday = savedTasks.filter { task in
            if let createdDate = task.createdDate {
                return Calendar.current.isDate(createdDate, inSameDayAs: today)
            }
            return false
        }

        if !completedToday.isEmpty {
            plan += TaskCaptureStrings.NightlyPlan.tasksCompleted(count: completedToday.count) + " "
        } else {
            plan += TaskCaptureStrings.NightlyPlan.noTasksToday + " "
        }

        // Tasks for tomorrow
        let tomorrowTasks = savedTasks.filter { task in
            if let dueDate = task.dueDate {
                return Calendar.current.isDate(dueDate, inSameDayAs: tomorrow)
            }
            return false
        }

        if !tomorrowTasks.isEmpty {
            plan += TaskCaptureStrings.NightlyPlan.tasksPending(count: tomorrowTasks.count) + " "
            plan += TaskCaptureStrings.NightlyPlan.tomorrowPlan + " "

            for task in tomorrowTasks.prefix(3) {
                plan += task.title + ", "
            }
        } else {
            plan += TaskCaptureStrings.NightlyPlan.noTasksTomorrow + " "
        }

        plan += TaskCaptureStrings.NightlyPlan.goodNight

        return plan
    }

    func speakNightlyPlan() {
        let plan = generateNightlyPlan()
        speak(plan)
    }
}

// MARK: - Captured Task Model

struct CapturedTask: Identifiable, Codable, Equatable {
    let id: String
    let title: String
    let subject: String?
    let dueDate: Date?
    let priority: NaturalLanguageTaskParser.ParsedTask.TaskPriority
    let notes: String?
    let createdDate: Date?

    init(
        id: String,
        title: String,
        subject: String?,
        dueDate: Date?,
        priority: NaturalLanguageTaskParser.ParsedTask.TaskPriority,
        notes: String?,
        createdDate: Date
    ) {
        self.id = id
        self.title = title
        self.subject = subject
        self.dueDate = dueDate
        self.priority = priority
        self.notes = notes
        self.createdDate = createdDate
    }
}
