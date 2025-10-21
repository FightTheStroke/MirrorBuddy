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
    @Environment(\.localizationManager) private var localizationManager

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

                // MARK: - Coach Settings Section
                Section {
                    NavigationLink {
                        CoachPersonaSettingsView()
                    } label: {
                        HStack {
                            Image(systemName: "face.smiling")
                                .foregroundStyle(.blue)
                                .frame(width: 32)

                            VStack(alignment: .leading, spacing: 4) {
                                Text("Coach Personality")
                                    .font(.headline)
                                Text("Tone and teaching style")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                } header: {
                    Text("Coaching")
                } footer: {
                    Text("Customize how your AI coach communicates and teaches")
                }

                // MARK: - Weekly Digest Section
                Section {
                    NavigationLink {
                        WeeklyDigestSettingsView()
                    } label: {
                        HStack {
                            Image(systemName: "envelope.badge.fill")
                                .foregroundStyle(.green)
                                .frame(width: 32)

                            VStack(alignment: .leading, spacing: 4) {
                                Text("Weekly Digest")
                                    .font(.headline)
                                Text("Progress summaries for parents/teachers")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                } header: {
                    Text("Reporting")
                } footer: {
                    Text("Send weekly progress updates to parents or teachers")
                }

                // MARK: - Subjects Section
                Section {
                    NavigationLink {
                        SubjectSettingsView()
                    } label: {
                        HStack {
                            Image(systemName: "books.vertical.fill")
                                .foregroundStyle(.blue)
                                .frame(width: 32)

                            VStack(alignment: .leading, spacing: 4) {
                                Text("Subjects")
                                    .font(.headline)
                                Text("Manage your subjects")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                } header: {
                    Text("Learning")
                } footer: {
                    Text("Add custom subjects, reorder, or hide subjects you don't need")
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

                    // Language Selector (Task 82.1)
                    Picker(selection: Binding(
                        get: { localizationManager.currentLanguage },
                        set: { localizationManager.switchLanguage(to: $0) }
                    )) {
                        ForEach(LocalizationManager.Language.allCases) { language in
                            Text(language.displayName).tag(language)
                        }
                    } label: {
                        HStack {
                            Image(systemName: "globe")
                                .foregroundStyle(.blue)
                                .frame(width: 32)

                            VStack(alignment: .leading, spacing: 4) {
                                Text("Lingua")
                                    .font(.headline)
                                Text(localizationManager.currentLanguage.displayName)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                } header: {
                    Text("Accessibilità")
                } footer: {
                    Text("La lingua dell'app si aggiornerà immediatamente")
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
            authViewModel.checkAuthenticationStatus()
        }
    }
}

#Preview {
    SettingsView()
}
