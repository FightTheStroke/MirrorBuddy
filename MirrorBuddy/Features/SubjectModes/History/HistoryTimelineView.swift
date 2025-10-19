import SwiftUI

/// Interactive timeline visualization for historical events
struct HistoryTimelineView: View {
    let timeline: Timeline
    @State private var selectedEvent: HistoricalEvent?
    @State private var scrollOffset: CGFloat = 0
    @State private var scale: CGFloat = 1.0

    private let eventHeight: CGFloat = 80
    private let timelineWidth: CGFloat = 4

    var body: some View {
        VStack(spacing: 0) {
            // Header
            TimelineHeaderView(timeline: timeline)

            // Timeline content
            ScrollView {
                GeometryReader { geometry in
                    ZStack(alignment: .top) {
                        // Timeline axis
                        Rectangle()
                            .fill(Color.blue.opacity(0.3))
                            .frame(width: timelineWidth)
                            .frame(maxHeight: .infinity)
                            .padding(.leading, geometry.size.width / 2)

                        // Events
                        VStack(spacing: 40) {
                            ForEach(sortedEvents) { event in
                                TimelineEventRow(
                                    event: event,
                                    isSelected: selectedEvent?.id == event.id,
                                    onTap: { selectedEvent = event }
                                )
                                .transition(.asymmetric(
                                    insertion: .scale.combined(with: .opacity),
                                    removal: .opacity
                                ))
                            }
                        }
                        .padding(.vertical, 20)
                    }
                }
                .frame(minHeight: CGFloat(timeline.events.count) * (eventHeight + 40))
            }
        }
        .sheet(item: $selectedEvent) { event in
            EventDetailSheet(event: event)
        }
    }

    private var sortedEvents: [HistoricalEvent] {
        timeline.events.sorted { $0.year < $1.year }
    }
}

// MARK: - Timeline Header

struct TimelineHeaderView: View {
    let timeline: Timeline

    var body: some View {
        VStack(spacing: 8) {
            Text(timeline.topic)
                .font(.title2)
                .fontWeight(.bold)

            HStack {
                Text("\(timeline.startYear)")
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                Image(systemName: "arrow.right")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Text("\(timeline.endYear)")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            Text("\(timeline.events.count) events")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.systemBackground))
    }
}

// MARK: - Timeline Event Row

struct TimelineEventRow: View {
    let event: HistoricalEvent
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        GeometryReader { geometry in
            HStack(spacing: 16) {
                // Left side (odd events) or spacer (even events)
                if shouldPlaceLeft(geometry: geometry) {
                    EventCard(event: event, isSelected: isSelected)
                        .frame(width: cardWidth(geometry: geometry))
                } else {
                    Spacer()
                        .frame(width: cardWidth(geometry: geometry))
                }

                // Timeline dot
                TimelineDot(event: event, isSelected: isSelected)

                // Right side (even events) or spacer (odd events)
                if !shouldPlaceLeft(geometry: geometry) {
                    EventCard(event: event, isSelected: isSelected)
                        .frame(width: cardWidth(geometry: geometry))
                } else {
                    Spacer()
                        .frame(width: cardWidth(geometry: geometry))
                }
            }
        }
        .frame(height: 80)
        .onTapGesture(perform: onTap)
    }

    private func shouldPlaceLeft(geometry: GeometryProxy) -> Bool {
        // Alternate left and right based on event index
        let index = event.year
        return index % 2 == 0
    }

    private func cardWidth(geometry: GeometryProxy) -> CGFloat {
        (geometry.size.width - 40) / 2
    }
}

// MARK: - Event Card

struct EventCard: View {
    let event: HistoricalEvent
    let isSelected: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text("\(event.year)")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(categoryColor)
                    .cornerRadius(4)

                Spacer()

                Image(systemName: categoryIcon)
                    .font(.caption)
                    .foregroundColor(categoryColor)
            }

            Text(event.title)
                .font(.subheadline)
                .fontWeight(.semibold)
                .lineLimit(2)

            Text(event.description)
                .font(.caption)
                .foregroundColor(.secondary)
                .lineLimit(2)
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.systemBackground))
                .shadow(color: isSelected ? categoryColor.opacity(0.4) : .black.opacity(0.1),
                       radius: isSelected ? 8 : 4,
                       x: 0,
                       y: 2)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isSelected ? categoryColor : Color.clear, lineWidth: 2)
        )
    }

    private var categoryColor: Color {
        switch event.category {
        case .political: return .blue
        case .military: return .red
        case .cultural: return .purple
        case .economic: return .green
        case .social: return .orange
        case .technological: return .cyan
        }
    }

    private var categoryIcon: String {
        switch event.category {
        case .political: return "building.columns"
        case .military: return "shield"
        case .cultural: return "paintpalette"
        case .economic: return "dollarsign.circle"
        case .social: return "person.3"
        case .technological: return "gear"
        }
    }
}

