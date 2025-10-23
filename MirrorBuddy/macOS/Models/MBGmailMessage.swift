#if os(macOS)
import Foundation
import SwiftData

/// Gmail message model for macOS
/// Note: iOS uses its own MBGmailMessage struct + MBGmailMessageModel @Model in GmailService.swift
@Model
final class MBGmailMessage {
    @Attribute(.unique) var id: String
    var threadId: String
    var subject: String
    var from: String
    var snippet: String
    var body: String
    var receivedDate: Date
    var isRead: Bool
    var hasAttachments: Bool

    init(
        id: String,
        threadId: String,
        subject: String,
        from: String,
        snippet: String,
        body: String,
        receivedDate: Date,
        isRead: Bool,
        hasAttachments: Bool
    ) {
        self.id = id
        self.threadId = threadId
        self.subject = subject
        self.from = from
        self.snippet = snippet
        self.body = body
        self.receivedDate = receivedDate
        self.isRead = isRead
        self.hasAttachments = hasAttachments
    }
}
#endif
