import Foundation
import PDFKit
import SwiftData
import UIKit

/// Service for exporting mind maps and summaries to various formats
@MainActor
final class KnowledgeExportService: ObservableObject {
    // MARK: - PDF Export

    /// Export mind map to PDF
    func exportMindMapToPDF(mindMap: MindMap) throws -> URL {
        let pdfMetaData = [
            kCGPDFContextCreator: "MirrorBuddy",
            kCGPDFContextTitle: "Mind Map - \(mindMap.material?.title ?? "Untitled")"
        ]
        let format = UIGraphicsPDFRendererFormat()
        format.documentInfo = pdfMetaData as [String: Any]

        let pageWidth: CGFloat = 612.0 // 8.5 x 11 inches
        let pageHeight: CGFloat = 792.0
        let pageRect = CGRect(x: 0, y: 0, width: pageWidth, height: pageHeight)

        let renderer = UIGraphicsPDFRenderer(bounds: pageRect, format: format)

        let pdfData = renderer.pdfData { context in
            context.beginPage()

            let titleFont = UIFont.systemFont(ofSize: 24, weight: .bold)
            let bodyFont = UIFont.systemFont(ofSize: 12)
            let padding: CGFloat = 40

            // Title
            let title = mindMap.material?.title ?? "Mind Map"
            let titleAttributes: [NSAttributedString.Key: Any] = [
                .font: titleFont,
                .foregroundColor: UIColor.black
            ]
            let titleRect = CGRect(x: padding, y: padding, width: pageWidth - 2 * padding, height: 40)
            title.draw(in: titleRect, withAttributes: titleAttributes)

            // Date
            let dateFormatter = DateFormatter()
            dateFormatter.dateStyle = .medium
            let dateString = "Generated: \(dateFormatter.string(from: mindMap.generatedAt))"
            let dateRect = CGRect(x: padding, y: padding + 45, width: pageWidth - 2 * padding, height: 20)
            dateString.draw(in: dateRect, withAttributes: [.font: bodyFont, .foregroundColor: UIColor.gray])

            // Draw nodes
            var yPosition: CGFloat = padding + 80
            let nodes = mindMap.nodesArray.sorted { ($0.positionY, $0.positionX) < ($1.positionY, $1.positionX) }

            for node in nodes {
                if yPosition > pageHeight - 100 {
                    context.beginPage()
                    yPosition = padding
                }

                // Node title
                let nodeFont = UIFont.systemFont(ofSize: 16, weight: .semibold)
                let nodeRect = CGRect(x: padding, y: yPosition, width: pageWidth - 2 * padding, height: 30)
                node.title.draw(in: nodeRect, withAttributes: [.font: nodeFont, .foregroundColor: UIColor.black])
                yPosition += 35

                // Node content
                if let content = node.content, !content.isEmpty {
                    let contentRect = CGRect(x: padding + 20, y: yPosition, width: pageWidth - 2 * padding - 20, height: 0)
                    let contentSize = content.boundingRect(
                        with: CGSize(width: pageWidth - 2 * padding - 20, height: .greatestFiniteMagnitude),
                        options: [.usesLineFragmentOrigin],
                        attributes: [.font: bodyFont],
                        context: nil
                    ).size

                    let finalRect = CGRect(x: padding + 20, y: yPosition, width: pageWidth - 2 * padding - 20, height: contentSize.height)
                    content.draw(in: finalRect, withAttributes: [.font: bodyFont, .foregroundColor: UIColor.darkGray])
                    yPosition += contentSize.height + 20
                }

                yPosition += 10
            }
        }

        // Save to temporary file
        let tempURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("mindmap_\(mindMap.id.uuidString).pdf")
        try pdfData.write(to: tempURL)

        return tempURL
    }

