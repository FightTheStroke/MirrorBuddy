import SwiftUI
import AuthenticationServices

// MARK: - Google Account Connection View (Task 55.1)

/// Google account connection view for onboarding
struct OnboardingGoogleAccountView: View {
    @ObservedObject var state: OnboardingState
    @State private var isLoading = false
    @State private var showError = false
    @State private var errorMessage = ""

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            // Header
            VStack(spacing: 16) {
                Image(systemName: "person.crop.circle.fill")
                    .font(.system(size: 60))
                    .foregroundStyle(.blue)

                Text("Account Google")
                    .font(.title.bold())

                Text("Connetti il tuo account Google per sincronizzare i tuoi materiali di studio su tutti i dispositivi")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }

            // Benefits
            VStack(alignment: .leading, spacing: 16) {
                BenefitRow(
                    icon: "icloud.fill",
                    title: "Sincronizzazione Cloud",
                    description: "Accedi ai tuoi materiali da qualsiasi dispositivo"
                )

                BenefitRow(
                    icon: "arrow.triangle.2.circlepath",
                    title: "Backup Automatico",
                    description: "I tuoi dati sono sempre al sicuro"
                )

                BenefitRow(
                    icon: "folder.fill",
                    title: "Importa da Drive",
                    description: "Carica file direttamente da Google Drive"
                )
            }
            .padding(.horizontal, 32)

            // Connection status or button
            if state.isGoogleAccountConnected {
                VStack(spacing: 12) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 50))
                        .foregroundStyle(.green)

                    Text("Account Connesso")
                        .font(.headline)
                        .foregroundStyle(.green)
                }
                .padding()
                .frame(maxWidth: .infinity)
                .background(Color.green.opacity(0.1))
                .cornerRadius(12)
                .padding(.horizontal, 32)
            } else {
                VStack(spacing: 16) {
                    Button {
                        connectGoogleAccount()
                    } label: {
                        HStack {
                            if isLoading {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Image(systemName: "person.crop.circle.fill.badge.checkmark")
                                Text("Connetti Account Google")
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundStyle(.white)
                        .cornerRadius(12)
                    }
                    .disabled(isLoading)

                    Text("Useremo Google solo per l'autenticazione e la sincronizzazione dei dati")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding(.horizontal, 32)
            }

            Spacer()
        }
        .alert("Errore di Connessione", isPresented: $showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(errorMessage)
        }
    }

    // MARK: - Google Connection

    private func connectGoogleAccount() {
        isLoading = true

        // Simulate Google sign-in
        // In production, integrate with GoogleSignIn SDK
        _Concurrency.Task {
            try? await _Concurrency.Task.sleep(nanoseconds: 2_000_000_000)

            await MainActor.run {
                // For demo purposes, just mark as connected
                state.isGoogleAccountConnected = true
                isLoading = false
            }
        }
    }
}

// MARK: - Benefit Row

private struct BenefitRow: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(.blue)
                .frame(width: 32)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)

                Text(description)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

// MARK: - Preview

#Preview("Not Connected") {
    OnboardingGoogleAccountView(state: OnboardingState())
}

#Preview("Connected") {
    OnboardingGoogleAccountView(state: {
        let state = OnboardingState()
        state.isGoogleAccountConnected = true
        return state
    }())
}
