import Foundation
import SwiftData
import UIKit
import os.log

/// Mind map export service supporting multiple formats (Task 41)
@MainActor
final class MindMapExportService {
    static let shared = MindMapExportService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "MindMapExport")

    private init() {}

    // MARK: - Export Formats (Subtask 41.1)

    enum ExportFormat: String, CaseIterable, Identifiable {
        case json = "json"
        case mermaid = "mermaid"
        case opml = "opml"
        case markdown = "markdown"

        var id: String { rawValue }

        var displayName: String {
            switch self {
            case .json: return "JSON"
            case .mermaid: return "Mermaid Diagram"
            case .opml: return "OPML"
            case .markdown: return "Markdown"
            }
        }

        var fileExtension: String {
            switch self {
            case .json: return "json"
            case .mermaid: return "mmd"
            case .opml: return "opml"
            case .markdown: return "md"
            }
        }

        var mimeType: String {
            switch self {
            case .json: return "application/json"
            case .mermaid: return "text/plain"
            case .opml: return "text/x-opml"
            case .markdown: return "text/markdown"
            }
        }
    }

    // MARK: - Export Methods (Subtask 41.1)

    /// Export mind map to specified format
    func exportMindMap(
        _ mindMap: MindMap,
        format: ExportFormat,
        includeMetadata: Bool = true
    ) async throws -> ExportResult {
        logger.info("Exporting mind map in \(format.rawValue) format")

        let content: String

        switch format {
        case .json:
            content = try exportToJSON(mindMap, includeMetadata: includeMetadata)
        case .mermaid:
            content = try exportToMermaid(mindMap)
        case .opml:
            content = try exportToOPML(mindMap, includeMetadata: includeMetadata)
        case .markdown:
            content = try exportToMarkdown(mindMap)
        }

        let filename = generateFilename(for: mindMap, format: format)

        let result = ExportResult(
            content: content,
            format: format,
            filename: filename,
            mimeType: format.mimeType,
            exportedAt: Date()
        )

        logger.info("Mind map exported successfully: \(filename)")
        return result
    }

    // MARK: - JSON Export (Subtask 41.1)

    private func exportToJSON(_ mindMap: MindMap, includeMetadata: Bool) throws -> String {
        var exportData: [String: Any] = [
            "format": "MirrorBuddy Mind Map",
            "version": "1.0",
            "nodes": mindMap.nodes.map { nodeToDict($0) }
        ]

        if includeMetadata {
            exportData["metadata"] = [
                "id": mindMap.id.uuidString,
                "materialID": mindMap.materialID.uuidString,
                "exportedAt": ISO8601DateFormatter().string(from: Date()),
                "nodeCount": mindMap.nodes.count
            ]
        }

        let jsonData = try JSONSerialization.data(withJSONObject: exportData, options: [.prettyPrinted, .sortedKeys])
        guard let jsonString = String(data: jsonData, encoding: .utf8) else {
            throw MindMapExportError.encodingFailed
        }

        return jsonString
    }

    private func nodeToDict(_ node: MindMapNode) -> [String: Any] {
        var dict: [String: Any] = [
            "id": node.id.uuidString,
            "title": node.title,
            "positionX": node.positionX,
            "positionY": node.positionY
        ]

        if let content = node.content {
            dict["content"] = content
        }

        if let color = node.color {
            dict["color"] = color
        }

        if let parentID = node.parentNodeID {
            dict["parentID"] = parentID.uuidString
        }

        if !node.childNodes.isEmpty {
            dict["children"] = node.childNodes.map { $0.id.uuidString }
        }

        return dict
    }

    // MARK: - Mermaid Export (Subtask 41.1)

    private func exportToMermaid(_ mindMap: MindMap) throws -> String {
        var mermaid = "graph TD\n"

        // Find root node
        guard let root = mindMap.nodes.first(where: { $0.parentNodeID == nil }) else {
            throw MindMapExportError.noRootNode
        }

        // Create node ID mapping (using index for simplicity)
        var nodeIDs: [UUID: String] = [:]
        for (index, node) in mindMap.nodes.enumerated() {
            nodeIDs[node.id] = "N\(index)"
        }

        // Generate node definitions
        for node in mindMap.nodes {
            guard let nodeID = nodeIDs[node.id] else { continue }

            let escapedTitle = node.title
                .replacingOccurrences(of: "\"", with: "&quot;")
                .replacingOccurrences(of: "[", with: "&#91;")
                .replacingOccurrences(of: "]", with: "&#93;")

            if node.id == root.id {
                mermaid += "    \(nodeID)[(\"\(escapedTitle)\")]\n"
            } else {
                mermaid += "    \(nodeID)[\"\(escapedTitle)\"]\n"
            }

            // Apply color styling if available
            if let color = node.color {
                mermaid += "    style \(nodeID) fill:\(color)\n"
            }
        }

        mermaid += "\n"

        // Generate connections
        for node in mindMap.nodes {
            guard let nodeID = nodeIDs[node.id],
                  let parentID = node.parentNodeID,
                  let parentNodeID = nodeIDs[parentID] else {
                continue
            }

            mermaid += "    \(parentNodeID) --> \(nodeID)\n"
        }

        return mermaid
    }

    // MARK: - OPML Export (Subtask 41.1)

    private func exportToOPML(_ mindMap: MindMap, includeMetadata: Bool) throws -> String {
        var opml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
        opml += "<opml version=\"2.0\">\n"
        opml += "  <head>\n"
        opml += "    <title>MirrorBuddy Mind Map</title>\n"

        if includeMetadata {
            opml += "    <dateCreated>\(RFC822DateFormatter().string(from: Date()))</dateCreated>\n"
            opml += "    <ownerName>MirrorBuddy</ownerName>\n"
        }

        opml += "  </head>\n"
        opml += "  <body>\n"

        // Find root and export recursively
        guard let root = mindMap.nodes.first(where: { $0.parentNodeID == nil }) else {
            throw MindMapExportError.noRootNode
        }

        opml += exportNodeToOPML(root, mindMap: mindMap, indent: 2)

        opml += "  </body>\n"
        opml += "</opml>"

        return opml
    }

    private func exportNodeToOPML(_ node: MindMapNode, mindMap: MindMap, indent: Int) -> String {
        let indentStr = String(repeating: " ", count: indent)
        let escapedTitle = node.title.xmlEscaped

        var opml = "\(indentStr)<outline text=\"\(escapedTitle)\""

        if let content = node.content {
            opml += " _note=\"\(content.xmlEscaped)\""
        }

        if !node.childNodes.isEmpty {
            opml += ">\n"

            for child in node.childNodes {
                opml += exportNodeToOPML(child, mindMap: mindMap, indent: indent + 2)
            }

            opml += "\(indentStr)</outline>\n"
        } else {
            opml += " />\n"
        }

        return opml
    }

    // MARK: - Markdown Export (Subtask 41.1)

    private func exportToMarkdown(_ mindMap: MindMap) throws -> String {
        var markdown = ""

        // Find root
        guard let root = mindMap.nodes.first(where: { $0.parentNodeID == nil }) else {
            throw MindMapExportError.noRootNode
        }

        markdown += "# \(root.title)\n\n"

        if let content = root.content {
            markdown += "\(content)\n\n"
        }

        markdown += "---\n\n"

        // Export children recursively
        for child in root.childNodes {
            markdown += exportNodeToMarkdown(child, level: 2)
        }

        markdown += "\n---\n\n"
        markdown += "*Generated with MirrorBuddy*\n"

        return markdown
    }

    private func exportNodeToMarkdown(_ node: MindMapNode, level: Int) -> String {
        let prefix = String(repeating: "#", count: level)
        var markdown = "\(prefix) \(node.title)\n\n"

        if let content = node.content {
            markdown += "\(content)\n\n"
        }

        // Export children
        for child in node.childNodes {
            markdown += exportNodeToMarkdown(child, level: level + 1)
        }

        return markdown
    }

    // MARK: - File Sharing (Subtask 41.2)

    /// Save export result to temporary file for sharing
    func saveToTemporaryFile(_ result: ExportResult) throws -> URL {
        let tempDir = FileManager.default.temporaryDirectory
        let fileURL = tempDir.appendingPathComponent(result.filename)

        guard let data = result.content.data(using: .utf8) else {
            throw MindMapExportError.encodingFailed
        }

        try data.write(to: fileURL, options: .atomic)
        logger.info("Saved export to temporary file: \(fileURL.path)")

        return fileURL
    }

    /// Get share items for UIActivityViewController
    func getShareItems(for result: ExportResult) throws -> [Any] {
        let fileURL = try saveToTemporaryFile(result)
        return [fileURL]
    }

    // MARK: - Utilities

    private func generateFilename(for mindMap: MindMap, format: ExportFormat) -> String {
        // Try to get material title if available
        let baseName = "mindmap-\(mindMap.id.uuidString.prefix(8))"
        let timestamp = ISO8601DateFormatter().string(from: Date()).prefix(10)
        return "\(baseName)-\(timestamp).\(format.fileExtension)"
    }

    private func RFC822DateFormatter() -> DateFormatter {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE, dd MMM yyyy HH:mm:ss Z"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter
    }
}

