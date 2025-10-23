//
//  VoiceCommandHelpView.swift
//  MirrorBuddy
//
//  Task 115.4: Voice command documentation viewer
//  Displays categorized examples, common variations, and troubleshooting tips
//

import SwiftUI

struct VoiceCommandHelpView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var searchText = ""
    @State private var selectedCategory: CommandCategory?

    enum CommandCategory: String, CaseIterable, Identifiable {
        case search = "Search & Find"
        case navigation = "Navigation"
        case temporal = "Time-Based Queries"
        case aliases = "Aliases & Shortcuts"
        case filters = "Filters & Sorting"
        case troubleshooting = "Troubleshooting"

        var id: String { rawValue }

        var icon: String {
            switch self {
            case .search: return "magnifyingglass"
            case .navigation: return "arrow.left.arrow.right"
            case .temporal: return "clock"
            case .aliases: return "text.badge.plus"
            case .filters: return "line.3.horizontal.decrease.circle"
            case .troubleshooting: return "wrench.and.screwdriver"
            }
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search bar
                searchBar

                // Category grid or command list
                if selectedCategory == nil {
                    categoryGrid
                } else {
                    commandList
                }
            }
            .navigationTitle(selectedCategory?.rawValue ?? "Voice Commands")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    if selectedCategory != nil {
                        Button {
                            selectedCategory = nil
                        } label: {
                            Label("Back", systemImage: "chevron.left")
                        }
                    } else {
                        Button("Done") {
                            dismiss()
                        }
                    }
                }
            }
        }
    }

    // MARK: - View Components

    private var searchBar: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.secondary)
            TextField("Search commands...", text: $searchText)
                .textFieldStyle(.plain)
            if !searchText.isEmpty {
                Button(action: { searchText = "" }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
    }

    private var categoryGrid: some View {
        ScrollView {
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                ForEach(CommandCategory.allCases) { category in
                    CategoryCard(category: category) {
                        selectedCategory = category
                    }
                }
            }
            .padding()
        }
    }

    private var commandList: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                if let category = selectedCategory {
                    commandSection(for: category)
                }
            }
            .padding()
        }
    }

    // MARK: - Command Sections

    @ViewBuilder
    private func commandSection(for category: CommandCategory) -> some View {
        switch category {
        case .search:
            searchCommands
        case .navigation:
            navigationCommands
        case .temporal:
            temporalCommands
        case .aliases:
            aliasCommands
        case .filters:
            filterCommands
        case .troubleshooting:
            troubleshootingTips
        }
    }

    private var searchCommands: some View {
        VStack(alignment: .leading, spacing: 16) {
            CommandGroup(
                title: "Basic Search",
                commands: [
                    VoiceCommandExample(
                        example: "Find materials about algebra",
                        description: "Search for materials by topic or keyword",
                        variations: ["Show me algebra materials", "Materials on algebra", "Search algebra"]
                    ),
                    VoiceCommandExample(
                        example: "Show me my math materials",
                        description: "Filter materials by subject",
                        variations: ["Find math materials", "All my physics notes", "Show history materials"]
                    ),
                    VoiceCommandExample(
                        example: "Find the last thing I studied",
                        description: "Get the most recently accessed material",
                        variations: ["What did I study last?", "My most recent material", "Latest material"]
                    )
                ]
            )

            CommandGroup(
                title: "Fuzzy Search",
                commands: [
                    VoiceCommandExample(
                        example: "Find quadratic equation",
                        description: "Matches even with typos: 'quadrtatic', 'quadradic'",
                        variations: ["Show me quadradic formulas", "Find quadrtatic equations"]
                    ),
                    VoiceCommandExample(
                        example: "Find mnemonic devices",
                        description: "Handles phonetic variations: 'noomonic', 'neumonic'",
                        variations: ["Show noomonic devices", "Find neumonic tricks"]
                    )
                ]
            )
        }
    }

    private var navigationCommands: some View {
        VStack(alignment: .leading, spacing: 16) {
            CommandGroup(
                title: "Material Selection",
                commands: [
                    VoiceCommandExample(
                        example: "Open newest material",
                        description: "Access the most recently created material",
                        variations: ["Show newest", "Latest material", "Most recent"]
                    ),
                    VoiceCommandExample(
                        example: "Open last geometry material",
                        description: "Get the newest material for a specific subject",
                        variations: ["Show last physics material", "Recent biology material"]
                    )
                ]
            )
        }
    }

    private var temporalCommands: some View {
        VStack(alignment: .leading, spacing: 16) {
            CommandGroup(
                title: "Absolute Time References",
                commands: [
                    VoiceCommandExample(
                        example: "Show materials from today",
                        description: "Get materials created or accessed today",
                        variations: ["Today's materials", "What I studied today"]
                    ),
                    VoiceCommandExample(
                        example: "Show materials from yesterday",
                        description: "Get materials from yesterday",
                        variations: ["Yesterday's materials", "What I studied yesterday"]
                    ),
                    VoiceCommandExample(
                        example: "Show this week's materials",
                        description: "Get materials from the current week",
                        variations: ["This week's notes", "Materials from this week"]
                    )
                ]
            )

            CommandGroup(
                title: "Relative Time References",
                commands: [
                    VoiceCommandExample(
                        example: "Show materials from 3 days ago",
                        description: "Get materials from a specific number of days ago",
                        variations: ["Materials from 5 days ago", "2 weeks ago materials"]
                    ),
                    VoiceCommandExample(
                        example: "Show materials from last Monday",
                        description: "Get materials from a specific day of the week",
                        variations: ["Last Tuesday's materials", "Materials from last Friday"]
                    )
                ]
            )

            CommandGroup(
                title: "Contextual Time References",
                commands: [
                    VoiceCommandExample(
                        example: "Show recent materials",
                        description: "Get materials from the last 7 days",
                        variations: ["Recent materials", "Latest materials"]
                    ),
                    VoiceCommandExample(
                        example: "Show materials I haven't reviewed",
                        description: "Get materials that need review",
                        variations: ["Unreviewed materials", "Materials to study"]
                    )
                ]
            )
        }
    }

    private var aliasCommands: some View {
        VStack(alignment: .leading, spacing: 16) {
            CommandGroup(
                title: "Using Aliases",
                commands: [
                    VoiceCommandExample(
                        example: "Open bio",
                        description: "Use a custom alias to access a material quickly",
                        variations: ["Show bio", "Find bio"]
                    ),
                    VoiceCommandExample(
                        example: "Show math notes",
                        description: "Multi-word aliases work too",
                        variations: ["Open history chapter 3", "Find physics formulas"]
                    )
                ]
            )

            Text("Tip: Create aliases in Settings > Material Aliases for quick access to frequently used materials.")
                .font(.caption)
                .foregroundColor(.secondary)
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(8)
        }
    }

    private var filterCommands: some View {
        VStack(alignment: .leading, spacing: 16) {
            CommandGroup(
                title: "Subject Filters",
                commands: [
                    VoiceCommandExample(
                        example: "Show all math materials",
                        description: "Filter by subject",
                        variations: ["All physics materials", "My history notes"]
                    )
                ]
            )

            CommandGroup(
                title: "Difficulty Filters",
                commands: [
                    VoiceCommandExample(
                        example: "Show difficult materials",
                        description: "Get materials you struggled with",
                        variations: ["Materials I struggled with", "Hard materials", "Challenging topics"]
                    ),
                    VoiceCommandExample(
                        example: "Show easy materials",
                        description: "Get materials you've mastered",
                        variations: ["Simple materials", "Basic materials"]
                    )
                ]
            )

            CommandGroup(
                title: "Review Status",
                commands: [
                    VoiceCommandExample(
                        example: "Show materials I haven't reviewed",
                        description: "Get unreviewed materials",
                        variations: ["Unreviewed materials", "Materials to study", "Not studied yet"]
                    ),
                    VoiceCommandExample(
                        example: "Show reviewed materials",
                        description: "Get materials you've already studied",
                        variations: ["Studied materials", "Materials I've reviewed"]
                    )
                ]
            )
        }
    }

    private var troubleshootingTips: some View {
        VStack(alignment: .leading, spacing: 16) {
            TroubleshootingTip(
                title: "Command Not Recognized",
                problem: "Voice command isn't working or gives unexpected results",
                solutions: [
                    "Speak clearly and at a moderate pace",
                    "Try rephrasing using simpler language",
                    "Use subject names exactly as they appear in your materials",
                    "Check if Background noise might be interfering"
                ]
            )

            TroubleshootingTip(
                title: "Wrong Material Found",
                problem: "Search returns incorrect materials",
                solutions: [
                    "Be more specific with material titles or subjects",
                    "Create an alias for frequently used materials",
                    "Use time-based filters to narrow down results",
                    "Try using exact quotes for multi-word searches"
                ]
            )

            TroubleshootingTip(
                title: "Fuzzy Search Too Broad",
                problem: "Getting too many unrelated results",
                solutions: [
                    "Use more specific keywords",
                    "Add subject filters (e.g., 'in math')",
                    "Use time-based filters (e.g., 'from this week')",
                    "Create aliases for precise material access"
                ]
            )

            TroubleshootingTip(
                title: "Alias Not Working",
                problem: "Custom alias isn't recognized",
                solutions: [
                    "Check alias spelling in Settings > Material Aliases",
                    "Ensure alias is marked as active",
                    "Try using simpler alias names (2-3 words max)",
                    "Avoid aliases similar to common commands"
                ]
            )
        }
    }
}

