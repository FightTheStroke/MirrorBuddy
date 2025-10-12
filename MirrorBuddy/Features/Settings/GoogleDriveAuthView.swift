import SwiftUI
import AuthenticationServices
import Combine

/// View for Google Drive authentication
struct GoogleDriveAuthView: View {
    @StateObject private var viewModel = GoogleDriveAuthViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 12) {
                    Image(systemName: "cloud.fill")
                        .font(.system(size: 60))
                        .foregroundStyle(.blue)

                    Text("Connect Google Drive")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Sign in to access your Google Drive files")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding(.top, 40)

                Spacer()

                // Authentication Status
                if viewModel.isAuthenticated {
                    VStack(spacing: 16) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 50))
                            .foregroundStyle(.green)

                        Text("Connected")
                            .font(.title3)
                            .fontWeight(.semibold)

                        if let userEmail = viewModel.userEmail {
                            Text(userEmail)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }

                        Button(role: .destructive) {
                            viewModel.signOut()
                        } label: {
                            Label("Sign Out", systemImage: "arrow.right.square")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.large)
                    }
                } else {
                    VStack(spacing: 16) {
                        // Sign In Button
                        Button {
                            viewModel.signIn()
                        } label: {
                            HStack {
                                Image(systemName: "person.circle.fill")
                                Text("Sign in with Google")
                            }
                            .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.large)
                        .disabled(viewModel.isLoading)

                        if viewModel.isLoading {
                            ProgressView()
                                .progressViewStyle(.circular)
                        }

                        // Permissions Info
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Permissions Required:")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundStyle(.secondary)

                            ForEach(viewModel.permissions, id: \.self) { permission in
                                HStack(alignment: .top, spacing: 8) {
                                    Image(systemName: "checkmark.circle.fill")
                                        .font(.caption)
                                        .foregroundStyle(.green)
                                    Text(permission)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                    }
                }

                Spacer()

                // Error Display
                if let error = viewModel.errorMessage {
                    VStack(spacing: 8) {
                        Label(error, systemImage: "exclamationmark.triangle.fill")
                            .font(.caption)
                            .foregroundStyle(.red)
                            .multilineTextAlignment(.center)

                        Button("Dismiss") {
                            viewModel.clearError()
                        }
                        .font(.caption)
                        .buttonStyle(.bordered)
                        .controlSize(.small)
                    }
                    .padding()
                    .background(Color.red.opacity(0.1))
                    .cornerRadius(12)
                }
            }
            .padding()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            .onAppear {
                viewModel.checkAuthenticationStatus()
            }
        }
    }
}

// MARK: - View Model

@MainActor
final class GoogleDriveAuthViewModel: NSObject, ObservableObject {
    @Published var isAuthenticated = false
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var userEmail: String?

    private let oauthService = GoogleOAuthService.shared

    let permissions = [
        "View and download your Google Drive files",
        "View file metadata and properties",
        "Manage files created by this app",
        "View your email address and profile"
    ]

    func checkAuthenticationStatus() {
        _Concurrency.Task {
            isAuthenticated = await oauthService.isAuthenticated()

            if isAuthenticated {
                // Try to extract user email from token scope or make API call
                if let tokens = try? await oauthService.getTokens(),
                   let scope = tokens.scope {
                    // Check if we have userinfo.email scope
                    if scope.contains("userinfo.email") {
                        // In production, you'd make an API call to get user info
                        // For now, we just show that we're connected
                        userEmail = "Connected"
                    }
                }
            }
        }
    }

    func signIn() {
        guard !isLoading else { return }

        isLoading = true
        errorMessage = nil

        _Concurrency.Task {
            do {
                // Find the window to provide presentation context
                let windowScene = UIApplication.shared.connectedScenes
                    .first as? UIWindowScene

                guard let window = windowScene?.windows.first else {
                    throw GoogleOAuthError.sessionStartFailed
                }

                // Perform authentication
                _ = try await oauthService.authenticate(
                    presentationContextProvider: self
                )

                // Update state on success
                isAuthenticated = true
                isLoading = false

            } catch {
                isLoading = false

                // Handle user cancellation silently
                if let oauthError = error as? GoogleOAuthError,
                   case .userCancelled = oauthError {
                    return
                }

                errorMessage = error.localizedDescription
            }
        }
    }

    func signOut() {
        _Concurrency.Task {
            do {
                try await oauthService.signOut()
                isAuthenticated = false
                userEmail = nil
            } catch {
                errorMessage = "Failed to sign out: \(error.localizedDescription)"
            }
        }
    }

    func clearError() {
        errorMessage = nil
    }
}

// MARK: - ASWebAuthenticationPresentationContextProviding

extension GoogleDriveAuthViewModel: ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first {
            return window
        }
        return ASPresentationAnchor()
    }
}

// MARK: - Preview

#Preview {
    GoogleDriveAuthView()
}
