import SwiftUI

/// View for displaying annotated scientific diagrams
struct DiagramAnnotationView: View {
    let annotation: DiagramAnnotation
    let imageData: Data?

    @State private var selectedComponent: DiagramAnnotation.Component?
    @State private var selectedLabel: DiagramAnnotation.Label?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header
                Text("Diagram Analysis")
                    .font(.title2)
                    .fontWeight(.bold)

                Text(annotation.diagramType)
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                Divider()

                // Image (if available)
                if let imageData = imageData,
                   let uiImage = UIImage(data: imageData) {
                    Image(uiImage: uiImage)
                        .resizable()
                        .scaledToFit()
                        .frame(maxWidth: .infinity)
                        .cornerRadius(12)
                }

                // Main Components
                ComponentsSection(
                    components: annotation.mainComponents,
                    selectedComponent: $selectedComponent
                )

                // Labels
                LabelsSection(
                    labels: annotation.labels,
                    selectedLabel: $selectedLabel
                )

                // Explanation
                ExplanationSection(explanation: annotation.explanation)

                // Key Points
                KeyPointsSection(keyPoints: annotation.keyPoints)
            }
            .padding()
        }
        .navigationTitle("Diagram Annotation")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Components Section

struct ComponentsSection: View {
    let components: [DiagramAnnotation.Component]
    @Binding var selectedComponent: DiagramAnnotation.Component?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Main Components")
                .font(.headline)

            ForEach(components.indices, id: \.self) { index in
                ComponentCard(
                    component: components[index],
                    isSelected: selectedComponent == components[index]
                )
                .onTapGesture {
                    withAnimation {
                        if selectedComponent == components[index] {
                            selectedComponent = nil
                        } else {
                            selectedComponent = components[index]
                        }
                    }
                }
            }
        }
    }
}

struct ComponentCard: View {
    let component: DiagramAnnotation.Component
    let isSelected: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "gear.circle.fill")
                    .foregroundColor(.blue)
                    .font(.title3)

                Text(component.name)
                    .font(.subheadline)
                    .fontWeight(.semibold)

                Spacer()

                Image(systemName: isSelected ? "chevron.up" : "chevron.down")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            if isSelected {
                Text(component.function)
                    .font(.body)
                    .foregroundColor(.secondary)
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(isSelected ? Color.blue.opacity(0.1) : Color(.systemGray6))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isSelected ? Color.blue : Color.clear, lineWidth: 2)
        )
    }
}

// MARK: - Labels Section

struct LabelsSection: View {
    let labels: [DiagramAnnotation.Label]
    @Binding var selectedLabel: DiagramAnnotation.Label?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Labels")
                .font(.headline)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(labels.indices, id: \.self) { index in
                        LabelChip(
                            label: labels[index],
                            isSelected: selectedLabel == labels[index]
                        )
                        .onTapGesture {
                            withAnimation {
                                if selectedLabel == labels[index] {
                                    selectedLabel = nil
                                } else {
                                    selectedLabel = labels[index]
                                }
                            }
                        }
                    }
                }
            }

            if let selected = selectedLabel {
                Text(selected.description)
                    .font(.body)
                    .padding()
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color.blue.opacity(0.1))
                    )
                    .transition(.opacity.combined(with: .scale))
            }
        }
    }
}

struct LabelChip: View {
    let label: DiagramAnnotation.Label
    let isSelected: Bool

    var body: some View {
        Text(label.text)
            .font(.subheadline)
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(
                Capsule()
                    .fill(isSelected ? Color.blue : Color(.systemGray5))
            )
            .foregroundColor(isSelected ? .white : .primary)
    }
}

// MARK: - Supporting Sections

struct ExplanationSection: View {
    let explanation: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Explanation", systemImage: "text.bubble.fill")
                .font(.headline)

            Text(explanation)
                .font(.body)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.green.opacity(0.1))
        )
    }
}

struct KeyPointsSection: View {
    let keyPoints: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Key Points", systemImage: "star.fill")
                .font(.headline)

            ForEach(keyPoints.indices, id: \.self) { index in
                HStack(alignment: .top, spacing: 12) {
                    Text("\(index + 1)")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .frame(width: 24, height: 24)
                        .background(Circle().fill(Color.orange))

                    Text(keyPoints[index])
                        .font(.body)
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.orange.opacity(0.1))
        )
    }
}

// MARK: - Equatable Conformance

extension DiagramAnnotation.Component: Equatable {
    static func == (lhs: DiagramAnnotation.Component, rhs: DiagramAnnotation.Component) -> Bool {
        lhs.name == rhs.name && lhs.function == rhs.function
    }
}

extension DiagramAnnotation.Label: Equatable {
    static func == (lhs: DiagramAnnotation.Label, rhs: DiagramAnnotation.Label) -> Bool {
        lhs.text == rhs.text && lhs.description == rhs.description
    }
}

// MARK: - Preview

#Preview {
    NavigationView {
        DiagramAnnotationView(
            annotation: DiagramAnnotation(
                diagramType: "Electric Circuit",
                mainComponents: [
                    DiagramAnnotation.Component(
                        name: "Battery",
                        function: "Provides electrical energy to the circuit by converting chemical energy into electrical potential difference"
                    ),
                    DiagramAnnotation.Component(
                        name: "Resistor",
                        function: "Limits current flow and converts electrical energy to heat, protecting other components"
                    ),
                    DiagramAnnotation.Component(
                        name: "LED",
                        function: "Converts electrical energy to light, indicating current flow in the circuit"
                    )
                ],
                labels: [
                    DiagramAnnotation.Label(
                        text: "Positive Terminal",
                        description: "The positive terminal of the battery (higher potential)"
                    ),
                    DiagramAnnotation.Label(
                        text: "Negative Terminal",
                        description: "The negative terminal of the battery (lower potential)"
                    ),
                    DiagramAnnotation.Label(
                        text: "Current Flow",
                        description: "Direction of conventional current (positive to negative)"
                    )
                ],
                explanation: "This is a simple series circuit where current flows from the positive terminal of the battery, through the resistor, through the LED, and back to the negative terminal. The resistor limits the current to protect the LED from burning out.",
                keyPoints: [
                    "Current is the same at all points in a series circuit",
                    "The battery voltage is divided across the resistor and LED",
                    "The resistor value must be calculated to provide safe current for the LED",
                    "If the LED is reversed, the circuit won't work properly"
                ]
            ),
            imageData: nil
        )
    }
}
