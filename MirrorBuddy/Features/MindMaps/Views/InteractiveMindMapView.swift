import AVFoundation
import os.log
import SwiftUI

/// Interactive mind map renderer using SwiftUI Canvas (Task 39)
struct InteractiveMindMapView: View {
    let mindMap: MindMap

    @State private var viewModel: InteractiveMindMapViewModel
    @State private var synthesizer = AVSpeechSynthesizer()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "MindMapView")

    init(mindMap: MindMap) {
        self.mindMap = mindMap
        _viewModel = State(initialValue: InteractiveMindMapViewModel(mindMap: mindMap))
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
            // Task 97.4: Tap gestures for mobile interaction
            .gesture(
                TapGesture(count: 2)
                    .onEnded { _ in
                        handleDoubleTap()
                    }
            )
            .gesture(
                TapGesture()
                    .onEnded { _ in
                        handleSingleTap()
                    }
            )
            .contentShape(Rectangle()) // Make entire canvas tappable
            .background(Color(.systemBackground))

            // Breadcrumb navigation (Task 97.4)
            VStack {
                if let selectedNode = viewModel.selectedNode {
                    breadcrumbView(for: selectedNode)
                        .padding(.top, 8)
                }
                Spacer()
            }

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

    // MARK: - Tap Handlers (Task 97.4)

    private func handleSingleTap() {
        // Deselect if no node hit
        // Note: Actual node selection happens in drawNodes when we can do hit testing
        viewModel.deselectNode()
    }

    private func handleDoubleTap() {
        // Toggle expansion of selected node
        if let selected = viewModel.selectedNode {
            viewModel.toggleExpansion(node: selected)
        }
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

            // Task 97.2: Thicker connection lines for better visibility
            context.stroke(
                path,
                with: .color(color.opacity(MindMapTheme.ColorSettings.connectionOpacity)),
                lineWidth: MindMapTheme.Connection.lineWidth * viewModel.zoomScale
            )

            // Draw arrow at end
            drawArrow(context: context, at: endPoint, towards: startPoint, color: color)
        }
    }

    private func drawArrow(context: GraphicsContext, at point: CGPoint, towards: CGPoint, color: Color) {
        let angle = atan2(point.y - towards.y, point.x - towards.x)
        // Task 97.2: Larger arrow for visibility
        let arrowSize = MindMapTheme.Connection.arrowSize * viewModel.zoomScale

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
            let nodeSize = isRoot ? MindMapTheme.NodeSize.rootDiameter : MindMapTheme.NodeSize.childDiameter
            let scaledSize = nodeSize * viewModel.zoomScale
            let color = Color(hexString: node.color ?? "#4A90E2") ?? .blue

            // Delegate to specialized drawing methods
            drawNodeCircleAndShadow(context: context, position: position, scaledSize: scaledSize, color: color, isSelected: isSelected)
            drawExpansionIndicator(context: context, node: node, position: position, scaledSize: scaledSize, isExpanded: isExpanded)
            drawTypeIndicator(context: context, node: node, position: position, scaledSize: scaledSize, isRoot: isRoot)
            drawSubjectBadge(context: context, node: node, position: position, scaledSize: scaledSize, color: color, isRoot: isRoot)
            drawNodeTitle(context: context, node: node, position: position, isRoot: isRoot)
        }
    }

    private func drawNodeCircleAndShadow(context: GraphicsContext, position: CGPoint, scaledSize: CGFloat, color: Color, isSelected: Bool) {
        let rect = CGRect(
            x: position.x - scaledSize / 2,
            y: position.y - scaledSize / 2,
            width: scaledSize,
            height: scaledSize
        )

        let fillColor = isSelected ? color : color.opacity(MindMapTheme.ColorSettings.highContrastNodeOpacity)

        // Shadow for depth
        context.fill(
            Path(ellipseIn: rect.insetBy(dx: -2, dy: -2)),
            with: .color(.black.opacity(0.2))
        )

        context.fill(
            Path(ellipseIn: rect),
            with: .color(fillColor)
        )

        // Border for selected node (Task 97.2: High contrast)
        if isSelected {
            context.stroke(
                Path(ellipseIn: rect),
                with: .color(MindMapTheme.ColorSettings.selectedBorderColor),
                lineWidth: MindMapTheme.ColorSettings.selectedBorderWidth
            )
        }
    }

    private func drawExpansionIndicator(context: GraphicsContext, node: MindMapNode, position: CGPoint, scaledSize: CGFloat, isExpanded: Bool) {
        guard !node.childNodesArray.isEmpty else { return }

        let indicatorSize: CGFloat = 20 * viewModel.zoomScale
        let indicatorX = position.x + scaledSize / 2 - indicatorSize / 2
        let indicatorY = position.y - indicatorSize / 2

        // Use SF Symbol for expansion state
        let symbolName = isExpanded ? MindMapTheme.NodeIcon.expanded : MindMapTheme.NodeIcon.collapsed
        if let resolved = context.resolveSymbol(id: "expand_\(node.id)_\(symbolName)") {
            context.draw(resolved, at: CGPoint(x: indicatorX, y: indicatorY))
        } else {
            // Fallback to text if symbol not resolved
            let symbol = isExpanded ? "−" : "+"
            let text = Text(symbol).font(.system(size: 14 * viewModel.zoomScale, weight: .bold)).foregroundStyle(.white)
            context.draw(text, at: CGPoint(x: indicatorX, y: indicatorY))
        }
    }

    private func drawTypeIndicator(context: GraphicsContext, node: MindMapNode, position: CGPoint, scaledSize: CGFloat, isRoot: Bool) {
        let typeIndicatorRadius: CGFloat = 6 * viewModel.zoomScale
        let typeIndicatorPos = CGPoint(
            x: position.x - scaledSize / 3,
            y: position.y - scaledSize / 3
        )

        if isRoot {
            // Full circle for root
            context.fill(
                Path(ellipseIn: CGRect(
                    x: typeIndicatorPos.x - typeIndicatorRadius,
                    y: typeIndicatorPos.y - typeIndicatorRadius,
                    width: typeIndicatorRadius * 2,
                    height: typeIndicatorRadius * 2
                )),
                with: .color(.white.opacity(0.9))
            )
        } else if !node.childNodesArray.isEmpty {
            // Half circle for branch nodes
            var path = Path()
            path.addArc(
                center: typeIndicatorPos,
                radius: typeIndicatorRadius,
                startAngle: .degrees(-90),
                endAngle: .degrees(90),
                clockwise: false
            )
            path.closeSubpath()
            context.fill(path, with: .color(.white.opacity(0.7)))
        } else {
            // Small dot for leaf nodes
            context.fill(
                Path(ellipseIn: CGRect(
                    x: typeIndicatorPos.x - typeIndicatorRadius / 2,
                    y: typeIndicatorPos.y - typeIndicatorRadius / 2,
                    width: typeIndicatorRadius,
                    height: typeIndicatorRadius
                )),
                with: .color(.white.opacity(0.6))
            )
        }
    }

    private func drawSubjectBadge(context: GraphicsContext, node: MindMapNode, position: CGPoint, scaledSize: CGFloat, color: Color, isRoot: Bool) {
        guard isRoot, let material = mindMap.material, let subjectEntity = material.subject else { return }

        let badgeRadius: CGFloat = 12 * viewModel.zoomScale
        let badgePos = CGPoint(
            x: position.x + scaledSize / 3,
            y: position.y + scaledSize / 3
        )

        // Badge background
        context.fill(
            Path(ellipseIn: CGRect(
                x: badgePos.x - badgeRadius,
                y: badgePos.y - badgeRadius,
                width: badgeRadius * 2,
                height: badgeRadius * 2
            )),
            with: .color(.white.opacity(0.9))
        )

        // Subject initial letter
        _ = subjectEntity.toSubject()
        let initial = String(subjectEntity.displayName.prefix(1))
        let badgeText = Text(initial)
            .font(.system(size: badgeRadius, weight: .bold))
            .foregroundStyle(color)

        context.draw(badgeText, at: badgePos)
    }

    private func drawNodeTitle(context: GraphicsContext, node: MindMapNode, position: CGPoint, isRoot: Bool) {
        let fontSize = isRoot ? MindMapTheme.FontSize.rootNodeTitle : MindMapTheme.FontSize.childNodeTitle
        let fontWeight = isRoot ? MindMapTheme.FontWeight.rootNode : MindMapTheme.FontWeight.childNode

        let titleText = Text(node.title)
            .font(.system(size: fontSize, weight: fontWeight))
            .foregroundStyle(MindMapTheme.ColorSettings.textOnColoredBackground)

        context.draw(titleText, at: position)
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

    // MARK: - Breadcrumb Navigation (Task 97.4)

    private func breadcrumbView(for node: MindMapNode) -> some View {
        let path = viewModel.getNodePath(node: node)

        return ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(Array(path.enumerated()), id: \.element.id) { index, pathNode in
                    Button {
                        viewModel.selectNode(pathNode)
                        viewModel.focusOnNode(pathNode)
                    } label: {
                        HStack(spacing: 4) {
                            Text(pathNode.title)
                                .font(.system(size: MindMapTheme.FontSize.breadcrumbText, weight: .medium))
                                .lineLimit(1)

                            if index < path.count - 1 {
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 10))
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color(hexString: pathNode.color ?? "#4A90E2")?.opacity(0.2) ?? Color.blue.opacity(0.2))
                        .cornerRadius(8)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal)
        }
        .frame(height: MindMapTheme.Layout.breadcrumbHeight)
        .background(.ultraThinMaterial)
    }

    // MARK: - Node Detail Overlay (Subtask 39.3)

    private func nodeDetailOverlay(node: MindMapNode) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                // Task 97.2: Larger fonts for detail overlay
                Text(node.title)
                    .font(.system(size: MindMapTheme.FontSize.detailOverlayHeadline, weight: MindMapTheme.FontWeight.detailHeadline))

                Spacer()

                Button {
                    viewModel.deselectNode()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                }
            }

            if let content = node.content {
                // Task 97.2: Readable body text
                Text(content)
                    .font(.system(size: MindMapTheme.FontSize.detailOverlayBody, weight: MindMapTheme.FontWeight.detailBody))
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
final class InteractiveMindMapViewModel {
    private let mindMap: MindMap
    private var allNodes: [MindMapNode]

    // View state
    var zoomScale: Double = 1.0
    var panOffset: CGSize = .zero
    var selectedNode: MindMapNode?

    // Expansion state (Subtask 39.3)
    private var expandedNodeIDs: Set<UUID> = []

    // Performance optimization (Subtask 39.4) + Task 97.2: Mobile-optimized zoom
    private let minZoom = MindMapTheme.Zoom.minimum
    private let maxZoom = MindMapTheme.Zoom.maximum
    private let zoomStep = MindMapTheme.Zoom.step

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

    // MARK: - Navigation (Task 97.4)

    /// Get the path from root to the specified node
    func getNodePath(node: MindMapNode) -> [MindMapNode] {
        var path: [MindMapNode] = [node]
        var current = node

        // Traverse up to root
        while let parentID = current.parentNodeID,
              let parent = getNode(by: parentID) {
            path.insert(parent, at: 0)
            current = parent
        }

        return path
    }

    /// Focus on a node by centering it in the viewport
    func focusOnNode(_ node: MindMapNode) {
        withAnimation(MindMapTheme.Animation.panSmooth) {
            // Center the node by calculating required pan offset
            panOffset = CGSize(
                width: -node.positionX * zoomScale,
                height: -node.positionY * zoomScale
            )
        }
        logger.info("Focused on node: \(node.title)")
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
            blue: Double(b) / 255,
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
