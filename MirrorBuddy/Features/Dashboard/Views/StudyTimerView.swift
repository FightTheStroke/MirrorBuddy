import SwiftData
import SwiftUI

struct StudyTimerView: View {
    @Environment(\.modelContext) private var modelContext
    @StateObject private var timer = StudyTimerService.shared

    @State private var selectedSubject: String?
    @State private var showingSubjectPicker = false
    @State private var showAlert = false
    @State private var alertMessage = ""

    var body: some View {
        ScrollView {
            VStack(spacing: 30) {
                // Timer Display
                VStack(spacing: 16) {
                    Text(timer.formattedTime)
                        .font(.system(size: 72, weight: .bold, design: .monospaced))
                        .foregroundColor(timer.isRunning && !timer.isPaused ? .blue : .secondary)
                        .animation(.easeInOut, value: timer.isRunning)

                    // Subject Label
                    if let subject = timer.currentSubject {
                        HStack {
                            Image(systemName: "book.fill")
                                .foregroundColor(.blue)
                            Text("Studying \(subject)")
                                .font(.title3)
                                .foregroundColor(.secondary)
                        }
                    }

                    // Status indicator
                    if timer.isPaused {
                        HStack {
                            Image(systemName: "pause.circle.fill")
                                .foregroundColor(.orange)
                            Text("Paused")
                                .font(.subheadline)
                                .foregroundColor(.orange)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.orange.opacity(0.1))
                        .cornerRadius(20)
                    }
                }
                .padding()

                // Control Buttons
                VStack(spacing: 16) {
                    if !timer.isRunning && timer.elapsedSeconds == 0 {
                        // Start Button
                        Button {
                            showingSubjectPicker = true
                        } label: {
                            Label("Start Study Session", systemImage: "play.fill")
                                .font(.title3.bold())
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.green)
                                .foregroundColor(.white)
                                .cornerRadius(12)
                        }
                    } else if timer.isRunning {
                        HStack(spacing: 16) {
                            if timer.isPaused {
                                // Resume Button
                                Button {
                                    timer.resumeSession()
                                } label: {
                                    Label("Resume", systemImage: "play.fill")
                                        .font(.title3.bold())
                                        .frame(maxWidth: .infinity)
                                        .padding()
                                        .background(Color.blue)
                                        .foregroundColor(.white)
                                        .cornerRadius(12)
                                }
                            } else {
                                // Pause Button
                                Button {
                                    timer.pauseSession()
                                } label: {
                                    Label("Pause", systemImage: "pause.fill")
                                        .font(.title3.bold())
                                        .frame(maxWidth: .infinity)
                                        .padding()
                                        .background(Color.orange)
                                        .foregroundColor(.white)
                                        .cornerRadius(12)
                                }
                            }

                            // End Button
                            Button {
                                endSession()
                            } label: {
                                Label("End", systemImage: "stop.fill")
                                    .font(.title3.bold())
                                    .frame(maxWidth: .infinity)
                                    .padding()
                                    .background(Color.red)
                                    .foregroundColor(.white)
                                    .cornerRadius(12)
                            }
                        }
                    }
                }
                .padding(.horizontal)

                Divider()
                    .padding(.vertical)

                // Study Statistics
                StudyStatisticsView()
            }
            .padding()
        }
        .navigationTitle("Study Timer")
        .sheet(isPresented: $showingSubjectPicker) {
            SubjectPickerView(selectedSubject: $selectedSubject) {
                timer.startSession(subject: selectedSubject)
            }
        }
        .alert("Session Ended", isPresented: $showAlert) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(alertMessage)
        }
    }

    private func endSession() {
        do {
            let session = try timer.endSession(modelContext: modelContext)
            alertMessage = "Study session completed!\n\(session.durationMinutes) minutes\n+\(session.xpEarned) XP earned"
            showAlert = true
        } catch {
            alertMessage = "Error ending session: \(error.localizedDescription)"
            showAlert = true
        }
    }
}

struct SubjectPickerView: View {
    @Binding var selectedSubject: String?
    let onStart: () -> Void

    @Environment(\.dismiss) private var dismiss

    let subjects = ["Math", "Italian", "History", "Physics", "English", "Other"]

    var body: some View {
        NavigationView {
            List(subjects, id: \.self) { subject in
                Button {
                    selectedSubject = subject
                    onStart()
                    dismiss()
                } label: {
                    HStack {
                        Text(subject)
                            .foregroundColor(.primary)
                        Spacer()
                        if selectedSubject == subject {
                            Image(systemName: "checkmark")
                                .foregroundColor(.blue)
                        }
                    }
                }
            }
            .navigationTitle("Select Subject")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Skip") {
                        onStart()
                        dismiss()
                    }
                }
            }
        }
    }
}

#Preview {
    NavigationStack {
        StudyTimerView()
            .modelContainer(for: [StudySession.self, UserProgress.self])
    }
}
