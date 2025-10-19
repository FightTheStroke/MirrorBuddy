import SwiftUI
import SwiftData

/// Goal settings view for configuring daily study goals (Task 137.4)
struct GoalSettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    let userProgress: UserProgress

    @State private var dailyGoalMinutes: Int = 60
    @State private var showingSaveConfirmation = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Obiettivo giornaliero")
                            .font(.headline)

                        HStack(spacing: 16) {
                            Image(systemName: "target")
                                .font(.system(size: 48))
                                .foregroundStyle(.blue)

                            VStack(alignment: .leading, spacing: 4) {
                                Text("\(dailyGoalMinutes) minuti")
                                    .font(.title2)
                                    .fontWeight(.bold)

                                Text("al giorno")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .padding(.vertical, 8)
                } header: {
                    Text("Obiettivo attuale")
                }

                Section {
                    Picker("Durata", selection: $dailyGoalMinutes) {
                        Text("15 minuti").tag(15)
                        Text("30 minuti").tag(30)
                        Text("45 minuti").tag(45)
                        Text("60 minuti").tag(60)
                        Text("90 minuti").tag(90)
                        Text("120 minuti").tag(120)
                    }
                    .pickerStyle(.inline)
                } header: {
                    Text("Seleziona durata")
                } footer: {
                    Text("Scegli quanto tempo vuoi dedicare allo studio ogni giorno. Un obiettivo realistico ti aiuterà a mantenere la costanza.")
                }

                Section {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Image(systemName: "lightbulb.fill")
                                .foregroundStyle(.yellow)
                            Text("Suggerimenti")
                                .font(.headline)
                        }

                        VStack(alignment: .leading, spacing: 8) {
                            BulletPoint(text: "Inizia con obiettivi piccoli e aumenta gradualmente")
                            BulletPoint(text: "La costanza è più importante della durata")
                            BulletPoint(text: "Studia sempre alla stessa ora per creare un'abitudine")
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
            .navigationTitle("Obiettivi di Studio")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Annulla") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Salva") {
                        saveGoal()
                    }
                }
            }
            .alert("Obiettivo salvato", isPresented: $showingSaveConfirmation) {
                Button("OK") {
                    dismiss()
                }
            } message: {
                Text("Il tuo nuovo obiettivo giornaliero è stato impostato a \(dailyGoalMinutes) minuti.")
            }
            .onAppear {
                dailyGoalMinutes = 60 // Default goal
            }
        }
    }

    private func saveGoal() {
        // Save goal to user preferences
        UserDefaults.standard.set(dailyGoalMinutes, forKey: "dailyGoalMinutes")
        showingSaveConfirmation = true
    }
}

// MARK: - BulletPoint

struct BulletPoint: View {
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Text("•")
                .foregroundStyle(.secondary)
            Text(text)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }
}

// MARK: - Preview

#Preview {
    let progress = UserProgress()
    return GoalSettingsView(userProgress: progress)
}
