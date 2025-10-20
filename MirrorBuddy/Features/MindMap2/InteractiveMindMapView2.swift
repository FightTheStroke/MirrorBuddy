import Combine
import SwiftUI

/// Interactive mind map 2.0 with zoom, pan, and voice navigation
struct InteractiveMindMapView2: View {
    @StateObject private var viewModel: MindMapV2ViewModel
    @GestureState private var magnification: CGFloat = 1.0
    @State private var currentScale: CGFloat = 1.0
    @State private var offset: CGSize = .zero
    @GestureState private var dragOffset: CGSize = .zero

    init(mindMap: MindMapModel) {
        _viewModel = StateObject(wrappedValue: MindMapV2ViewModel(mindMap: mindMap))
    }

    var body: some View {
        ZStack {
            // Mind map canvas
            Canvas { context, size in
                drawMindMap(context: context, size: size)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color(.systemBackground))
            .scaleEffect(currentScale * magnification)
            .offset(x: offset.width + dragOffset.width, y: offset.height + dragOffset.height)
            .gesture(dragGesture)
            .gesture(magnificationGesture)

            // Controls overlay
            VStack {
                HStack {
                    voiceButton
                    Spacer()
                    zoomControls
                }
                .padding()

                Spacer()

                if let selectedNode = viewModel.selectedNode {
                    nodeDetailPanel(selectedNode)
                }
            }
        }
        .onAppear {
            viewModel.startVoiceNavigation()
        }
    }

    // MARK: - Drawing

    private func drawMindMap(context: GraphicsContext, size: CGSize) {
        let centerX = size.width / 2
        let centerY = size.height / 2

        // Draw connections first
        for node in viewModel.mindMap.nodes {
            for connectionId in node.connections {
                if let targetNode = viewModel.mindMap.nodes.first(where: { $0.id == connectionId }) {
                    var path = Path()
                    path.move(to: CGPoint(x: centerX + node.position.x, y: centerY + node.position.y))
                    path.addLine(to: CGPoint(x: centerX + targetNode.position.x, y: centerY + targetNode.position.y))
                    context.stroke(path, with: .color(.gray), lineWidth: 2)
                }
            }
        }

        // Draw nodes on top of connections
        for node in viewModel.mindMap.nodes {
            let nodeCenter = CGPoint(x: centerX + node.position.x, y: centerY + node.position.y)
            let rect = CGRect(x: nodeCenter.x - 50, y: nodeCenter.y - 30, width: 100, height: 60)

            context.fill(Path(roundedRect: rect, cornerRadius: 10), with: .color(Color(node.color).opacity(0.3)))
            context.stroke(Path(roundedRect: rect, cornerRadius: 10), with: .color(Color(node.color)), lineWidth: 2)

            // Title text (simplified - would need proper text rendering)
        }
    }

    // MARK: - Gestures

    private var dragGesture: some Gesture {
        DragGesture()
            .updating($dragOffset) { value, state, _ in
                state = value.translation
            }
            .onEnded { value in
                offset.width += value.translation.width
                offset.height += value.translation.height
            }
    }

    private var magnificationGesture: some Gesture {
        MagnificationGesture()
            .updating($magnification) { value, state, _ in
                state = value
            }
            .onEnded { value in
                currentScale *= value
                currentScale = min(max(currentScale, 0.5), 3.0)
            }
    }

    // MARK: - Controls

    private var voiceButton: some View {
        Button {
            viewModel.toggleVoiceNavigation()
        } label: {
            Image(systemName: viewModel.isVoiceActive ? "mic.fill" : "mic")
                .foregroundColor(viewModel.isVoiceActive ? .red : .blue)
                .padding()
                .background(Color(.systemBackground))
                .clipShape(Circle())
                .shadow(radius: 5)
        }
    }

    private var zoomControls: some View {
        VStack(spacing: 8) {
            Button {
                withAnimation {
                    currentScale = min(currentScale * 1.2, 3.0)
                }
            } label: {
                Image(systemName: "plus.magnifyingglass")
                    .padding(8)
                    .background(Color(.systemBackground))
                    .clipShape(Circle())
            }

            Button {
                withAnimation {
                    currentScale = max(currentScale / 1.2, 0.5)
                }
            } label: {
                Image(systemName: "minus.magnifyingglass")
                    .padding(8)
                    .background(Color(.systemBackground))
                    .clipShape(Circle())
            }
        }
    }

    private func nodeDetailPanel(_ node: MindMapNodeModel) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(node.title)
                .font(.headline)

            if let content = node.content {
                Text(content)
                    .font(.subheadline)
            }

            HStack {
                Button("Spiega") {
                    viewModel.narrateNode(node)
                }

                Button("Nota Vocale") {
                    viewModel.startVoiceNote(for: node)
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
        .padding()
    }
}

// MARK: - ViewModel

@MainActor
final class MindMapV2ViewModel: ObservableObject {
    @Published var mindMap: MindMapModel
    @Published var selectedNode: MindMapNodeModel?
    @Published var isVoiceActive = false

    private let navigator: MindMapVoiceNavigator
    private let narrator: MindMapNarrator
    private let storage: MindMapStorage

    init(mindMap: MindMapModel) {
        self.mindMap = mindMap
        self.navigator = MindMapVoiceNavigator()
        self.narrator = MindMapNarrator()
        self.storage = MindMapStorage()
    }

    func startVoiceNavigation() {
        navigator.startListening { [weak self] command in
            self?.handleVoiceCommand(command)
        }
    }

    func toggleVoiceNavigation() {
        isVoiceActive.toggle()
        if isVoiceActive {
            startVoiceNavigation()
        } else {
            navigator.stopListening()
        }
    }

    func narrateNode(_ node: MindMapNodeModel) {
        narrator.explainNode(node)
    }

    func startVoiceNote(for node: MindMapNodeModel) {
        // Would implement voice recording
    }

    private func handleVoiceCommand(_ command: String) {
        // Parse and execute voice commands
    }

    func saveMindMap() {
        storage.save(mindMap)
    }

    func exportToPDF() {
        storage.exportToPDF(mindMap)
    }

    func exportToMarkdown() {
        storage.exportToMarkdown(mindMap)
    }
}

// MARK: - Supporting Services

final class MindMapVoiceNavigator {
    func startListening(onCommand: @escaping (String) -> Void) {}
    func stopListening() {}
}

final class MindMapNarrator {
    func explainNode(_ node: MindMapNodeModel) {}
}

final class MindMapStorage {
    func save(_ mindMap: MindMap) {}
    func exportToPDF(_ mindMap: MindMap) {}
    func exportToMarkdown(_ mindMap: MindMap) {}
}
