import SwiftUI
import AVFoundation
import Photos
import UserNotifications

// MARK: - Permissions View (Task 55.1)

/// Permission requests view for onboarding
struct OnboardingPermissionsView: View {
    @ObservedObject var state: OnboardingState

    var body: some View {
        ScrollView {
            VStack(spacing: 32) {
                // Header
                VStack(spacing: 16) {
                    Image(systemName: "checkmark.shield.fill")
                        .font(.system(size: 60))
                        .foregroundStyle(.blue)

                    Text("Permessi Necessari")
                        .font(.title.bold())

                    Text("Abilita i permessi per utilizzare tutte le funzionalità di MirrorBuddy")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }
                .padding(.top, 32)

                // Permission cards
                VStack(spacing: 16) {
                    PermissionCard(
                        permission: .camera,
                        isGranted: state.cameraPermissionGranted
                    ) {
                        requestCameraPermission()
                    }

                    PermissionCard(
                        permission: .microphone,
                        isGranted: state.microphonePermissionGranted
                    ) {
                        requestMicrophonePermission()
                    }

                    PermissionCard(
                        permission: .notifications,
                        isGranted: state.notificationsPermissionGranted
                    ) {
                        requestNotificationPermission()
                    }
                }
                .padding(.horizontal)

                // Info text
                Text("Puoi modificare questi permessi in qualsiasi momento dalle Impostazioni di iOS")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
                    .padding(.bottom, 32)
            }
        }
    }

    // MARK: - Permission Requests

    private func requestCameraPermission() {
        AVCaptureDevice.requestAccess(for: .video) { granted in
            _Concurrency.Task { @MainActor in
                state.cameraPermissionGranted = granted
            }
        }
    }

    private func requestMicrophonePermission() {
        AVCaptureDevice.requestAccess(for: .audio) { granted in
            _Concurrency.Task { @MainActor in
                state.microphonePermissionGranted = granted
            }
        }
    }

    private func requestNotificationPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            _Concurrency.Task { @MainActor in
                state.notificationsPermissionGranted = granted
            }
        }
    }
}

// MARK: - Permission Card

private struct PermissionCard: View {
    let permission: OnboardingPermission
    let isGranted: Bool
    let onRequest: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                // Icon
                ZStack {
                    Circle()
                        .fill(permission.color.opacity(0.2))
                        .frame(width: 50, height: 50)

                    Image(systemName: permission.icon)
                        .font(.title2)
                        .foregroundStyle(permission.color)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(permission.title)
                        .font(.headline)

                    if isGranted {
                        HStack(spacing: 4) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.caption)
                            Text("Abilitato")
                                .font(.caption)
                        }
                        .foregroundStyle(.green)
                    }
                }

                Spacer()

                // Status indicator
                if isGranted {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.title2)
                        .foregroundStyle(.green)
                } else {
                    Button {
                        onRequest()
                    } label: {
                        Text("Abilita")
                            .font(.subheadline)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(permission.color)
                            .foregroundStyle(.white)
                            .cornerRadius(8)
                    }
                }
            }

            Text(permission.description)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 8)
    }
}

// MARK: - Preview

#Preview {
    OnboardingPermissionsView(state: {
        let state = OnboardingState()
        state.cameraPermissionGranted = true
        return state
    }())
}