    /// Export material summary to PDF
    func exportSummaryToPDF(material: Material, summary: String) throws -> URL {
        let pdfMetaData = [
            kCGPDFContextCreator: "MirrorBuddy",
            kCGPDFContextTitle: "Summary - \(material.title)"
        ]
        let format = UIGraphicsPDFRendererFormat()
        format.documentInfo = pdfMetaData as [String: Any]

        let pageWidth: CGFloat = 612.0
        let pageHeight: CGFloat = 792.0
        let pageRect = CGRect(x: 0, y: 0, width: pageWidth, height: pageHeight)

        let renderer = UIGraphicsPDFRenderer(bounds: pageRect, format: format)

        let pdfData = renderer.pdfData { context in
            context.beginPage()

            let titleFont = UIFont.systemFont(ofSize: 24, weight: .bold)
            let bodyFont = UIFont.systemFont(ofSize: 12)
            let padding: CGFloat = 40

            // Title
            let titleAttributes: [NSAttributedString.Key: Any] = [
                .font: titleFont,
                .foregroundColor: UIColor.black
            ]
            let titleRect = CGRect(x: padding, y: padding, width: pageWidth - 2 * padding, height: 40)
            material.title.draw(in: titleRect, withAttributes: titleAttributes)

            // Date
            let dateFormatter = DateFormatter()
            dateFormatter.dateStyle = .medium
            let dateString = "Generated: \(dateFormatter.string(from: Date()))"
            let dateRect = CGRect(x: padding, y: padding + 45, width: pageWidth - 2 * padding, height: 20)
            dateString.draw(in: dateRect, withAttributes: [.font: bodyFont, .foregroundColor: UIColor.gray])

            // Summary content
            var yPosition: CGFloat = padding + 80
            let paragraphs = summary.components(separatedBy: "\n\n")

            for paragraph in paragraphs {
                if yPosition > pageHeight - 100 {
                    context.beginPage()
                    yPosition = padding
                }

                let paragraphSize = paragraph.boundingRect(
                    with: CGSize(width: pageWidth - 2 * padding, height: .greatestFiniteMagnitude),
                    options: [.usesLineFragmentOrigin],
                    attributes: [.font: bodyFont],
                    context: nil
                ).size

                let paragraphRect = CGRect(x: padding, y: yPosition, width: pageWidth - 2 * padding, height: paragraphSize.height)
                paragraph.draw(in: paragraphRect, withAttributes: [.font: bodyFont, .foregroundColor: UIColor.black])

                yPosition += paragraphSize.height + 15
            }
        }

        // Save to temporary file
        let tempURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("summary_\(material.id.uuidString).pdf")
        try pdfData.write(to: tempURL)

        return tempURL
    }

    // MARK: - Markdown Export

    /// Export mind map to Markdown
    func exportMindMapToMarkdown(mindMap: MindMap) -> String {
        var markdown = ""

        // Title
        markdown += "# \(mindMap.material?.title ?? "Mind Map")\n\n"

        // Metadata
        let dateFormatter = DateFormatter()
        dateFormatter.dateStyle = .medium
        markdown += "*Generated: \(dateFormatter.string(from: mindMap.generatedAt))*\n\n"

        if let prompt = mindMap.prompt {
            markdown += "**Prompt:** \(prompt)\n\n"
        }

        markdown += "---\n\n"

        // Build hierarchy
        let rootNodes = mindMap.nodesArray.filter { $0.parentNodeID == nil }

        func processNode(_ node: MindMapNode, level: Int) {
            let indent = String(repeating: "  ", count: level)
            markdown += "\(indent)## \(node.title)\n\n"

            if let content = node.content, !content.isEmpty {
                markdown += "\(indent)\(content)\n\n"
            }

            // Process children
            let children = mindMap.nodesArray.filter { $0.parentNodeID == node.id }
            for child in children {
                processNode(child, level: level + 1)
            }
        }

        for rootNode in rootNodes {
            processNode(rootNode, level: 0)
        }

        return markdown
    }

    /// Export summary to Markdown
    func exportSummaryToMarkdown(material: Material, summary: String) -> String {
        var markdown = ""

        markdown += "# \(material.title)\n\n"

        let dateFormatter = DateFormatter()
        dateFormatter.dateStyle = .medium
        markdown += "*Summary generated: \(dateFormatter.string(from: Date()))*\n\n"

        if let subject = material.subject?.name {
            markdown += "**Subject:** \(subject)\n\n"
        }

        markdown += "---\n\n"
        markdown += summary

        return markdown
    }

