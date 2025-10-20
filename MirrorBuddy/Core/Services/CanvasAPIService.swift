import Combine
import Foundation
import SwiftData

/// Canvas LMS API service for importing assignments
@MainActor
final class CanvasAPIService: ObservableObject {
    private let keychainManager = KeychainManager.shared
    private let session = URLSession.shared

    /// Canvas assignment structure
    struct CanvasAssignment: Codable {
        let id: Int
        let name: String
        let description: String?
        let dueAt: String?
        let courseId: Int
        let pointsPossible: Double?

        enum CodingKeys: String, CodingKey {
            case id, name, description
            case dueAt = "due_at"
            case courseId = "course_id"
            case pointsPossible = "points_possible"
        }
    }

    /// Canvas course structure
    struct CanvasCourse: Codable {
        let id: Int
        let name: String
        let courseCode: String?

        enum CodingKeys: String, CodingKey {
            case id, name
            case courseCode = "course_code"
        }
    }

    /// Fetch user's courses from Canvas
    func fetchCourses(baseURL: String, accessToken: String) async throws -> [CanvasCourse] {
        guard let url = URL(string: "https://\(baseURL)/api/v1/courses") else {
            throw NSError(domain: "CanvasAPI", code: -1,
                          userInfo: [NSLocalizedDescriptionKey: "Invalid URL for courses"])
        }
        var request = URLRequest(url: url)
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw NSError(domain: "CanvasAPI", code: -1,
                          userInfo: [NSLocalizedDescriptionKey: "Failed to fetch courses"])
        }

        return try JSONDecoder().decode([CanvasCourse].self, from: data)
    }

    /// Fetch assignments for a course
    func fetchAssignments(
        baseURL: String,
        accessToken: String,
        courseID: Int
    ) async throws -> [CanvasAssignment] {
        guard let url = URL(string: "https://\(baseURL)/api/v1/courses/\(courseID)/assignments") else {
            throw NSError(domain: "CanvasAPI", code: -1,
                          userInfo: [NSLocalizedDescriptionKey: "Invalid URL for assignments"])
        }
        var request = URLRequest(url: url)
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw NSError(domain: "CanvasAPI", code: -1,
                          userInfo: [NSLocalizedDescriptionKey: "Failed to fetch assignments"])
        }

        return try JSONDecoder().decode([CanvasAssignment].self, from: data)
    }

    /// Import assignments from Canvas to Task objects
    func importAssignments(
        baseURL: String,
        consent: LMSConsent,
        modelContext: ModelContext
    ) async throws -> [Task] {
        guard consent.isValid else {
            throw NSError(domain: "CanvasAPI", code: -2,
                          userInfo: [NSLocalizedDescriptionKey: "LMS consent not granted"])
        }

        guard let accessTokenKey = consent.accessTokenKeychainKey,
              let accessToken = try? keychainManager.retrieve(key: accessTokenKey) else {
            throw NSError(domain: "CanvasAPI", code: -3,
                          userInfo: [NSLocalizedDescriptionKey: "Access token not found"])
        }

        let courses = try await fetchCourses(baseURL: baseURL, accessToken: accessToken)
        var importedTasks: [Task] = []

        for course in courses {
            let assignments = try await fetchAssignments(
                baseURL: baseURL,
                accessToken: accessToken,
                courseID: course.id
            )

            for assignment in assignments {
                // Check if assignment already imported
                let descriptor = FetchDescriptor<Task>(
                    predicate: #Predicate { task in
                        task.lmsAssignmentID == String(assignment.id) &&
                            task.source == .canvas
                    }
                )

                let existingTasks = try? modelContext.fetch(descriptor)
                if existingTasks?.isEmpty == false {
                    continue // Skip already imported
                }

                // Parse due date
                var dueDate: Date?
                if let dueDateString = assignment.dueAt {
                    let formatter = ISO8601DateFormatter()
                    dueDate = formatter.date(from: dueDateString)
                }

                // Create task
                let task = Task(
                    title: assignment.name,
                    description: assignment.description,
                    dueDate: dueDate,
                    source: .canvas,
                    priority: dueDate != nil ? 4 : 3
                )
                task.lmsAssignmentID = String(assignment.id)
                task.lmsCourseID = String(course.id)

                modelContext.insert(task)
                importedTasks.append(task)
            }
        }

        try modelContext.save()
        return importedTasks
    }

    /// Initiate Canvas OAuth flow
    func initiateOAuth(baseURL: String, clientID: String) -> URL? {
        var components = URLComponents(string: "https://\(baseURL)/login/oauth2/auth")
        components?.queryItems = [
            URLQueryItem(name: "client_id", value: clientID),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "redirect_uri", value: "mirrorbuddy://canvas-oauth")
        ]
        return components?.url
    }

    /// Exchange authorization code for access token
    func exchangeCodeForToken(
        baseURL: String,
        clientID: String,
        clientSecret: String,
        code: String
    ) async throws -> (accessToken: String, refreshToken: String?) {
        guard let url = URL(string: "https://\(baseURL)/login/oauth2/token") else {
            throw NSError(domain: "CanvasAPI", code: -1,
                          userInfo: [NSLocalizedDescriptionKey: "Invalid URL for token exchange"])
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")

        let body = [
            "grant_type": "authorization_code",
            "client_id": clientID,
            "client_secret": clientSecret,
            "redirect_uri": "mirrorbuddy://canvas-oauth",
            "code": code
        ].map { "\($0.key)=\($0.value)" }.joined(separator: "&")
        request.httpBody = body.data(using: .utf8)

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw NSError(domain: "CanvasAPI", code: -4,
                          userInfo: [NSLocalizedDescriptionKey: "Failed to exchange code for token"])
        }

        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let accessToken = json?["access_token"] as? String else {
            throw NSError(domain: "CanvasAPI", code: -5,
                          userInfo: [NSLocalizedDescriptionKey: "Invalid token response"])
        }

        let refreshToken = json?["refresh_token"] as? String
        return (accessToken, refreshToken)
    }
}
