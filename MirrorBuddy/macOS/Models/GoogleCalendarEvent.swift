#if os(macOS)
import Foundation
import SwiftData

/// Google Calendar event model for macOS
/// Note: iOS uses GCalendarEvent struct + GCalendarEventModel @Model separately in GoogleCalendarService.swift
@Model
final class GoogleCalendarEvent {
    @Attribute(.unique) var id: String
    var calendarID: String
    var summary: String
    var eventDescription: String?
    var location: String?
    var startDate: Date
    var endDate: Date
    var isAllDay: Bool

    init(
        id: String,
        calendarID: String,
        summary: String,
        description: String?,
        location: String?,
        startDate: Date,
        endDate: Date,
        isAllDay: Bool
    ) {
        self.id = id
        self.calendarID = calendarID
        self.summary = summary
        self.eventDescription = description
        self.location = location
        self.startDate = startDate
        self.endDate = endDate
        self.isAllDay = isAllDay
    }
}
#endif