    // MARK: - Notion Export

    /// Export mind map to Notion-compatible JSON
    func exportMindMapToNotionJSON(mindMap: MindMap) -> [String: Any] {
        var notionPage: [String: Any] = [:]

        // Page properties
        notionPage["properties"] = [
            "title": [
                "title": [
                    [
                        "text": ["content": mindMap.material?.title ?? "Mind Map"]
                    ]
                ]
            ],
            "Type": ["select": ["name": "Mind Map"]],
            "Generated": ["date": ["start": ISO8601DateFormatter().string(from: mindMap.generatedAt)]]
        ]

        // Content blocks
        var children: [[String: Any]] = []

        // Add prompt if available
        if let prompt = mindMap.prompt {
            children.append([
                "object": "block",
                "type": "callout",
                "callout": [
                    "rich_text": [["type": "text", "text": ["content": "Prompt: \(prompt)"]]],
                    "icon": ["emoji": "💡"]
                ]
            ])
        }

        // Add divider
        children.append(["object": "block", "type": "divider", "divider": [:]])

        // Add nodes
        let rootNodes = mindMap.nodesArray.filter { $0.parentNodeID == nil }

        func addNodeBlocks(_ node: MindMapNode, level: Int) {
            // Heading for node
            let headingType = level == 0 ? "heading_2" : (level == 1 ? "heading_3" : "paragraph")
            children.append([
                "object": "block",
                "type": headingType,
                headingType: [
                    "rich_text": [["type": "text", "text": ["content": node.title]]]
                ]
            ])

            // Content
            if let content = node.content, !content.isEmpty {
                children.append([
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": [
                        "rich_text": [["type": "text", "text": ["content": content]]]
                    ]
                ])
            }

            // Process children
            let nodeChildren = mindMap.nodesArray.filter { $0.parentNodeID == node.id }
            for child in nodeChildren {
                addNodeBlocks(child, level: level + 1)
            }
        }

        for rootNode in rootNodes {
            addNodeBlocks(rootNode, level: 0)
        }

        notionPage["children"] = children

        return notionPage
    }

    /// Export summary to Notion-compatible JSON
    func exportSummaryToNotionJSON(material: Material, summary: String) -> [String: Any] {
        var notionPage: [String: Any] = [:]

        // Page properties
        notionPage["properties"] = [
            "title": [
                "title": [
                    [
                        "text": ["content": material.title]
                    ]
                ]
            ],
            "Type": ["select": ["name": "Summary"]],
            "Subject": ["select": ["name": material.subject?.name ?? "General"]]
        ]

        // Content blocks
        var children: [[String: Any]] = []

        // Split summary into paragraphs
        let paragraphs = summary.components(separatedBy: "\n\n")
        for paragraph in paragraphs {
            if !paragraph.isEmpty {
                children.append([
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": [
                        "rich_text": [["type": "text", "text": ["content": paragraph]]]
                    ]
                ])
            }
        }

        notionPage["children"] = children

        return notionPage
    }

    /// Send content to Notion API
    func sendToNotion(
        notionJSON: [String: Any],
        notionToken: String,
        parentPageID: String
    ) async throws -> String {
        let url = URL(string: "https://api.notion.com/v1/pages")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(notionToken)", forHTTPHeaderField: "Authorization")
        request.setValue("2022-06-28", forHTTPHeaderField: "Notion-Version")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        var payload = notionJSON
        payload["parent"] = ["page_id": parentPageID]

        request.httpBody = try JSONSerialization.data(withJSONObject: payload)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw NSError(domain: "NotionExport", code: -1,
                          userInfo: [NSLocalizedDescriptionKey: "Failed to create Notion page"])
        }

        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let pageID = json?["id"] as? String else {
            throw NSError(domain: "NotionExport", code: -2,
                          userInfo: [NSLocalizedDescriptionKey: "Invalid Notion response"])
        }

        return pageID
    }
}
