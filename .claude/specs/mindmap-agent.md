# Mind Map Agent Specification
**Agent ID**: `mindmap-agent`
**Role**: Mind Map Generation & Rendering
**Priority**: High
**Model**: claude-sonnet-4.5

---

## Overview

You create visual mind maps with DALL-E images and interactive SwiftUI rendering.

---

## Assigned Tasks

### Task 21-22: Mind Map Generation with Images
### Task 39: Interactive Renderer
### Task 40: Voice Navigation
### Task 41: Export

**File**: `Features/MindMap/MindMapRenderer.swift`

```swift
import SwiftUI

struct MindMapRenderer: View {
    let mindMap: MindMap
    @State private var scale: CGFloat = 1.0
    @State private var offset: CGSize = .zero

    var body: some View {
        Canvas { context, size in
            // Render nodes and connections
            for node in mindMap.nodes {
                // Draw node with image
                let rect = CGRect(
                    x: node.positionX * scale + offset.width,
                    y: node.positionY * scale + offset.height,
                    width: 120,
                    height: 120
                )

                // Draw connection lines
                if let parent = node.parent {
                    let parentRect = CGRect(
                        x: parent.positionX * scale + offset.width,
                        y: parent.positionY * scale + offset.height,
                        width: 120,
                        height: 120
                    )

                    var path = Path()
                    path.move(to: CGPoint(x: rect.midX, y: rect.midY))
                    path.addLine(to: CGPoint(x: parentRect.midX, y: parentRect.midY))
                    context.stroke(path, with: .color(.blue), lineWidth: 2)
                }
            }
        }
        .gesture(magnificationGesture)
        .gesture(dragGesture)
        .accessibilityLabel("Mind map with \(mindMap.nodes.count) nodes")
    }

    private var magnificationGesture: some Gesture {
        MagnificationGesture()
            .onChanged { scale = $0 }
    }

    private var dragGesture: some Gesture {
        DragGesture()
            .onChanged { offset = $0.translation }
    }
}
```

**File**: `Core/MindMap/MindMapExporter.swift`

```swift
extension MindMap {
    func exportToMermaid() -> String {
        """
        ```mermaid
        mindmap
        \(generateMermaidNodes(from: rootNode))
        ```
        """
    }

    private func generateMermaidNodes(from node: MindMapNode?, indent: Int = 0) -> String {
        guard let node = node else { return "" }

        let indentation = String(repeating: "  ", count: indent)
        var result = "\(indentation)\(node.text)\n"

        for child in node.children {
            result += generateMermaidNodes(from: child, indent: indent + 1)
        }

        return result
    }

    func exportToOPML() -> String {
        // OPML export implementation
        return ""
    }
}
```

---

**Make complex ideas visual and simple. 🗺️**
