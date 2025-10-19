import SwiftUI
import SwiftData

/// Guardian consent and privacy controls UI
struct GuardianConsentSettingsView: View {

    @Environment(\.modelContext) private var modelContext
    @Query private var consents: [GuardianConsent]

    @State private var showPINEntry = false
    @State private var enteredPIN = ""
    @State private var isUnlocked = false

    private var consent: GuardianConsent {
        consents.first ?? GuardianConsent()
    }

    var body: some View {
        if isUnlocked {
            consentToggles
        } else {
            pinEntryView
        }
    }

    private var pinEntryView: some View {
        VStack(spacing: 20) {
            Image(systemName: "lock.shield")
                .font(.system(size: 60))
                .foregroundColor(.blue)

            Text("Guardian Controls")
                .font(.title2.bold())

            Text("Enter PIN to access privacy settings")
                .font(.subheadline)
                .foregroundColor(.secondary)

            SecureField("Enter PIN", text: $enteredPIN)
                .textFieldStyle(.roundedBorder)
                .keyboardType(.numberPad)
                .frame(maxWidth: 200)

            Button("Unlock") {
                verifyPIN()
            }
            .buttonStyle(.borderedProminent)
            .disabled(enteredPIN.count < 4)
        }
        .padding()
    }

    private var consentToggles: some View {
        Form {
            Section("Recording & Data Collection") {
                Toggle("Allow Lesson Recording", isOn: Binding(
                    get: { consent.allowRecording },
                    set: { consent.allowRecording = $0; saveChanges() }
                ))

                Toggle("Allow Data Export", isOn: Binding(
                    get: { consent.allowExport },
                    set: { consent.allowExport = $0; saveChanges() }
                ))

                Toggle("Allow Analytics", isOn: Binding(
                    get: { consent.allowAnalytics },
                    set: { consent.allowAnalytics = $0; saveChanges() }
                ))
            }

            Section("Sharing & Personalization") {
                Toggle("Allow Third-Party Sharing", isOn: Binding(
                    get: { consent.allowThirdPartySharing },
                    set: { consent.allowThirdPartySharing = $0; saveChanges() }
                ))

                Toggle("Allow Persona Adjustment", isOn: Binding(
                    get: { consent.allowPersonaAdjustment },
                    set: { consent.allowPersonaAdjustment = $0; saveChanges() }
                ))
            }

            Section {
                Button("Lock Settings") {
                    isUnlocked = false
                    enteredPIN = ""
                }
            }
        }
        .navigationTitle("Guardian Controls")
    }

    private func verifyPIN() {
        if consent.verifyPIN(enteredPIN) {
            isUnlocked = true
        }
    }

    private func saveChanges() {
        consent.lastUpdated = Date()
        try? modelContext.save()
    }
}
