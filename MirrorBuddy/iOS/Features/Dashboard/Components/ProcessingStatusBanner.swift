import SwiftUI
import SwiftData

/// Banner that shows real-time processing status when materials are being processed
/// Appears at the top of the dashboard and auto-dismisses when complete
struct ProcessingStatusBanner: View {
    @Query(animation: .default) private var allMaterials: [Material]

    @State private var isExpanded = false
    @State private var shouldShow = true

    private var processingMaterials: [Material] {
        allMaterials.filter { $0.processingStatus == .processing }
    }

    var body: some View {
        if !processingMaterials.isEmpty && shouldShow {
            VStack(spacing: 0) {
                // Main banner
                HStack(spacing: 12) {
                    // Animated progress indicator
                    ProgressView()
                        .controlSize(.regular)
                        .tint(.blue)

                    // Status text
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Elaborazione in corso")
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundStyle(.primary)

                        Text(statusMessage)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }

                    Spacer()

                    // Expand/collapse button
                    Button {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                            isExpanded.toggle()
                        }
                    } label: {
                        Image(systemName: isExpanded ? "chevron.up.circle.fill" : "chevron.down.circle.fill")
                            .font(.title3)
                            .foregroundStyle(.blue)
                            .symbolRenderingMode(.hierarchical)
                    }
                    .buttonStyle(.plain)
                }
                .padding()
                .background {
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(.ultraThinMaterial)
                        .shadow(color: .black.opacity(0.1), radius: 8, y: 4)
                }

                // Expanded details
                if isExpanded {
                    VStack(alignment: .leading, spacing: 12) {
                        ForEach(processingMaterials) { material in
                            MaterialProcessingRow(material: material)
                        }
                    }
                    .padding()
                    .background {
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .fill(Color(.systemBackground))
                            .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
                    }
                    .transition(.move(edge: .top).combined(with: .opacity))
                }
            }
            .padding(.horizontal)
            .padding(.top, 8)
            .transition(.move(edge: .top).combined(with: .opacity))
        }
    }

    private var statusMessage: String {
        let count = processingMaterials.count
        if count == 1 {
            if let material = processingMaterials.first {
                return "Generando mappe mentali per \(material.title)"
            }
            return "Elaborazione 1 materiale..."
        } else {
            return "Elaborazione \(count) materiali..."
        }
    }
}

/// Row showing individual material processing status
private struct MaterialProcessingRow: View {
    let material: Material

    var body: some View {
        HStack(spacing: 12) {
            // Material icon
            Image(systemName: "doc.fill")
                .font(.title3)
                .foregroundStyle(.blue)
                .frame(width: 40, height: 40)
                .background {
                    Circle()
                        .fill(.blue.opacity(0.1))
                }

            // Material info
            VStack(alignment: .leading, spacing: 4) {
                Text(material.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(1)

                Text(processingStage)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Spinner
            ProgressView()
                .controlSize(.small)
        }
        .padding(12)
        .background {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Color(.secondarySystemBackground))
        }
    }

    private var processingStage: String {
        // You can extend this to show actual processing stages
        // For now, show generic message
        "Generazione contenuti..."
    }
}

#Preview {
    ProcessingStatusBanner()
        .modelContainer(for: Material.self, inMemory: true)
}
