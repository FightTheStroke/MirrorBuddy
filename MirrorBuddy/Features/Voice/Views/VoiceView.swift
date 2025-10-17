//
//  VoiceView.swift
//  MirrorBuddy
//
//  Task 109: Extracted from MainTabView for better code organization
//  Voice assistant tab with conversation launcher
//

import SwiftUI

/// Voice assistant view for starting conversations (Task 109)
struct VoiceView: View {
    @State private var showingConversation = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 40) {
                Spacer()

                Image(systemName: "waveform.circle")
                    .font(.system(size: 100))
                    .foregroundStyle(.blue)

                VStack(spacing: 8) {
                    Text("Assistente Vocale")
                        .font(.title2)
                        .fontWeight(.semibold)

                    Text("Parla con il tuo coach di studio personale")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }

                Button {
                    showingConversation = true
                } label: {
                    HStack {
                        Image(systemName: "mic.fill")
                        Text("Inizia Conversazione")
                    }
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(12)
                    .padding(.horizontal, 32)
                }

                Spacer()

                // Info box
                VStack(alignment: .leading, spacing: 12) {
                    HStack(alignment: .top, spacing: 12) {
                        Image(systemName: "info.circle.fill")
                            .font(.title3)
                            .foregroundStyle(.blue)

                        VStack(alignment: .leading, spacing: 4) {
                            Text("Cosa puoi fare:")
                                .font(.headline)

                            Text("• Chiedi aiuto con i compiti")
                            Text("• Fai domande sul materiale")
                            Text("• Chiedi spiegazioni semplici")
                            Text("• Parla in italiano naturalmente")
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
            .padding()
            .navigationTitle("Voice Coach")
            .sheet(isPresented: $showingConversation) {
                VoiceConversationView()
            }
        }
    }
}
