import SwiftUI

/// Detailed view displaying a historical character's profile
struct CharacterProfileView: View {
    let profile: CharacterProfile
    @State private var expandedSections: Set<ProfileSection> = []

    enum ProfileSection: String, CaseIterable {
        case biography = "Biography"
        case accomplishments = "Major Accomplishments"
        case significance = "Historical Significance"
        case related = "Related Figures"
        case facts = "Interesting Facts"
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Header
                ProfileHeader(profile: profile)

                Divider()

                // Biography Section
                ExpandableSection(
                    title: ProfileSection.biography.rawValue,
                    icon: "book.fill",
                    isExpanded: expandedSections.contains(.biography)
                ) {
                    Text(profile.biography)
                        .font(.body)
                } onToggle: {
                    toggleSection(.biography)
                }

                // Accomplishments Section
                ExpandableSection(
                    title: ProfileSection.accomplishments.rawValue,
                    icon: "star.fill",
                    isExpanded: expandedSections.contains(.accomplishments)
                ) {
                    VStack(alignment: .leading, spacing: 12) {
                        ForEach(profile.majorAccomplishments.indices, id: \.self) { index in
                            AccomplishmentRow(
                                number: index + 1,
                                text: profile.majorAccomplishments[index]
                            )
                        }
                    }
                } onToggle: {
                    toggleSection(.accomplishments)
                }

                // Historical Significance Section
                ExpandableSection(
                    title: ProfileSection.significance.rawValue,
                    icon: "crown.fill",
                    isExpanded: expandedSections.contains(.significance)
                ) {
                    Text(profile.historicalSignificance)
                        .font(.body)
                } onToggle: {
                    toggleSection(.significance)
                }

                // Related Figures Section
                ExpandableSection(
                    title: ProfileSection.related.rawValue,
                    icon: "person.2.fill",
                    isExpanded: expandedSections.contains(.related)
                ) {
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(profile.relatedFigures, id: \.self) { figure in
                            RelatedFigureChip(name: figure)
                        }
                    }
                } onToggle: {
                    toggleSection(.related)
                }

                // Interesting Facts Section
                ExpandableSection(
                    title: ProfileSection.facts.rawValue,
                    icon: "lightbulb.fill",
                    isExpanded: expandedSections.contains(.facts)
                ) {
                    VStack(alignment: .leading, spacing: 12) {
                        ForEach(profile.interestingFacts.indices, id: \.self) { index in
                            FactCard(text: profile.interestingFacts[index])
                        }
                    }
                } onToggle: {
                    toggleSection(.facts)
                }
            }
            .padding()
        }
        .navigationTitle(profile.name)
        .navigationBarTitleDisplayMode(.large)
        .onAppear {
            // Expand biography by default
            expandedSections.insert(.biography)
        }
    }

    private func toggleSection(_ section: ProfileSection) {
        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
            if expandedSections.contains(section) {
                expandedSections.remove(section)
            } else {
                expandedSections.insert(section)
            }
        }
    }
}

// MARK: - Profile Header

struct ProfileHeader: View {
    let profile: CharacterProfile

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Name
            Text(profile.name)
                .font(.largeTitle)
                .fontWeight(.bold)

            // Dates and Nationality
            HStack(spacing: 16) {
                if let birthDate = profile.birthDate {
                    DateBadge(label: "Born", date: birthDate)
                }

                if let deathDate = profile.deathDate {
                    DateBadge(label: "Died", date: deathDate)
                }
            }

            HStack {
                Image(systemName: "flag.fill")
                    .foregroundColor(.blue)
                Text(profile.nationality)
                    .font(.subheadline)
                    .fontWeight(.medium)
            }

            // Occupation
            HStack {
                Image(systemName: "briefcase.fill")
                    .foregroundColor(.orange)
                Text(profile.occupation)
                    .font(.subheadline)
                    .fontWeight(.medium)
            }
        }
    }
}

// MARK: - Date Badge

struct DateBadge: View {
    let label: String
    let date: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
            Text(date)
                .font(.subheadline)
                .fontWeight(.semibold)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(Color(.systemGray6))
        )
    }
}

// MARK: - Expandable Section

struct ExpandableSection<Content: View>: View {
    let title: String
    let icon: String
    let isExpanded: Bool
    @ViewBuilder let content: () -> Content
    let onToggle: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Button(action: onToggle) {
                HStack {
                    Image(systemName: icon)
                        .foregroundColor(.blue)
                        .frame(width: 24)

                    Text(title)
                        .font(.headline)
                        .foregroundColor(.primary)

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .rotationEffect(.degrees(isExpanded ? 90 : 0))
                }
            }
            .buttonStyle(.plain)

            if isExpanded {
                content()
                    .transition(.asymmetric(
                        insertion: .move(edge: .top).combined(with: .opacity),
                        removal: .opacity
                    ))
            }
        }
    }
}

// MARK: - Accomplishment Row

struct AccomplishmentRow: View {
    let number: Int
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text("\(number)")
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.white)
                .frame(width: 24, height: 24)
                .background(Circle().fill(Color.blue))

            Text(text)
                .font(.body)
        }
    }
}

// MARK: - Related Figure Chip

struct RelatedFigureChip: View {
    let name: String

    var body: some View {
        HStack {
            Image(systemName: "person.circle.fill")
                .foregroundColor(.blue)
            Text(name)
                .font(.subheadline)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.blue.opacity(0.1))
        )
    }
}

// MARK: - Fact Card

struct FactCard: View {
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "sparkles")
                .foregroundColor(.yellow)
                .font(.title3)

            Text(text)
                .font(.body)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.systemGray6))
        )
    }
}

// MARK: - Preview

#Preview {
    NavigationView {
        CharacterProfileView(
            profile: CharacterProfile(
                name: "Winston Churchill",
                birthDate: "November 30, 1874",
                deathDate: "January 24, 1965",
                nationality: "British",
                occupation: "Prime Minister, Statesman, Writer",
                biography: """
                Sir Winston Leonard Spencer Churchill was a British statesman who served as \
                Prime Minister of the United Kingdom from 1940 to 1945 during the Second World War, \
                and again from 1951 to 1955. A member of the Churchill family, he was the son of \
                Lord Randolph Churchill and Jennie Jerome.
                """,
                majorAccomplishments: [
                    "Led Britain to victory in World War II",
                    "Won the Nobel Prize in Literature in 1953",
                    "Served as Prime Minister twice",
                    "Authored numerous historical and biographical works"
                ],
                historicalSignificance: """
                Churchill is widely regarded as one of the greatest wartime leaders of the 20th century. \
                His speeches and radio broadcasts helped inspire British resistance during the darkest \
                days of World War II. His leadership and oratory helped rally the British people and \
                Allied forces to continue fighting against Nazi Germany.
                """,
                relatedFigures: [
                    "Franklin D. Roosevelt",
                    "Joseph Stalin",
                    "King George VI",
                    "Clement Attlee"
                ],
                interestingFacts: [
                    "He was awarded the Nobel Prize in Literature for his historical writings",
                    "Churchill was also an accomplished painter, creating over 500 paintings",
                    "He invented the 'onesie' - a one-piece siren suit for quick dressing during air raids",
                    "He had a pet budgie named Toby who often sat on his shoulder during Cabinet meetings"
                ]
            )
        )
    }
}
