import Charts
import SwiftData
import SwiftUI

struct StudyInsightsView: View {
    @Query(sort: \StudySession.date, order: .reverse)
    private var sessions: [StudySession]

    @Query private var userProgress: [UserProgress]

    private var last7Days: [DailyStudyData] {
        var data: [DailyStudyData] = []
        let calendar = Calendar.current

        for i in 0..<7 {
            let date = calendar.date(byAdding: .day, value: -i, to: Date())!
            let startOfDay = calendar.startOfDay(for: date)
            let daySessions = sessions.filter { session in
                calendar.isDate(session.date, inSameDayAs: date)
            }
            let totalMinutes = daySessions.reduce(0) { $0 + $1.durationMinutes }

            data.append(DailyStudyData(
                date: startOfDay,
                minutes: totalMinutes,
                sessionCount: daySessions.count
            ))
        }

        return data.reversed()
    }

    private var subjectData: [(String, Int)] {
        let grouped = Dictionary(grouping: sessions) { $0.subject ?? "Unknown" }
        return grouped.map { subject, sessions in
            let totalMinutes = sessions.reduce(0) { $0 + $1.durationMinutes }
            return (subject, totalMinutes)
        }.sorted { $0.1 > $1.1 }
    }

    private var totalStudyTime: Int {
        userProgress.first?.totalStudyTimeMinutes ?? 0
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Overview Stats
                VStack(spacing: 12) {
                    Text("Total Study Time")
                        .font(.headline)

                    Text(formatMinutes(totalStudyTime))
                        .font(.system(size: 48, weight: .bold))
                        .foregroundColor(.blue)

                    if let progress = userProgress.first {
                        HStack(spacing: 20) {
                            VStack {
                                Text("\(progress.level)")
                                    .font(.title.bold())
                                Text("Level")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }

                            Divider()
                                .frame(height: 40)

                            VStack {
                                Text("\(progress.totalXP)")
                                    .font(.title.bold())
                                    .foregroundColor(.green)
                                Text("Total XP")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }

                            Divider()
                                .frame(height: 40)

                            VStack {
                                Text("\(progress.currentStreak)")
                                    .font(.title.bold())
                                    .foregroundColor(.orange)
                                Text("Day Streak")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                    }
                }
                .padding()
                .background(Color.white)
                .cornerRadius(16)
                .shadow(color: .black.opacity(0.05), radius: 5, x: 0, y: 2)

                // Weekly Chart
                VStack(alignment: .leading, spacing: 16) {
                    Text("Last 7 Days")
                        .font(.headline)

                    Chart(last7Days) { data in
                        BarMark(
                            x: .value("Day", data.date, unit: .day),
                            y: .value("Minutes", data.minutes)
                        )
                        .foregroundStyle(Color.blue.gradient)
                        .cornerRadius(6)
                    }
                    .frame(height: 200)
                    .chartYAxis {
                        AxisMarks(position: .leading) { value in
                            AxisValueLabel {
                                if let minutes = value.as(Int.self) {
                                    Text("\(minutes)m")
                                }
                            }
                        }
                    }
                    .chartXAxis {
                        AxisMarks(values: .stride(by: .day)) { _ in
                            AxisValueLabel(format: .dateTime.weekday(.abbreviated))
                        }
                    }
                }
                .padding()
                .background(Color.white)
                .cornerRadius(16)
                .shadow(color: .black.opacity(0.05), radius: 5, x: 0, y: 2)

                // Subject Breakdown
                SubjectBreakdownView(subjectData: subjectData)

                // Session History
                VStack(alignment: .leading, spacing: 16) {
                    Text("Session History")
                        .font(.headline)

                    if sessions.isEmpty {
                        Text("No study sessions yet")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .frame(maxWidth: .infinity, alignment: .center)
                            .padding(.vertical, 40)
                    } else {
                        ForEach(sessions.prefix(10)) { session in
                            SessionHistoryRow(session: session)
                        }
                    }
                }
                .padding()
                .background(Color.white)
                .cornerRadius(16)
                .shadow(color: .black.opacity(0.05), radius: 5, x: 0, y: 2)
            }
            .padding()
        }
        .background(Color(.systemGray6))
        .navigationTitle("Study Insights")
        .navigationBarTitleDisplayMode(.large)
    }

    private func formatMinutes(_ minutes: Int) -> String {
        let hours = minutes / 60
        let mins = minutes % 60

        if hours > 0 {
            return "\(hours)h \(mins)m"
        } else {
            return "\(mins)m"
        }
    }
}

struct DailyStudyData: Identifiable {
    let id = UUID()
    let date: Date
    let minutes: Int
    let sessionCount: Int
}

struct SubjectBreakdownView: View {
    let subjectData: [(String, Int)]

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Study Time by Subject")
                .font(.headline)

            if subjectData.isEmpty {
                Text("No subject data yet")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 40)
            } else {
                ForEach(subjectData, id: \.0) { subject, minutes in
                    HStack {
                        Circle()
                            .fill(colorForSubject(subject))
                            .frame(width: 12, height: 12)

                        Text(subject)
                            .font(.subheadline)

                        Spacer()

                        Text(formatMinutes(minutes))
                            .font(.subheadline.bold())
                            .foregroundColor(.blue)
                    }
                    .padding(.vertical, 8)
                }
            }
        }
        .padding()
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 5, x: 0, y: 2)
    }

    private func formatMinutes(_ minutes: Int) -> String {
        let hours = minutes / 60
        let mins = minutes % 60

        if hours > 0 {
            return "\(hours)h \(mins)m"
        } else {
            return "\(mins)m"
        }
    }

    private func colorForSubject(_ subject: String) -> Color {
        switch subject.lowercased() {
        case "math": return .blue
        case "italian": return .green
        case "history": return .orange
        case "physics": return .purple
        case "english": return .red
        default: return .gray
        }
    }
}

struct SessionHistoryRow: View {
    let session: StudySession

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                if let subject = session.subject {
                    Text(subject)
                        .font(.subheadline.bold())
                } else {
                    Text("Study Session")
                        .font(.subheadline.bold())
                }

                Text(session.date.formatted(date: .abbreviated, time: .shortened))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                HStack(spacing: 4) {
                    Image(systemName: "clock.fill")
                        .font(.caption)
                    Text("\(session.durationMinutes)m")
                        .font(.subheadline.bold())
                }
                .foregroundColor(.blue)

                if session.xpEarned > 0 {
                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .font(.caption)
                        Text("\(session.xpEarned) XP")
                            .font(.caption)
                    }
                    .foregroundColor(.green)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

#Preview {
    NavigationStack {
        StudyInsightsView()
            .modelContainer(for: [StudySession.self, UserProgress.self])
    }
}
