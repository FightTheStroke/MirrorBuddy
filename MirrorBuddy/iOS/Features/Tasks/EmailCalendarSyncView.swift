//
//  EmailCalendarSyncView.swift
//  MirrorBuddy
//
//  Sheet for syncing Gmail and Google Calendar
//

import SwiftUI

struct EmailCalendarSyncView: View {
    @Environment(\.dismiss) private var dismiss
    let onSync: () async -> Void

    @State private var isSyncing = false
    @State private var syncComplete = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 32) {
                Spacer()

                // Icon
                Image(systemName: syncComplete ? "checkmark.circle.fill" : "envelope.arrow.triangle.branch")
                    .font(.system(size: 80))
                    .foregroundStyle(syncComplete ? .green : .blue)
                    .symbolEffect(.bounce, value: syncComplete)

                // Title and description
                VStack(spacing: 12) {
                    Text(syncComplete ? "Sincronizzazione completata!" : "Sincronizza Email e Calendar")
                        .font(.title2.bold())

                    Text(syncComplete ?
                            "Email e calendario sono stati sincronizzati con successo" :
                            "Controlla nuove email dai professori e eventi del calendario"
                    )
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
                }

                // Sync button
                if !syncComplete {
                    Button {
                        performSync()
                    } label: {
                        if isSyncing {
                            HStack {
                                ProgressView()
                                    .progressViewStyle(.circular)
                                    .tint(.white)
                                Text("Sincronizzazione...")
                            }
                        } else {
                            Text("Avvia Sincronizzazione")
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundStyle(.white)
                    .cornerRadius(12)
                    .padding(.horizontal, 32)
                    .disabled(isSyncing)
                }

                Spacer()

                // Info box
                VStack(alignment: .leading, spacing: 12) {
                    HStack(alignment: .top, spacing: 12) {
                        Image(systemName: "info.circle.fill")
                            .font(.title3)
                            .foregroundStyle(.blue)

                        VStack(alignment: .leading, spacing: 4) {
                            Text("Cosa viene sincronizzato:")
                                .font(.headline)

                            Text("• Email dai professori con compiti")
                            Text("• Eventi e scadenze del calendario")
                            Text("• Date di consegna compiti")
                        }
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    }
                }
                .padding()
                .background(Color.blue.opacity(0.1))
                .cornerRadius(12)
                .padding(.horizontal, 32)
            }
            .navigationTitle("Sincronizzazione")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(syncComplete ? "Fine" : "Annulla") {
                        dismiss()
                    }
                }
            }
        }
    }

    private func performSync() {
        isSyncing = true

        _Concurrency.Task {
            await onSync()

            await MainActor.run {
                isSyncing = false
                syncComplete = true

                // Auto-dismiss after 1.5 seconds
                _Concurrency.Task {
                    try? await _Concurrency.Task.sleep(nanoseconds: 1_500_000_000)
                    await MainActor.run {
                        dismiss()
                    }
                }
            }
        }
    }
}

#Preview {
    EmailCalendarSyncView {
        try? await _Concurrency.Task.sleep(nanoseconds: 2_000_000_000)
    }
}