// MARK: - Timeline Dot

struct TimelineDot: View {
    let event: HistoricalEvent
    let isSelected: Bool

    var body: some View {
        ZStack {
            Circle()
                .fill(categoryColor)
                .frame(width: isSelected ? 24 : 16, height: isSelected ? 24 : 16)

            if isSelected {
                Circle()
                    .stroke(categoryColor, lineWidth: 2)
                    .frame(width: 32, height: 32)
            }
        }
        .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isSelected)
    }

    private var categoryColor: Color {
        switch event.category {
        case .political: return .blue
        case .military: return .red
        case .cultural: return .purple
        case .economic: return .green
        case .social: return .orange
        case .technological: return .cyan
        }
    }
}

// MARK: - Event Detail Sheet

struct EventDetailSheet: View {
    let event: HistoricalEvent
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Year and Category
                    HStack {
                        Text("\(event.year)")
                            .font(.title2)
                            .fontWeight(.bold)

                        Spacer()

                        Text(event.category.rawValue.capitalized)
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(.white)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(categoryColor)
                            .cornerRadius(8)
                    }

                    Divider()

                    // Title
                    Text(event.title)
                        .font(.title3)
                        .fontWeight(.semibold)

                    // Date
                    HStack {
                        Image(systemName: "calendar")
                            .foregroundColor(.secondary)
                        Text(event.date)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }

                    // Description
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Description")
                            .font(.headline)
                        Text(event.description)
                            .font(.body)
                    }

                    // Significance
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Historical Significance")
                            .font(.headline)
                        Text(event.significance)
                            .font(.body)
                    }
                }
                .padding()
            }
            .navigationTitle("Event Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }

    private var categoryColor: Color {
        switch event.category {
        case .political: return .blue
        case .military: return .red
        case .cultural: return .purple
        case .economic: return .green
        case .social: return .orange
        case .technological: return .cyan
        }
    }
}

// MARK: - Timeline Generator

@MainActor
final class HistoryTimelineGenerator {
    private let geminiClient: GeminiClient

    init(geminiClient: GeminiClient) {
        self.geminiClient = geminiClient
    }

    func generateTimeline(
        topic: String,
        startYear: Int,
        endYear: Int
    ) async throws -> Timeline {
        let prompt = HistoryPrompts.timelinePrompt(
            topic: topic,
            startYear: startYear,
            endYear: endYear
        )

        let response = try await geminiClient.generateContent(
            prompt: prompt,
            systemInstruction: "You are a history expert. Generate accurate timelines with proper JSON formatting."
        )

        guard let data = response.data(using: .utf8),
              let timelineData = try? JSONDecoder().decode(TimelineData.self, from: data) else {
            throw HistoryModeError.invalidTimelineData
        }

        return Timeline(
            topic: topic,
            startYear: startYear,
            endYear: endYear,
            events: timelineData.events
        )
    }

    private struct TimelineData: Codable {
        let events: [HistoricalEvent]
    }
}

// MARK: - Preview

#Preview {
    HistoryTimelineView(
        timeline: Timeline(
            topic: "World War II",
            startYear: 1939,
            endYear: 1945,
            events: [
                HistoricalEvent(
                    title: "Germany Invades Poland",
                    date: "September 1, 1939",
                    year: 1939,
                    description: "Nazi Germany invades Poland, marking the beginning of World War II.",
                    significance: "This invasion triggered Britain and France to declare war on Germany.",
                    category: .military
                ),
                HistoricalEvent(
                    title: "D-Day Normandy Invasion",
                    date: "June 6, 1944",
                    year: 1944,
                    description: "Allied forces land on the beaches of Normandy, France.",
                    significance: "Largest amphibious invasion in history, beginning the liberation of Western Europe.",
                    category: .military
                )
            ]
        )
    )
}
