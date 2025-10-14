import SwiftUI
import AVFoundation
import os.log

/// Interactive mind map renderer using SwiftUI Canvas (Task 39)
struct InteractiveMindMapView: View {
    let mindMap: MindMap

    @State private var viewModel: MindMapViewModel
    @State private var synthesizer = AVSpeechSynthesizer()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "MindMapView")

    init(mindMap: MindMap) {
        self.mindMap = mindMap
        _viewModel = State(initialValue: MindMapViewModel(mindMap: mindMap))
    }

    var body: some View {
        ZStack {
            // Canvas-based renderer (Subtask 39.1)
            Canvas { context, size in
                renderMindMap(context: context, size: size)
            }
            .gesture(
                SimultaneousGesture(
                    dragGesture,
                    magnificationGesture
                )
            )
            .background(Color(.systemBackground))

            // Node detail overlay
            if let selectedNode = viewModel.selectedNode {
                nodeDetailOverlay(node: selectedNode)
            }

            // Controls overlay
            VStack {
                Spacer()
                controlsBar
            }
        }
        .navigationTitle("Mind Map")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Canvas Rendering (Subtask 39.1)

    private func renderMindMap(context: GraphicsContext, size: CGSize) {
        let visibleNodes = viewModel.getVisibleNodes()

        // Center the view
        let centerOffset = CGPoint(
            x: size.width / 2 + viewModel.panOffset.width,
            y: size.height / 2 + viewModel.panOffset.height
        )

        // Draw connections first (behind nodes)
        drawConnections(context: context, nodes: visibleNodes, centerOffset: centerOffset)

        // Draw nodes
        drawNodes(context: context, nodes: visibleNodes, centerOffset: centerOffset, canvasSize: size)
    }

    private func drawConnections(context: GraphicsContext, nodes: [MindMapNode], centerOffset: CGPoint) {
        for node in nodes {
            guard let parentID = node.parentNodeID,
                  let parent = viewModel.getNode(by: parentID) else {
                continue
            }

            let startPoint = CGPoint(
                x: parent.positionX * viewModel.zoomScale + centerOffset.x,
                y: parent.positionY * viewModel.zoomScale + centerOffset.y
            )

            let endPoint = CGPoint(
                x: node.positionX * viewModel.zoomScale + centerOffset.x,
                y: node.positionY * viewModel.zoomScale + centerOffset.y
            )

            // Draw curved connection with arrow
            var path = Path()

            // Calculate control point for Bezier curve
            let midX = (startPoint.x + endPoint.x) / 2
            let midY = (startPoint.y + endPoint.y) / 2
            let controlPoint = CGPoint(x: midX, y: midY - 30)

            path.move(to: startPoint)
            path.addQuadCurve(to: endPoint, control: controlPoint)

            let color = Color(hexString: node.color ?? "#4A90E2") ?? .blue

            context.stroke(
                path,
                with: .color(color.opacity(0.6)),
                lineWidth: 2 * viewModel.zoomScale
            )

            // Draw arrow at end
            drawArrow(context: context, at: endPoint, towards: startPoint, color: color)
        }
    }

    private func drawArrow(context: GraphicsContext, at point: CGPoint, towards: CGPoint, color: Color) {
        let angle = atan2(point.y - towards.y, point.x - towards.x)
        let arrowSize = 10.0 * viewModel.zoomScale

        var path = Path()
        path.move(to: point)
        path.addLine(to: CGPoint(
            x: point.x - arrowSize * cos(angle - .pi / 6),
            y: point.y - arrowSize * sin(angle - .pi / 6)
        ))
        path.move(to: point)
        path.addLine(to: CGPoint(
            x: point.x - arrowSize * cos(angle + .pi / 6),
            y: point.y - arrowSize * sin(angle + .pi / 6)
        ))

        context.stroke(path, with: .color(color.opacity(0.6)), lineWidth: 2)
    }

    private func drawNodes(context: GraphicsContext, nodes: [MindMapNode], centerOffset: CGPoint, canvasSize: CGSize) {
        for node in nodes {
            let position = CGPoint(
                x: node.positionX * viewModel.zoomScale + centerOffset.x,
                y: node.positionY * viewModel.zoomScale + centerOffset.y
            )

            // Skip if outside visible area (performance optimization - Subtask 39.4)
            let margin = 200.0
            guard position.x > -margin && position.x < canvasSize.width + margin &&
                  position.y > -margin && position.y < canvasSize.height + margin else {
                continue
            }

            let isRoot = node.parentNodeID == nil
            let isSelected = viewModel.selectedNode?.id == node.id
            let isExpanded = viewModel.isExpanded(node: node)

            let nodeSize = isRoot ? 80.0 : 60.0
            let scaledSize = nodeSize * viewModel.zoomScale

            // Draw node circle
            let rect = CGRect(
                x: position.x - scaledSize / 2,
                y: position.y - scaledSize / 2,
                width: scaledSize,
                height: scaledSize
            )

            let color = Color(hexString: node.color ?? "#4A90E2") ?? .blue
            let fillColor = isSelected ? color : color.opacity(0.8)

            // Shadow for depth
            context.fill(
                Path(ellipseIn: rect.insetBy(dx: -2, dy: -2)),
                with: .color(.black.opacity(0.2))
            )

            context.fill(
                Path(ellipseIn: rect),
                with: .color(fillColor)
            )

            // Border for selected node
            if isSelected {
                context.stroke(
                    Path(ellipseIn: rect),
                    with: .color(.white),
                    lineWidth: 3
                )
            }

            // Draw expansion indicator
            if !node.childNodesArray.isEmpty {
                let indicatorRect = CGRect(
                    x: position.x + scaledSize / 2 - 12,
                    y: position.y - 6,
                    width: 12,
                    height: 12
                )

                context.fill(
                    Path(ellipseIn: indicatorRect),
                    with: .color(.white)
                )

                // Plus or minus icon
                let symbol = isExpanded ? "−" : "+"
                let text = Text(symbol).font(.system(size: 10, weight: .bold))
                context.draw(text, at: CGPoint(x: indicatorRect.midX, y: indicatorRect.midY))
            }

            // Draw title text (optimized for readability)
            let titleText = Text(node.title)
                .font(.system(size: isRoot ? 10 : 8, weight: isRoot ? .bold : .regular))
                .foregroundStyle(.white)

            context.draw(titleText, at: position)
        }
    }

    // MARK: - Gestures (Subtask 39.2)

    private var dragGesture: some Gesture {
        DragGesture()
            .onChanged { value in
                viewModel.updatePan(translation: value.translation)
            }
    }

    private var magnificationGesture: some Gesture {
        MagnificationGesture()
            .onChanged { value in
                viewModel.updateZoom(scale: value)
            }
            .onEnded { _ in
                viewModel.finalizeZoom()
            }
    }

    // MARK: - Node Detail Overlay (Subtask 39.3)

    private func nodeDetailOverlay(node: MindMapNode) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(node.title)
                    .font(.headline)

                Spacer()

                Button {
                    viewModel.deselectNode()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                }
            }

            if let content = node.content {
                Text(content)
                    .font(.body)
                    .foregroundStyle(.secondary)
            }

            HStack {
                // TTS button (Subtask 39.3)
                Button {
                    speakNode(node)
                } label: {
                    Label("Read Aloud", systemImage: "speaker.wave.2")
                }
                .buttonStyle(.bordered)

                Spacer()

                // Expansion toggle
                if !node.childNodesArray.isEmpty {
                    Button {
                        viewModel.toggleExpansion(node: node)
                    } label: {
                        Label(
                            viewModel.isExpanded(node: node) ? "Collapse" : "Expand",
                            systemImage: viewModel.isExpanded(node: node) ? "chevron.up" : "chevron.down"
                        )
                    }
                    .buttonStyle(.bordered)
                }
            }
        }
        .padding()
        .background(.ultraThinMaterial)
        .cornerRadius(12)
        .shadow(radius: 10)
        .padding()
        .transition(.move(edge: .bottom).combined(with: .opacity))
    }

    // MARK: - Controls Bar

    private var controlsBar: some View {
        HStack(spacing: 20) {
            Button {
                viewModel.zoomIn()
            } label: {
                Image(systemName: "plus.magnifyingglass")
                    .font(.title2)
            }

            Button {
                viewModel.zoomOut()
            } label: {
                Image(systemName: "minus.magnifyingglass")
                    .font(.title2)
            }

            Button {
                viewModel.resetView()
            } label: {
                Image(systemName: "arrow.counterclockwise")
                    .font(.title2)
            }

            Button {
                viewModel.expandAll()
            } label: {
                Image(systemName: "arrow.up.left.and.arrow.down.right")
                    .font(.title2)
            }

            Button {
                viewModel.collapseAll()
            } label: {
                Image(systemName: "arrow.down.right.and.arrow.up.left")
                    .font(.title2)
            }
        }
        .padding()
        .background(.ultraThinMaterial)
        .cornerRadius(12)
        .shadow(radius: 5)
        .padding(.bottom)
    }

    // MARK: - TTS (Subtask 39.3)

    private func speakNode(_ node: MindMapNode) {
        synthesizer.stopSpeaking(at: .immediate)

        let textToSpeak = node.content ?? node.title
        let utterance = AVSpeechUtterance(string: textToSpeak)
        utterance.voice = AVSpeechSynthesisVoice(language: "it-IT")
        utterance.rate = 0.5

        synthesizer.speak(utterance)
        logger.info("Speaking node: \(node.title)")
    }
}