// MARK: - Supporting Views

struct CategoryCard: View {
    let category: VoiceCommandHelpView.CommandCategory
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 12) {
                Image(systemName: category.icon)
                    .font(.system(size: 40))
                    .foregroundColor(.accentColor)

                Text(category.rawValue)
                    .font(.headline)
                    .foregroundColor(.primary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
        }
    }
}

struct CommandGroup: View {
    let title: String
    let commands: [VoiceCommandExample]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.title3)
                .fontWeight(.bold)

            ForEach(commands) { command in
                CommandCard(command: command)
            }
        }
    }
}

struct VoiceCommandExample: Identifiable {
    let id = UUID()
    let example: String
    let description: String
    let variations: [String]
}

struct CommandCard: View {
    let command: VoiceCommandExample

    @State private var showVariations = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Example
            HStack {
                Image(systemName: "mic.fill")
                    .foregroundColor(.accentColor)
                Text(command.example)
                    .font(.headline)
                    .italic()
            }

            // Description
            Text(command.description)
                .font(.subheadline)
                .foregroundColor(.secondary)

            // Variations toggle
            if !command.variations.isEmpty {
                Button {
                    withAnimation {
                        showVariations.toggle()
                    }
                } label: {
                    HStack {
                        Text(showVariations ? "Hide variations" : "Show variations")
                            .font(.caption)
                        Image(systemName: showVariations ? "chevron.up" : "chevron.down")
                            .font(.caption)
                    }
                    .foregroundColor(.accentColor)
                }

                if showVariations {
                    VStack(alignment: .leading, spacing: 4) {
                        ForEach(command.variations, id: \.self) { variation in
                            HStack {
                                Circle()
                                    .fill(Color.secondary)
                                    .frame(width: 4, height: 4)
                                Text(variation)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                    .italic()
                            }
                        }
                    }
                    .padding(.leading, 20)
                    .transition(.opacity)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(8)
        .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
    }
}

struct TroubleshootingTip: View {
    let title: String
    let problem: String
    let solutions: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Title
            Label(title, systemImage: "exclamationmark.triangle.fill")
                .font(.headline)
                .foregroundColor(.orange)

            // Problem
            Text("Problem:")
                .font(.subheadline)
                .fontWeight(.semibold)
            Text(problem)
                .font(.subheadline)
                .foregroundColor(.secondary)

            // Solutions
            Text("Solutions:")
                .font(.subheadline)
                .fontWeight(.semibold)

            ForEach(Array(solutions.enumerated()), id: \.offset) { index, solution in
                HStack(alignment: .top, spacing: 8) {
                    Text("\(index + 1).")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(solution)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

// MARK: - Preview

#Preview("Voice Command Help") {
    VoiceCommandHelpView()
}
