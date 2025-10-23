import Combine
import Foundation
import SwiftData

/// Google Classroom API service for importing assignments
@MainActor
final class GoogleClassroomService: ObservableObject {
    private let keychainManager = KeychainManager.shared
    private let session = URLSession.shared
    private let baseURL = "https://classroom.googleapis.com/v1"

    /// Google Classroom Course
    struct ClassroomCourse: Codable {
        let id: String
        let name: String
        let section: String?
        let descriptionHeading: String?
        let courseState: String?
    }

    /// Google Classroom CourseWork (Assignment)
    struct ClassroomCourseWork: Codable {
        let id: String
        let courseId: String
        let title: String
        let description: String?
        let state: String
        let dueDate: DueDate?
        let dueTime: DueTime?
        let maxPoints: Double?

        struct DueDate: Codable {
            let year: Int
            let month: Int
            let day: Int
        }

        struct DueTime: Codable {
            let hours: Int?
            let minutes: Int?
        }
    }

    /// Response wrapper for courses
    struct CoursesResponse: Codable {
        let courses: [ClassroomCourse]?
    }

    /// Response wrapper for coursework
    struct CourseWorkResponse: Codable {
        let courseWork: [ClassroomCourseWork]?
    }

    /// Required OAuth scopes for Google Classroom
    static let requiredScopes = [
        "https://www.googleapis.com/auth/classroom.courses.readonly",
        "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
        "https://www.googleapis.com/auth/classroom.announcements.readonly"
    ]

    /// Fetch user's courses
    func fetchCourses(accessToken: String) async throws -> [ClassroomCourse] {
        guard let url = URL(string: "\(baseURL)/courses") else {
            throw NSError(domain: "GoogleClassroom", code: -1,
                          userInfo: [NSLocalizedDescriptionKey: "Invalid URL for courses"])
        }
        var request = URLRequest(url: url)
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw NSError(domain: "GoogleClassroom", code: -1,
                          userInfo: [NSLocalizedDescriptionKey: "Failed to fetch courses"])
        }

        let coursesResponse = try JSONDecoder().decode(CoursesResponse.self, from: data)
        return coursesResponse.courses ?? []
    }

    /// Fetch coursework for a specific course
    func fetchCourseWork(
        accessToken: String,
        courseID: String
    ) async throws -> [ClassroomCourseWork] {
        guard let url = URL(string: "\(baseURL)/courses/\(courseID)/courseWork") else {
            throw NSError(domain: "GoogleClassroom", code: -2,
                          userInfo: [NSLocalizedDescriptionKey: "Invalid URL for coursework"])
        }
        var request = URLRequest(url: url)
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw NSError(domain: "GoogleClassroom", code: -2,
                          userInfo: [NSLocalizedDescriptionKey: "Failed to fetch coursework"])
        }

        let workResponse = try JSONDecoder().decode(CourseWorkResponse.self, from: data)
        return workResponse.courseWork ?? []
    }

    /// Convert Google Classroom date/time to Date object
    private func convertToDate(dueDate: ClassroomCourseWork.DueDate?, dueTime: ClassroomCourseWork.DueTime?) -> Date? {
        guard let dueDate else { return nil }

        var components = DateComponents()
        components.year = dueDate.year
        components.month = dueDate.month
        components.day = dueDate.day
        components.hour = dueTime?.hours ?? 23
        components.minute = dueTime?.minutes ?? 59

        return Calendar.current.date(from: components)
    }

    /// Import assignments from Google Classroom
    func importAssignments(
        consent: LMSConsent,
        modelContext: ModelContext
    ) async throws -> [Task] {
        guard consent.isValid else {
            throw NSError(domain: "GoogleClassroom", code: -3,
                          userInfo: [NSLocalizedDescriptionKey: "LMS consent not granted"])
        }

        // TODO: Fix KeychainManager.retrieve method signature
        guard let accessTokenKey = consent.accessTokenKeychainKey,
              !accessTokenKey.isEmpty else {
            throw NSError(domain: "GoogleClassroom", code: -4,
                          userInfo: [NSLocalizedDescriptionKey: "Access token key not configured"])
        }
        // Temporary: retrieve method needs to be fixed in KeychainManager
        let accessToken = accessTokenKey // Placeholder

        let courses = try await fetchCourses(accessToken: accessToken)
        var importedTasks: [Task] = []

        for course in courses {
            // Only process active courses
            guard course.courseState == "ACTIVE" else { continue }

            let courseWork = try await fetchCourseWork(
                accessToken: accessToken,
                courseID: course.id
            )

            for work in courseWork {
                // Only import published assignments
                guard work.state == "PUBLISHED" else { continue }

                // Check if already imported
                let workID = work.id
                let googleClassroomSource = TaskSource.googleClassroom
                let descriptor = FetchDescriptor<MirrorBuddy.Task>(
                    predicate: #Predicate { task in
                        task.lmsAssignmentID == workID &&
                            task.source == googleClassroomSource
                    }
                )

                let existingTasks = try? modelContext.fetch(descriptor)
                if existingTasks?.isEmpty == false {
                    continue // Skip already imported
                }

                // Convert due date
                let dueDate = convertToDate(dueDate: work.dueDate, dueTime: work.dueTime)

                // Create task
                let task = Task(
                    title: work.title,
                    description: work.description,
                    dueDate: dueDate,
                    source: .googleClassroom,
                    priority: dueDate != nil ? 4 : 3
                )
                task.lmsAssignmentID = work.id
                task.lmsCourseID = course.id

                modelContext.insert(task)
                importedTasks.append(task)
            }
        }

        try modelContext.save()
        return importedTasks
    }

    /// Request additional scopes for Google Classroom
    func requestClassroomScopes() -> [String] {
        Self.requiredScopes
    }
}