// MARK: - View Model (Subtasks 39.2, 39.3, 39.4)

@Observable
@MainActor
final class MindMapViewModel {
    private let mindMap: MindMap
    private var allNodes: [MindMapNode]

    // View state
    var zoomScale: Double = 1.0
    var panOffset: CGSize = .zero
    var selectedNode: MindMapNode?

    // Expansion state (Subtask 39.3)
    private var expandedNodeIDs: Set<UUID> = []

    // Performance optimization (Subtask 39.4)
    private let minZoom = 0.3
    private let maxZoom = 3.0
    private let zoomStep = 0.2

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "MindMapViewModel")

    init(mindMap: MindMap) {
        self.mindMap = mindMap
        self.allNodes = mindMap.nodesArray

        // Expand root node by default
        if let root = allNodes.first(where: { $0.parentNodeID == nil }) {
            expandedNodeIDs.insert(root.id)
        }
    }

    // MARK: - Node Access

    func getNode(by id: UUID) -> MindMapNode? {
        allNodes.first { $0.id == id }
    }

    func getVisibleNodes() -> [MindMapNode] {
        guard let root = allNodes.first(where: { $0.parentNodeID == nil }) else {
            return []
        }

        var visible: [MindMapNode] = [root]
        var queue: [MindMapNode] = [root]

        while !queue.isEmpty {
            let current = queue.removeFirst()

            if expandedNodeIDs.contains(current.id) {
                for child in current.childNodesArray {
                    visible.append(child)
                    queue.append(child)
                }
            }
        }

        return visible
    }

    // MARK: - Expansion (Subtask 39.3)

    func isExpanded(node: MindMapNode) -> Bool {
        expandedNodeIDs.contains(node.id)
    }

    func toggleExpansion(node: MindMapNode) {
        if expandedNodeIDs.contains(node.id) {
            expandedNodeIDs.remove(node.id)
            logger.debug("Collapsed node: \(node.title)")
        } else {
            expandedNodeIDs.insert(node.id)
            logger.debug("Expanded node: \(node.title)")
        }
    }

    func expandAll() {
        expandedNodeIDs = Set(allNodes.map { $0.id })
        logger.info("Expanded all nodes")
    }

    func collapseAll() {
        // Keep only root expanded
        if let root = allNodes.first(where: { $0.parentNodeID == nil }) {
            expandedNodeIDs = [root.id]
        } else {
            expandedNodeIDs.removeAll()
        }
        logger.info("Collapsed all nodes")
    }

    // MARK: - Selection

    func selectNode(_ node: MindMapNode) {
        selectedNode = node
    }

    func deselectNode() {
        selectedNode = nil
    }

    // MARK: - Zoom & Pan (Subtask 39.2)

    func updateZoom(scale: CGFloat) {
        let newZoom = zoomScale * scale
        zoomScale = max(minZoom, min(maxZoom, newZoom))
    }

    func finalizeZoom() {
        // Smooth zoom to nearest step
        zoomScale = round(zoomScale / zoomStep) * zoomStep
        zoomScale = max(minZoom, min(maxZoom, zoomScale))
    }

    func zoomIn() {
        withAnimation(.easeInOut(duration: 0.2)) {
            zoomScale = min(maxZoom, zoomScale + zoomStep)
        }
    }

    func zoomOut() {
        withAnimation(.easeInOut(duration: 0.2)) {
            zoomScale = max(minZoom, zoomScale - zoomStep)
        }
    }

    func updatePan(translation: CGSize) {
        panOffset = translation
    }

    func resetView() {
        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
            zoomScale = 1.0
            panOffset = .zero
        }
        logger.info("Reset view to default")
    }
}

// MARK: - Color Extension

extension Color {
    init?(hexString: String) {
        let hex = hexString.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            return nil
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        let mindMap = MindMap(materialID: UUID())

        let root = MindMapNode(
            title: "Main Topic",
            content: "Central concept of the mind map",
            positionX: 0,
            positionY: 0,
            color: "#4A90E2"
        )

        let child1 = MindMapNode(
            title: "Subtopic 1",
            content: "First branch",
            positionX: 150,
            positionY: -100,
            color: "#E74C3C",
            parentNodeID: root.id
        )

        let child2 = MindMapNode(
            title: "Subtopic 2",
            content: "Second branch",
            positionX: 150,
            positionY: 100,
            color: "#2ECC71",
            parentNodeID: root.id
        )

        root.childNodes = [child1, child2]
        mindMap.nodes = [root, child1, child2]

        return InteractiveMindMapView(mindMap: mindMap)
    }
}