// MARK: - Models

/// Export result containing the exported content
struct ExportResult {
    let content: String
    let format: MindMapExportService.ExportFormat
    let filename: String
    let mimeType: String
    let exportedAt: Date

    var sizeInBytes: Int {
        content.utf8.count
    }

    var formattedSize: String {
        let bytes = Double(sizeInBytes)
        if bytes < 1024 {
            return "\(Int(bytes)) B"
        } else if bytes < 1024 * 1024 {
            return String(format: "%.1f KB", bytes / 1024)
        } else {
            return String(format: "%.1f MB", bytes / (1024 * 1024))
        }
    }
}

/// Export settings for user preferences (Subtask 41.3)
struct ExportSettings {
    var defaultFormat: MindMapExportService.ExportFormat
    var includeMetadata: Bool
    var compressLargeExports: Bool

    static let `default` = ExportSettings(
        defaultFormat: .json,
        includeMetadata: true,
        compressLargeExports: true
    )
}

// MARK: - Errors

enum MindMapExportError: LocalizedError {
    case noRootNode
    case encodingFailed
    case invalidFormat
    case exportFailed(Error)

    var errorDescription: String? {
        switch self {
        case .noRootNode:
            return "Mind map has no root node"
        case .encodingFailed:
            return "Failed to encode export content"
        case .invalidFormat:
            return "Invalid export format specified"
        case .exportFailed(let error):
            return "Export failed: \(error.localizedDescription)"
        }
    }
}

// MARK: - String Extensions

extension String {
    var xmlEscaped: String {
        self.replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
            .replacingOccurrences(of: "\"", with: "&quot;")
            .replacingOccurrences(of: "'", with: "&apos;")
    }
}
