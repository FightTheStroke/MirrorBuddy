import Foundation

/// Centralized localization for Task Capture feature
enum TaskCaptureStrings {
    // MARK: - Subjects

    enum Subject {
        static let math = NSLocalizedString(
            "task.capture.subject.math",
            value: "Matematica",
            comment: "Math subject"
        )

        static let italian = NSLocalizedString(
            "task.capture.subject.italian",
            value: "Italiano",
            comment: "Italian subject"
        )

        static let history = NSLocalizedString(
            "task.capture.subject.history",
            value: "Storia",
            comment: "History subject"
        )

        static let science = NSLocalizedString(
            "task.capture.subject.science",
            value: "Scienze",
            comment: "Science subject"
        )

        static let language = NSLocalizedString(
            "task.capture.subject.language",
            value: "Lingue",
            comment: "Languages subject"
        )
    }

    // MARK: - Priority

    enum Priority {
        static func name(for priority: NaturalLanguageTaskParser.ParsedTask.TaskPriority) -> String {
            switch priority {
            case .high:
                return NSLocalizedString(
                    "task.capture.priority.high",
                    value: "Alta",
                    comment: "High priority"
                )
            case .medium:
                return NSLocalizedString(
                    "task.capture.priority.medium",
                    value: "Media",
                    comment: "Medium priority"
                )
            case .low:
                return NSLocalizedString(
                    "task.capture.priority.low",
                    value: "Bassa",
                    comment: "Low priority"
                )
            }
        }
    }

    // MARK: - Voice Prompts

    enum VoicePrompts {
        static let listening = NSLocalizedString(
            "task.capture.voice.listening",
            value: "Ti ascolto. Dimmi il task che vuoi aggiungere.",
            comment: "Voice listening prompt"
        )

        static func confirmTask(title: String) -> String {
            String(format: NSLocalizedString(
                "task.capture.voice.confirm_task",
                value: "Ho capito: %@. Confermo?",
                comment: "Task confirmation prompt"
            ), title)
        }

        static let taskAdded = NSLocalizedString(
            "task.capture.voice.task_added",
            value: "Perfetto! Task aggiunto alla lista.",
            comment: "Task added confirmation"
        )

        static let taskCancelled = NSLocalizedString(
            "task.capture.voice.task_cancelled",
            value: "Ok, non aggiungo nulla.",
            comment: "Task cancelled message"
        )

        static let errorParsing = NSLocalizedString(
            "task.capture.voice.error_parsing",
            value: "Scusa, non ho capito bene. Puoi ripetere?",
            comment: "Parsing error message"
        )

        static func taskWithDetails(title: String, subject: String?, dueDate: Date?) -> String {
            var message = String(format: NSLocalizedString(
                "task.capture.voice.task_with_details",
                value: "Task: %@",
                comment: "Task title in details"
            ), title)

            if let subject = subject {
                message += String(format: NSLocalizedString(
                    "task.capture.voice.for_subject",
                    value: " per %@",
                    comment: "For subject"
                ), subject)
            }

            if let dueDate = dueDate {
                let formatter = DateFormatter()
                formatter.dateStyle = .medium
                formatter.locale = Locale(identifier: "it_IT")
                message += String(format: NSLocalizedString(
                    "task.capture.voice.due_date",
                    value: ", scadenza %@",
                    comment: "Due date"
                ), formatter.string(from: dueDate))
            }

            return message
        }
    }

    // MARK: - Nightly Plan

    enum NightlyPlan {
        static let greeting = NSLocalizedString(
            "task.capture.nightly.greeting",
            value: "Ciao! Facciamo un riepilogo della giornata.",
            comment: "Nightly plan greeting"
        )

        static func tasksCompleted(count: Int) -> String {
            String(format: NSLocalizedString(
                "task.capture.nightly.tasks_completed",
                value: "Hai completato %d task oggi!",
                comment: "Tasks completed today"
            ), count)
        }

        static func tasksPending(count: Int) -> String {
            String(format: NSLocalizedString(
                "task.capture.nightly.tasks_pending",
                value: "Rimangono %d task per domani.",
                comment: "Tasks pending for tomorrow"
            ), count)
        }

        static let tomorrowPlan = NSLocalizedString(
            "task.capture.nightly.tomorrow_plan",
            value: "Ecco il piano per domani:",
            comment: "Tomorrow's plan header"
        )

        static let goodNight = NSLocalizedString(
            "task.capture.nightly.good_night",
            value: "Buona notte e buono studio domani!",
            comment: "Good night message"
        )

        static let noTasksToday = NSLocalizedString(
            "task.capture.nightly.no_tasks_today",
            value: "Non hai completato task oggi, ma va bene così!",
            comment: "No tasks completed message"
        )

        static let noTasksTomorrow = NSLocalizedString(
            "task.capture.nightly.no_tasks_tomorrow",
            value: "Domani non hai task in programma. Goditi la giornata!",
            comment: "No tasks tomorrow message"
        )
    }

    // MARK: - UI

    enum UIConstants {
        static let addTask = NSLocalizedString(
            "task.capture.ui.add_task",
            value: "Aggiungi Task",
            comment: "Add task button"
        )

        static let voiceCapture = NSLocalizedString(
            "task.capture.ui.voice_capture",
            value: "Cattura con Voce",
            comment: "Voice capture button"
        )

        static let manualEntry = NSLocalizedString(
            "task.capture.ui.manual_entry",
            value: "Inserimento Manuale",
            comment: "Manual entry button"
        )

        static let taskTitle = NSLocalizedString(
            "task.capture.ui.task_title",
            value: "Titolo Task",
            comment: "Task title field"
        )

        static let subject = NSLocalizedString(
            "task.capture.ui.subject",
            value: "Materia",
            comment: "Subject field"
        )

        static let dueDate = NSLocalizedString(
            "task.capture.ui.due_date",
            value: "Scadenza",
            comment: "Due date field"
        )

        static let priority = NSLocalizedString(
            "task.capture.ui.priority",
            value: "Priorità",
            comment: "Priority field"
        )

        static let notes = NSLocalizedString(
            "task.capture.ui.notes",
            value: "Note",
            comment: "Notes field"
        )

        static let save = NSLocalizedString(
            "task.capture.ui.save",
            value: "Salva",
            comment: "Save button"
        )

        static let cancel = NSLocalizedString(
            "task.capture.ui.cancel",
            value: "Annulla",
            comment: "Cancel button"
        )

        static let confirm = NSLocalizedString(
            "task.capture.ui.confirm",
            value: "Conferma",
            comment: "Confirm button"
        )

        static let edit = NSLocalizedString(
            "task.capture.ui.edit",
            value: "Modifica",
            comment: "Edit button"
        )
    }

    // MARK: - Reminders

    enum Reminders {
        static func scheduledFor(date: Date) -> String {
            let formatter = DateFormatter()
            formatter.dateStyle = .short
            formatter.timeStyle = .short
            formatter.locale = Locale(identifier: "it_IT")

            return String(format: NSLocalizedString(
                "task.capture.reminders.scheduled_for",
                value: "Promemoria programmato per %@",
                comment: "Reminder scheduled"
            ), formatter.string(from: date))
        }

        static let reminderSet = NSLocalizedString(
            "task.capture.reminders.reminder_set",
            value: "Promemoria impostato!",
            comment: "Reminder set confirmation"
        )

        static let permissionDenied = NSLocalizedString(
            "task.capture.reminders.permission_denied",
            value: "Permesso notifiche negato. Attiva le notifiche nelle impostazioni.",
            comment: "Notification permission denied"
        )
    }
}
