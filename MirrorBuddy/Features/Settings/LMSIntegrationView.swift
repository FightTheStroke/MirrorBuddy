import SwiftData
import SwiftUI

/// View for managing LMS integrations (Canvas, Google Classroom)
struct LMSIntegrationView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var consents: [LMSConsent]

    @StateObject private var canvasService = CanvasAPIService()
    @StateObject private var classroomService = GoogleClassroomService()

    @State private var showingCanvasSetup = false
    @State private var showingClassroomSetup = false
    @State private var isSyncing = false
    @State private var lastSyncError: String?

    var body: some View {
        List {
            Section {
                Text("Connect your learning management systems to automatically import assignments and due dates.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            // Google Classroom
            Section("Google Classroom") {
                if let classroomConsent = consents.first(where: { $0.platform == .googleClassroom }) {
                    if classroomConsent.isValid {
                        integrationRow(
                            title: "Google Classroom",
                            isConnected: true,
                            lastSynced: classroomConsent.lastSyncedAt,
                            onSync: { await syncGoogleClassroom(consent: classroomConsent) },
                            onDisconnect: { disconnectLMS(consent: classroomConsent) }
                        )
                    } else {
                        connectButton(platform: "Google Classroom") {
                            showingClassroomSetup = true
                        }
                    }
                } else {
                    connectButton(platform: "Google Classroom") {
                        showingClassroomSetup = true
                    }
                }
            }

            // Canvas LMS
            Section("Canvas LMS") {
                if let canvasConsent = consents.first(where: { $0.platform == .canvas }) {
                    if canvasConsent.isValid {
                        integrationRow(
                            title: "Canvas",
                            isConnected: true,
                            lastSynced: canvasConsent.lastSyncedAt,
                            onSync: { await syncCanvas(consent: canvasConsent) },
                            onDisconnect: { disconnectLMS(consent: canvasConsent) }
                        )
                    } else {
                        connectButton(platform: "Canvas") {
                            showingCanvasSetup = true
                        }
                    }
                } else {
                    connectButton(platform: "Canvas") {
                        showingCanvasSetup = true
                    }
                }
            }

            // Privacy notice
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Label("Privacy Protected", systemImage: "lock.shield.fill")
                        .font(.subheadline)
                        .foregroundColor(.green)

                    Text("Your LMS credentials are securely stored in the device Keychain. MirrorBuddy only accesses assignment information with your explicit consent.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            if let error = lastSyncError {
                Section {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.red)
                }
            }
        }
        .navigationTitle("LMS Integration")
        .sheet(isPresented: $showingCanvasSetup) {
            CanvasSetupView()
        }
        .sheet(isPresented: $showingClassroomSetup) {
            GoogleClassroomSetupView()
        }
    }

    @ViewBuilder
    private func connectButton(platform: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Image(systemName: "link.circle.fill")
                    .foregroundColor(.blue)
                Text("Connect \(platform)")
                Spacer()
                Image(systemName: "chevron.right")
                    .foregroundColor(.secondary)
            }
        }
    }

    @ViewBuilder
    private func integrationRow(
        title: String,
        isConnected: Bool,
        lastSynced: Date?,
        onSync: @escaping () async -> Void,
        onDisconnect: @escaping () -> Void
    ) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.green)
                Text(title)
                    .font(.headline)
                Spacer()
                Text("Connected")
                    .font(.caption)
                    .foregroundColor(.green)
            }

            if let lastSynced {
                Text("Last synced: \(lastSynced, style: .relative) ago")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            HStack(spacing: 12) {
                Button {
                    _Concurrency.Task {
                        isSyncing = true
                        await onSync()
                        isSyncing = false
                    }
                } label: {
                    Label("Sync Now", systemImage: "arrow.triangle.2.circlepath")
                        .font(.subheadline)
                }
                .disabled(isSyncing)

                Spacer()

                Button(role: .destructive, action: onDisconnect) {
                    Text("Disconnect")
                        .font(.subheadline)
                }
            }
            .buttonStyle(.bordered)
        }
    }

    private func syncGoogleClassroom(consent: LMSConsent) async {
        do {
            lastSyncError = nil
            _ = try await classroomService.importAssignments(
                consent: consent,
                modelContext: modelContext
            )
            consent.lastSyncedAt = Date()
            try modelContext.save()
        } catch {
            lastSyncError = "Google Classroom sync failed: \(error.localizedDescription)"
        }
    }

    private func syncCanvas(consent: LMSConsent) async {
        do {
            guard let baseURL = consent.canvasBaseURL else {
                lastSyncError = "Canvas base URL not configured"
                return
            }
            lastSyncError = nil
            _ = try await canvasService.importAssignments(
                baseURL: baseURL,
                consent: consent,
                modelContext: modelContext
            )
            consent.lastSyncedAt = Date()
            try modelContext.save()
        } catch {
            lastSyncError = "Canvas sync failed: \(error.localizedDescription)"
        }
    }

    private func disconnectLMS(consent: LMSConsent) {
        consent.revoke()

        // Clear tokens from Keychain based on platform
        let service: OAuthService = consent.platform == .canvas ? .canvas : .googleClassroom
        try? KeychainManager.shared.delete(.oauthToken(service))

        try? modelContext.save()
    }
}

// MARK: - Canvas Setup View

struct CanvasSetupView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext

    @State private var baseURL = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text("Enter your Canvas instance URL (e.g., school.instructure.com)")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                Section("Canvas URL") {
                    TextField("school.instructure.com", text: $baseURL)
                        .textContentType(.URL)
                        .autocapitalization(.none)
                        .keyboardType(.URL)
                }

                Section {
                    Text("You'll be redirected to Canvas to authorize MirrorBuddy to access your assignments.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                if let error = errorMessage {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Connect Canvas")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Connect") {
                        connectCanvas()
                    }
                    .disabled(baseURL.isEmpty || isLoading)
                }
            }
        }
    }

    private func connectCanvas() {
        // Note: This requires Canvas OAuth credentials configured in app
        // For now, create consent record for manual token entry
        let consent = LMSConsent(platform: .canvas)
        consent.canvasBaseURL = baseURL
        modelContext.insert(consent)

        errorMessage = "Canvas OAuth not yet configured. Please contact support."
        // In production, would initiate OAuth flow here
    }
}

// MARK: - Google Classroom Setup View

struct GoogleClassroomSetupView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Image(systemName: "book.fill")
                    .font(.system(size: 60))
                    .foregroundColor(.blue)

                Text("Connect Google Classroom")
                    .font(.title2)
                    .bold()

                Text("MirrorBuddy will access:\n• Your courses\n• Course assignments\n• Due dates")
                    .multilineTextAlignment(.center)
                    .foregroundColor(.secondary)

                Button(action: connectGoogleClassroom) {
                    Label("Continue with Google", systemImage: "g.circle.fill")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                }
                .padding(.horizontal)

                Text("Your credentials are stored securely and never shared.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }

    private func connectGoogleClassroom() {
        // Create consent record
        let consent = LMSConsent(platform: .googleClassroom)
        modelContext.insert(consent)

        // In production, would integrate with GoogleOAuthService to request Classroom scopes
        // For now, just dismiss
        dismiss()
    }
}

#Preview {
    NavigationStack {
        LMSIntegrationView()
    }
    .modelContainer(for: [LMSConsent.self])
}
