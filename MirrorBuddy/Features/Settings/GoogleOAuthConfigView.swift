//
//  GoogleOAuthConfigView.swift
//  MirrorBuddy
//
//  Configuration view for Google OAuth credentials
//

import SwiftUI

struct GoogleOAuthConfigView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var clientID = ""
    @State private var clientSecret = ""
    @State private var isLoading = true
    @State private var isSaving = false
    @State private var showError = false
    @State private var errorMessage = ""
    @State private var showSuccess = false

    var body: some View {
        Form {
            Section {
                Text("Per utilizzare Google Drive, devi configurare le credenziali OAuth 2.0 da Google Cloud Console.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Link(destination: URL(string: "https://console.cloud.google.com/apis/credentials")!) {
                        HStack {
                            Image(systemName: "link")
                            Text("Apri Google Cloud Console")
                            Spacer()
                            Image(systemName: "arrow.up.right")
                                .font(.caption)
                        }
                    }
                }
            } header: {
                Text("Setup Guida")
            }

            Section {
                VStack(alignment: .leading, spacing: 12) {
                    InstructionStep(
                        number: "1",
                        text: "Crea un progetto in Google Cloud Console"
                    )
                    InstructionStep(
                        number: "2",
                        text: "Abilita Google Drive API"
                    )
                    InstructionStep(
                        number: "3",
                        text: "Crea credenziali OAuth 2.0 (tipo: iOS app)"
                    )
                    InstructionStep(
                        number: "4",
                        text: "Copia Client ID e Client Secret qui sotto"
                    )
                }
                .padding(.vertical, 4)
            } header: {
                Text("Istruzioni")
            }

            Section {
                TextField("Client ID", text: $clientID)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .font(.system(.body, design: .monospaced))

                SecureField("Client Secret (opzionale)", text: $clientSecret)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .font(.system(.body, design: .monospaced))
            } header: {
                Text("Credenziali OAuth")
            } footer: {
                Text("Il Client Secret è opzionale per le app iOS. Alcuni setup potrebbero non richiederlo.")
            }

            Section {
                Button {
                    saveCredentials()
                } label: {
                    if isSaving {
                        HStack {
                            ProgressView()
                                .progressViewStyle(.circular)
                            Text("Salvataggio...")
                        }
                    } else {
                        Text("Salva Credenziali")
                    }
                }
                .frame(maxWidth: .infinity)
                .disabled(clientID.isEmpty || isSaving)
            }
        }
        .navigationTitle("OAuth Credentials")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Errore", isPresented: $showError) {
            Button("OK") {
                showError = false
            }
        } message: {
            Text(errorMessage)
        }
        .alert("Successo", isPresented: $showSuccess) {
            Button("OK") {
                dismiss()
            }
        } message: {
            Text("Credenziali salvate con successo. Ora puoi connettere Google Drive.")
        }
        .task {
            await loadExistingCredentials()
        }
    }

    private func loadExistingCredentials() async {
        defer { isLoading = false }

        do {
            let keychain = KeychainManager.shared
            let (existingClientID, existingClientSecret) = try keychain.getGoogleClientCredentials()

            await MainActor.run {
                if let id = existingClientID {
                    clientID = id
                }
                if let secret = existingClientSecret {
                    clientSecret = secret
                }
            }
        } catch {
            // No existing credentials - that's fine
        }
    }

    private func saveCredentials() {
        guard !clientID.isEmpty else { return }

        isSaving = true

        _Concurrency.Task {
            do {
                let keychain = KeychainManager.shared
                try keychain.saveGoogleClientCredentials(
                    clientID: clientID,
                    clientSecret: clientSecret.isEmpty ? "" : clientSecret
                )

                await MainActor.run {
                    isSaving = false
                    showSuccess = true
                }
            } catch {
                await MainActor.run {
                    isSaving = false
                    errorMessage = "Errore nel salvataggio: \(error.localizedDescription)"
                    showError = true
                }
            }
        }
    }
}

// MARK: - Instruction Step
struct InstructionStep: View {
    let number: String
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color.blue.opacity(0.2))
                    .frame(width: 28, height: 28)

                Text(number)
                    .font(.caption.bold())
                    .foregroundStyle(.blue)
            }

            Text(text)
                .font(.subheadline)
                .fixedSize(horizontal: false, vertical: true)

            Spacer(minLength: 0)
        }
    }
}

#Preview {
    NavigationStack {
        GoogleOAuthConfigView()
    }
}
