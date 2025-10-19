import SwiftUI

/// Settings view for weekly digest preferences (Task 132.3)
struct WeeklyDigestSettingsView: View {
    @State private var settings: DigestSettings
    @State private var showingConsentSheet = false
    @State private var showingTestDigest = false
    @State private var testDigestResult: String?

    private let settingsKey = "WeeklyDigest.Settings"

    init() {
        // Load saved settings or use default
        if let data = UserDefaults.standard.data(forKey: "WeeklyDigest.Settings"),
           let saved = try? JSONDecoder().decode(DigestSettings.self, from: data) {
            _settings = State(initialValue: saved)
        } else {
            _settings = State(initialValue: .default)
        }
    }

    var body: some View {
        List {
            // MARK: - Opt-In Section
            Section {
                Toggle(isOn: $settings.isEnabled) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Enable Weekly Digest")
                            .font(.headline)
                        Text("Receive weekly progress summaries")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .onChange(of: settings.isEnabled) { _, newValue in
                    if newValue && !settings.hasConsent {
                        showingConsentSheet = true
                    }
                    saveSettings()
                }

                if settings.hasConsent {
                    HStack {
                        Image(systemName: "checkmark.shield.fill")
                            .foregroundStyle(.green)
                        Text("Consent provided")
                            .font(.caption)
                        Spacer()
                        if let date = settings.consentDate {
                            Text(date, style: .date)
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            } header: {
                Text("Digest Settings")
            } footer: {
                Text("Weekly digests provide supportive summaries of learning progress for parents and teachers.")
            }

            // MARK: - Delivery Method
            if settings.isEnabled {
                Section {
                    Picker("Delivery Method", selection: $settings.deliveryMethod) {
                        Text("None").tag(DeliveryMethod.none)
                        Text("Email Only").tag(DeliveryMethod.email)
                        Text("Voice Note Only").tag(DeliveryMethod.voiceNote)
                        Text("Both Email & Voice").tag(DeliveryMethod.both)
                    }
                    .onChange(of: settings.deliveryMethod) { _, _ in
                        saveSettings()
                    }

                    if settings.deliveryMethod == .email || settings.deliveryMethod == .both {
                        TextField("Recipient Email", text: $settings.recipientEmail)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                            .onChange(of: settings.recipientEmail) { _, _ in
                                saveSettings()
                            }
                    }

                    Picker("Recipient Type", selection: $settings.recipientType) {
                        Text("Parent").tag(RecipientType.parent)
                        Text("Teacher").tag(RecipientType.teacher)
                    }
                    .onChange(of: settings.recipientType) { _, _ in
                        saveSettings()
                    }
                } header: {
                    Text("Delivery Options")
                }

                // MARK: - Audio Settings
                if settings.deliveryMethod == .voiceNote || settings.deliveryMethod == .both {
                    Section {
                        Toggle("Include Audio Narration", isOn: $settings.includeAudio)
                            .onChange(of: settings.includeAudio) { _, _ in
                                saveSettings()
                            }
                    } header: {
                        Text("Audio Options")
                    } footer: {
                        Text("Generate voice narration of the weekly summary")
                    }
                }

                // MARK: - Privacy Settings
                Section {
                    Toggle("Apply Privacy Filters", isOn: $settings.applyPrivacyFilters)
                        .onChange(of: settings.applyPrivacyFilters) { _, _ in
                            saveSettings()
                        }

                    if settings.applyPrivacyFilters {
                        Picker("Privacy Level", selection: $settings.privacyLevel) {
                            Text("Minimal").tag(PrivacyLevel.minimal)
                            Text("Balanced").tag(PrivacyLevel.balanced)
                            Text("Strict").tag(PrivacyLevel.strict)
                        }
                        .onChange(of: settings.privacyLevel) { _, _ in
                            saveSettings()
                        }

                        Toggle("Exclude Support Section", isOn: $settings.excludeSupportSection)
                            .onChange(of: settings.excludeSupportSection) { _, _ in
                                saveSettings()
                            }
                    }
                } header: {
                    Text("Privacy")
                } footer: {
                    Text("Control what information is included in digests. Higher privacy levels filter sensitive details.")
                }

                // MARK: - Schedule Settings
                Section {
                    Picker("Frequency", selection: $settings.frequency) {
                        Text("Weekly").tag(DigestFrequency.weekly)
                        Text("Bi-weekly").tag(DigestFrequency.biweekly)
                        Text("Monthly").tag(DigestFrequency.monthly)
                    }
                    .onChange(of: settings.frequency) { _, _ in
                        saveSettings()
                    }

                    Picker("Preferred Day", selection: $settings.preferredDay) {
                        ForEach(0..<7) { day in
                            Text(dayName(for: day)).tag(day)
                        }
                    }
                    .onChange(of: settings.preferredDay) { _, _ in
                        saveSettings()
                    }

                    Picker("Preferred Time", selection: $settings.preferredHour) {
                        ForEach(0..<24) { hour in
                            Text(hourName(for: hour)).tag(hour)
                        }
                    }
                    .onChange(of: settings.preferredHour) { _, _ in
                        saveSettings()
                    }
                } header: {
                    Text("Schedule")
                } footer: {
                    Text("Choose when to receive weekly digests")
                }

                // MARK: - Test & Preview
                Section {
                    Button {
                        showingTestDigest = true
                    } label: {
                        HStack {
                            Image(systemName: "envelope.badge.fill")
                                .foregroundStyle(.blue)
                            Text("Send Test Digest")
                            Spacer()
                        }
                    }
                    .disabled(settings.recipientEmail.isEmpty && settings.deliveryMethod != .voiceNote)

                    if let result = testDigestResult {
                        Text(result)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                } header: {
                    Text("Testing")
                } footer: {
                    Text("Send a test digest to verify your settings")
                }

                // MARK: - Opt-Out
                Section {
                    Button(role: .destructive) {
                        settings.isEnabled = false
                        settings.hasConsent = false
                        settings.consentDate = nil
                        saveSettings()
                    } label: {
                        HStack {
                            Image(systemName: "xmark.circle.fill")
                            Text("Disable & Revoke Consent")
                            Spacer()
                        }
                    }
                } footer: {
                    Text("You can re-enable digests at any time")
                }
            }
        }
        .navigationTitle("Weekly Digest")
        .sheet(isPresented: $showingConsentSheet) {
            ConsentSheet(settings: $settings) {
                saveSettings()
            }
        }
        .alert("Test Digest", isPresented: $showingTestDigest) {
            Button("Cancel", role: .cancel) {}
            Button("Send") {
                sendTestDigest()
            }
        } message: {
            Text("Send a test digest to \(settings.recipientEmail)?")
        }
    }

    // MARK: - Helper Methods

    private func saveSettings() {
        if let data = try? JSONEncoder().encode(settings) {
            UserDefaults.standard.set(data, forKey: settingsKey)
        }
    }

    private func sendTestDigest() {
        // This would trigger actual test digest generation
        testDigestResult = "Test digest sent to \(settings.recipientEmail)"

        // Clear message after 5 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
            testDigestResult = nil
        }
    }

    private func dayName(for day: Int) -> String {
        let formatter = DateFormatter()
        formatter.weekdaySymbols = Calendar.current.weekdaySymbols
        return formatter.weekdaySymbols[day]
    }

    private func hourName(for hour: Int) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:00 a"
        let date = Calendar.current.date(bySettingHour: hour, minute: 0, second: 0, of: Date()) ?? Date()
        return formatter.string(from: date)
    }
}

// MARK: - Consent Sheet

struct ConsentSheet: View {
    @Binding var settings: DigestSettings
    let onConsent: () -> Void

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Header
                    VStack(alignment: .leading, spacing: 8) {
                        Image(systemName: "shield.checkered")
                            .font(.system(size: 50))
                            .foregroundStyle(.blue)

                        Text("Weekly Digest Consent")
                            .font(.title.bold())

                        Text("Please review and agree to the following:")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.bottom)

                    // Consent Points
                    ConsentPoint(
                        icon: "envelope.fill",
                        title: "Progress Information",
                        description: "Weekly summaries will include XP gains, study time, streak status, and subject performance."
                    )

                    ConsentPoint(
                        icon: "lock.shield.fill",
                        title: "Privacy Protection",
                        description: "All data is handled according to our privacy policy. You control the level of detail shared."
                    )

                    ConsentPoint(
                        icon: "person.2.fill",
                        title: "Recipient Access",
                        description: "Digests will be sent to the email address you provide. You can change or revoke this at any time."
                    )

                    ConsentPoint(
                        icon: "xmark.circle.fill",
                        title: "Opt-Out Anytime",
                        description: "You can disable digests and revoke consent at any time from settings."
                    )

                    // Agreement
                    VStack(spacing: 16) {
                        Divider()

                        Button {
                            settings.hasConsent = true
                            settings.consentDate = Date()
                            onConsent()
                            dismiss()
                        } label: {
                            Text("I Agree")
                                .font(.headline)
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.blue)
                                .cornerRadius(10)
                        }

                        Button {
                            settings.isEnabled = false
                            dismiss()
                        } label: {
                            Text("Cancel")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                .padding()
            }
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

// MARK: - Consent Point

struct ConsentPoint: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(.blue)
                .frame(width: 30)

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

#Preview {
    NavigationStack {
        WeeklyDigestSettingsView()
    }
}
