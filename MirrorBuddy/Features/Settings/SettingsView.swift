//
//  SettingsView.swift
//  MirrorBuddy
//
//  Settings main view with Google Drive integration
//

import SwiftUI

struct SettingsView: View {
    @State private var showingGoogleDriveAuth = false
    @State private var showingOAuthConfig = false
    @StateObject private var authViewModel = GoogleDriveAuthViewModel()

    var body: some View {
        NavigationStack {
            List {
                // MARK: - Google Drive Section
                Section {
                    Button {
                        showingGoogleDriveAuth = true
                    } label: {
                        HStack {
                            Image(systemName: "cloud.fill")
                                .foregroundStyle(.blue)
                                .frame(width: 32)

                            VStack(alignment: .leading, spacing: 4) {
                                Text("Google Drive")
                                    .font(.headline)

                                if authViewModel.isAuthenticated {
                                    if let email = authViewModel.userEmail {
                                        Text(email)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                } else {
                                    Text("Non connesso")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }

                            Spacer()

                            if authViewModel.isAuthenticated {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(.green)
                            } else {
                                Image(systemName: "chevron.right")
                                    .font(.caption)
                                    .foregroundStyle(.tertiary)
                            }
                        }
                    }

                    // Google OAuth Configuration
                    NavigationLink {
                        GoogleOAuthConfigView()
                    } label: {
                        HStack {
                            Image(systemName: "key.fill")
                                .foregroundStyle(.orange)
                                .frame(width: 32)

                            VStack(alignment: .leading, spacing: 4) {
                                Text("OAuth Credentials")
                                    .font(.headline)
                                Text("Configure Google Cloud credentials")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                } header: {
                    Text("Integrazione")
                } footer: {
                    Text("Connetti il tuo account Google Drive per importare materiali di studio")
                }

                // MARK: - Accessibility Section
                Section {
                    NavigationLink {
                        DyslexiaSettingsView()
                    } label: {
                        HStack {
                            Image(systemName: "textformat")
                                .foregroundStyle(.purple)
                                .frame(width: 32)

                            VStack(alignment: .leading, spacing: 4) {
                                Text("Dislessia")
                                    .font(.headline)
                                Text("Font e spaziatura")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                } header: {
                    Text("Accessibilità")
                }

                // MARK: - App Info Section
                Section {
                    HStack {
                        Text("Versione")
                        Spacer()
                        Text(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0")
                            .foregroundStyle(.secondary)
                    }

                    HStack {
                        Text("Build")
                        Spacer()
                        Text(Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1")
                            .foregroundStyle(.secondary)
                    }
                } header: {
                    Text("Informazioni")
                }
            }
            .navigationTitle("Impostazioni")
            .sheet(isPresented: $showingGoogleDriveAuth) {
                GoogleDriveAuthView()
            }
        }
        .onAppear {
            // Check authentication status
            _Concurrency.Task {
                await authViewModel.checkAuthenticationStatus()
            }
        }
    }
}

#Preview {
    SettingsView()
}
