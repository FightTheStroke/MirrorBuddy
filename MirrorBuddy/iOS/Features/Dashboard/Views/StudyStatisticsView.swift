import SwiftData
import SwiftUI

struct StudyStatisticsView: View {
    @Query(sort: \StudySession.date, order: .reverse)
    private var sessions: [StudySession]

    @Query private var userProgress: [UserProgress]

    private var todaySessions: [StudySession] {
        let today = Calendar.current.startOfDay(for: Date())
        return sessions.filter { session in
            Calendar.current.isDate(session.date, inSameDayAs: today)
        }
    }

    private var weekSessions: [StudySession] {
        let weekAgo = Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date()
        return sessions.filter { $0.date >= weekAgo }
    }

    private var totalMinutesToday: Int {
        todaySessions.reduce(0) { $0 + $1.durationMinutes }
    }

    private var totalMinutesWeek: Int {
        weekSessions.reduce(0) { $0 + $1.durationMinutes }
    }

    private var currentStreak: Int {
        userProgress.first?.currentStreak ?? 0
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Study Statistics")
                .font(.headline)

            VStack(spacing: 12) {
                HStack(spacing: 12) {
                    StudyStatCard(
                        title: "Today",
                        value: formatMinutes(totalMinutesToday),
                        subtitle: "\(todaySessions.count) sessions",
                        icon: "calendar",
                        color: .blue
                    )

                    StudyStatCard(
                        title: "This Week",
                        value: formatMinutes(totalMinutesWeek),
                        subtitle: "\(weekSessions.count) sessions",
                        icon: "chart.bar.fill",
                        color: .green
                    )
                }

                if currentStreak > 0 {
                    StudyStatCard(
                        title: "Current Streak",
                        value: "\(currentStreak)",
                        subtitle: currentStreak == 1 ? "day" : "days",
                        icon: "flame.fill",
                        color: .orange,
                        fullWidth: true
                    )
                }
            }

            // Recent Sessions
            if !sessions.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Recent Sessions")
                        .font(.subheadline.bold())
                        .foregroundColor(.secondary)
                        .padding(.top, 8)

                    ForEach(sessions.prefix(3)) { session in
                        RecentSessionRow(session: session)
                    }

                    NavigationLink {
                        StudyInsightsView()
                    } label: {
                        HStack {
                            Text("View All Sessions")
                                .font(.subheadline)
                            Spacer()
                            Image(systemName: "chevron.right")
                        }
                        .foregroundColor(.blue)
                        .padding(.top, 4)
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
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

struct StudyStatCard: View {
    let title: String
    let value: String
    let subtitle: String
    let icon: String
    let color: Color
    var fullWidth: Bool = false

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
                .frame(width: 40, height: 40)
                .background(color.opacity(0.1))
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text(value)
                    .font(.title2.bold())
                Text(subtitle)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }

            if !fullWidth {
                Spacer()
            }
        }
        .frame(maxWidth: fullWidth ? .infinity : nil)
        .padding()
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
    }
}

struct RecentSessionRow: View {
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

                Text(session.date, style: .relative)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Text("\(session.durationMinutes)m")
                    .font(.subheadline.bold())
                    .foregroundColor(.blue)

                if session.xpEarned > 0 {
                    Text("+\(session.xpEarned) XP")
                        .font(.caption)
                        .foregroundColor(.green)
                }
            }
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background(Color.white)
        .cornerRadius(8)
    }
}

#Preview {
    StudyStatisticsView()
        .modelContainer(for: [StudySession.self, UserProgress.self])
}
