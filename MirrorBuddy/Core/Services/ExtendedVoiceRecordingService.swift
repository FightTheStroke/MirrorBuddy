//
//  ExtendedVoiceRecordingService.swift
//  MirrorBuddy
//
//  Extended voice recording service for classroom lessons (up to 6 hours)
//  Features: background recording, auto-save, battery monitoring
//

import AVFoundation
import Combine
import Foundation
import os.log
import UIKit
import UserNotifications

/// Extended voice recording service for long classroom recordings
final class ExtendedVoiceRecordingService: NSObject, ObservableObject {
    @MainActor static let shared = ExtendedVoiceRecordingService()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "ExtendedRecording")

    // MARK: - Published State

    @Published var isRecording: Bool = false
    @Published var isPaused: Bool = false
    @Published var recordingDuration: TimeInterval = 0
    @Published var currentRecordingURL: URL?
    @Published var batteryLevel: Float = 1.0
    @Published var isLowBattery: Bool = false
    @Published var recordingStats: RecordingStats?

    // MARK: - Configuration

    /// Maximum recording duration (6 hours)
    private let maxRecordingDuration: TimeInterval = 6 * 60 * 60 // 6 hours

    /// Auto-save interval (30 minutes)
    private let autoSaveInterval: TimeInterval = 30 * 60 // 30 minutes

    /// Low battery threshold (20%)
    private let lowBatteryThreshold: Float = 0.20

    // MARK: - Private Properties

    private var audioRecorder: AVAudioRecorder?
    private var recordingTimer: Timer?
    private var autoSaveTimer: Timer?
    private var recordingStartTime: Date?
    private var sessionIdentifier: String?
    private var backupSegments: [URL] = []
    private var memoryWarningObserver: NSObjectProtocol?

    // MARK: - Initialization

    override private init() {
        super.init()
        setupAudioSession()
        setupBatteryMonitoring()
        setupMemoryMonitoring()
        cleanupAbandonedSessions()
    }

    // MARK: - Audio Session Setup (Subtask 91.1)

    /// Configure audio session for background recording
    private func setupAudioSession() {
        let audioSession = AVAudioSession.sharedInstance()

        do {
            // Configure for recording with background support
            try audioSession.setCategory(
                .playAndRecord,
                mode: .default,
                options: [.defaultToSpeaker, .allowBluetoothHFP]
            )

            // Enable background audio
            try audioSession.setActive(true)

            logger.info("Audio session configured for background recording")
        } catch {
            logger.error("Failed to setup audio session: \(error.localizedDescription)")
        }
    }

    /// Request microphone permission
    func requestMicrophonePermission() async -> Bool {
        if #available(iOS 17.0, *) {
            return await withCheckedContinuation { continuation in
                AVAudioApplication.requestRecordPermission { granted in
                    continuation.resume(returning: granted)
                }
            }
        } else {
            return await withCheckedContinuation { continuation in
                AVAudioSession.sharedInstance().requestRecordPermission { granted in
                    continuation.resume(returning: granted)
                }
            }
        }
    }

    // MARK: - Recording Control

    /// Start a new recording session
    @MainActor func startRecording() async throws {
        guard !isRecording else {
            logger.warning("Recording already in progress")
            return
        }

        // Check microphone permission
        let hasPermission = await requestMicrophonePermission()
        guard hasPermission else {
            throw RecordingError.permissionDenied
        }

        // Check battery level
        updateBatteryLevel()
        if isLowBattery {
            logger.warning("Starting recording with low battery (\(self.batteryLevel * 100)%)")
        }

        // Generate session identifier
        let newSessionID = UUID().uuidString
        sessionIdentifier = newSessionID

        // Create recording URL
        let recordingURL = try createRecordingURL(sessionID: newSessionID)
        currentRecordingURL = recordingURL

        // Configure audio recorder with AAC compression
        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 44_100.0,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.medium.rawValue,
            AVEncoderBitRateKey: 64_000 // 64 kbps for efficient storage
        ]

        // Create and start recorder
        audioRecorder = try AVAudioRecorder(url: recordingURL, settings: settings)
        audioRecorder?.delegate = self
        audioRecorder?.isMeteringEnabled = true

        guard audioRecorder?.record() == true else {
            throw RecordingError.recordingFailed
        }

        // Update state
        isRecording = true
        isPaused = false
        recordingStartTime = Date()
        recordingDuration = 0

        // Start timers
        startTimers()

        logger.info("Started recording session: \(self.sessionIdentifier ?? "unknown")")
    }

    /// Pause current recording
    @MainActor func pauseRecording() {
        guard isRecording, !isPaused else { return }

        audioRecorder?.pause()
        isPaused = true
        stopTimers()

        logger.info("Recording paused at \(self.recordingDuration) seconds")
    }

    /// Resume paused recording
    @MainActor func resumeRecording() {
        guard isRecording, isPaused else { return }

        audioRecorder?.record()
        isPaused = false
        startTimers()

        logger.info("Recording resumed")
    }

    /// Stop current recording
    @MainActor func stopRecording() async throws -> URL? {
        guard isRecording else { return nil }

        audioRecorder?.stop()
        stopTimers()

        // Calculate final stats
        let finalDuration = recordingDuration
        let fileSize = try? currentRecordingURL.flatMap {
            try FileManager.default.attributesOfItem(atPath: $0.path)[.size] as? Int64
        }

        // Merge segments if there are backups
        let finalURL: URL?
        if !backupSegments.isEmpty, let mainURL = currentRecordingURL {
            finalURL = try await mergeRecordingSegments(mainURL: mainURL, backups: backupSegments)
        } else {
            finalURL = currentRecordingURL
        }

        // Create final stats
        recordingStats = RecordingStats(
            duration: finalDuration,
            fileSize: fileSize ?? 0,
            segmentCount: backupSegments.count + 1,
            quality: "64 kbps AAC",
            sessionID: sessionIdentifier ?? "unknown"
        )

        // Send completion notification
        sendCompletionNotification(duration: finalDuration)

        // Update state
        isRecording = false
        isPaused = false
        currentRecordingURL = nil
        sessionIdentifier = nil
        recordingStartTime = nil
        backupSegments.removeAll()

        logger.info("Recording stopped. Duration: \(finalDuration) seconds. Final URL: \(finalURL?.lastPathComponent ?? "none")")

        return finalURL
    }

    // MARK: - Auto-Save (Subtask 91.2)

    /// Save current recording segment
    @MainActor private func autoSaveRecording() {
        guard isRecording, let recorder = audioRecorder else { return }

        logger.info("Auto-saving recording at \(self.recordingDuration) seconds")

        // Get current recording URL
        let currentURL = recorder.url

        // Pause briefly to ensure data is written
        let wasPaused = isPaused
        if !wasPaused {
            recorder.pause()
        }

        // Create backup copy
        _Concurrency.Task { [weak self] in
            guard let self else { return }
            do {
                let backupURL = try await self.createBackupURL(
                    sessionID: self.sessionIdentifier ?? "unknown",
                    segmentNumber: Int(self.recordingDuration / self.autoSaveInterval)
                )

                try FileManager.default.copyItem(at: currentURL, to: backupURL)

                // Track backup segment
                await MainActor.run {
                    self.backupSegments.append(backupURL)
                }

                logger.info("Auto-save completed: \(backupURL.lastPathComponent)")
            } catch {
                logger.error("Auto-save failed: \(error.localizedDescription)")
            }

            // Resume if wasn't paused
            await MainActor.run {
                if !wasPaused {
                    recorder.record()
                }
            }
        }
    }

    // MARK: - Battery Monitoring (Subtask 91.3)

    /// Setup battery monitoring
    private func setupBatteryMonitoring() {
        UIDevice.current.isBatteryMonitoringEnabled = true

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(batteryLevelDidChange),
            name: UIDevice.batteryLevelDidChangeNotification,
            object: nil
        )

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(batteryStateDidChange),
            name: UIDevice.batteryStateDidChangeNotification,
            object: nil
        )

        updateBatteryLevel()
    }

    @objc private func batteryLevelDidChange() {
        updateBatteryLevel()
    }

    @objc private func batteryStateDidChange() {
        updateBatteryLevel()
    }

    @MainActor private func updateBatteryLevel() {
        batteryLevel = UIDevice.current.batteryLevel

        let wasLowBattery = isLowBattery
        isLowBattery = batteryLevel > 0 && batteryLevel <= lowBatteryThreshold

        if isLowBattery && !wasLowBattery {
            logger.warning("Low battery detected: \(self.batteryLevel * 100)%")
            sendLowBatteryNotification()
        }
    }

    private func sendLowBatteryNotification() {
        _Concurrency.Task {
            let content = UNMutableNotificationContent()
            content.title = "Batteria scarica"
            content.body = "La batteria è al \(Int(self.batteryLevel * 100))%. Collega il caricatore per continuare la registrazione."
            content.sound = .default

            let request = UNNotificationRequest(
                identifier: "low-battery-\(Date().timeIntervalSince1970)",
                content: content,
                trigger: nil
            )

            do {
                try await UNUserNotificationCenter.current().add(request)
            } catch {
                self.logger.error("Failed to schedule low battery notification: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Timers

    @MainActor private func startTimers() {
        // Recording duration timer (updates every second)
        recordingTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            guard let self else { return }

            _Concurrency.Task { @MainActor [weak self] in
                guard let self else { return }
                if let startTime = self.recordingStartTime {
                    self.recordingDuration = Date().timeIntervalSince(startTime)

                    // Check max duration
                    if self.recordingDuration >= self.maxRecordingDuration {
                        do {
                            try await self.stopRecording()
                        } catch {
                            self.logger.error("Failed to stop recording after reaching max duration: \(error.localizedDescription)")
                        }
                        self.logger.warning("Maximum recording duration reached (6 hours)")
                    }
                }
            }
        }

        // Auto-save timer (every 30 minutes)
        autoSaveTimer = Timer.scheduledTimer(
            withTimeInterval: autoSaveInterval,
            repeats: true
        ) { [weak self] _ in
            _Concurrency.Task { @MainActor [weak self] in
                self?.autoSaveRecording()
            }
        }
    }

    @MainActor private func stopTimers() {
        recordingTimer?.invalidate()
        recordingTimer = nil

        autoSaveTimer?.invalidate()
        autoSaveTimer = nil
    }

    // MARK: - File Management

    private func createRecordingURL(sessionID: String) throws -> URL {
        let documentsPath = FileManager.default.urls(
            for: .documentDirectory,
            in: .userDomainMask
        )[0]

        let recordingsPath = documentsPath.appendingPathComponent("Recordings", isDirectory: true)

        // Create directory if needed
        try FileManager.default.createDirectory(
            at: recordingsPath,
            withIntermediateDirectories: true
        )

        let fileName = "lesson_\(sessionID).m4a"
        return recordingsPath.appendingPathComponent(fileName)
    }

    private func createBackupURL(sessionID: String, segmentNumber: Int) async throws -> URL {
        let documentsPath = FileManager.default.urls(
            for: .documentDirectory,
            in: .userDomainMask
        )[0]

        let backupsPath = documentsPath.appendingPathComponent("Recordings/Backups", isDirectory: true)

        // Create directory if needed
        try FileManager.default.createDirectory(
            at: backupsPath,
            withIntermediateDirectories: true
        )

        let fileName = "lesson_\(sessionID)_segment\(segmentNumber).m4a"
        return backupsPath.appendingPathComponent(fileName)
    }

    // MARK: - Formatted Duration

    @MainActor var formattedDuration: String {
        let hours = Int(self.recordingDuration) / 3_600
        let minutes = (Int(self.recordingDuration) % 3_600) / 60
        let seconds = Int(self.recordingDuration) % 60

        return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
    }

    // MARK: - Session Management (Subtask 91.5)

    /// Merge recording segments into single file
    private func mergeRecordingSegments(mainURL: URL, backups: [URL]) async throws -> URL {
        logger.info("Merging \(backups.count + 1) recording segments...")

        let composition = AVMutableComposition()

        guard let audioTrack = composition.addMutableTrack(
            withMediaType: .audio,
            preferredTrackID: kCMPersistentTrackID_Invalid
        ) else {
            throw RecordingError.recordingFailed
        }

        var currentTime = CMTime.zero

        // Add all backup segments first (in order)
        for backupURL in backups.sorted(by: { $0.lastPathComponent < $1.lastPathComponent }) {
            let asset = AVAsset(url: backupURL)

            guard let assetTrack = try await asset.loadTracks(withMediaType: .audio).first else {
                logger.warning("Skipping invalid backup segment: \(backupURL.lastPathComponent)")
                continue
            }

            let duration = try await asset.load(.duration)
            let timeRange = CMTimeRange(start: .zero, duration: duration)

            try audioTrack.insertTimeRange(timeRange, of: assetTrack, at: currentTime)
            currentTime = CMTimeAdd(currentTime, duration)
        }

        // Add main recording file last
        let mainAsset = AVAsset(url: mainURL)
        if let mainTrack = try await mainAsset.loadTracks(withMediaType: .audio).first {
            let duration = try await mainAsset.load(.duration)
            let timeRange = CMTimeRange(start: .zero, duration: duration)
            try audioTrack.insertTimeRange(timeRange, of: mainTrack, at: currentTime)
        }

        // Export merged file
        let mergedURL = try createMergedURL(sessionID: sessionIdentifier ?? "unknown")

        guard let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetAppleM4A) else {
            throw RecordingError.recordingFailed
        }

        exporter.outputURL = mergedURL
        exporter.outputFileType = .m4a

        await exporter.export()

        if exporter.status == .completed {
            logger.info("Merge completed successfully: \(mergedURL.lastPathComponent)")

            // Clean up backup segments
            for backupURL in backups {
                try? FileManager.default.removeItem(at: backupURL)
            }

            // Remove original main file if different from merged
            if mainURL != mergedURL {
                try? FileManager.default.removeItem(at: mainURL)
            }

            return mergedURL
        } else {
            throw RecordingError.recordingFailed
        }
    }

    /// Create URL for merged recording
    private func createMergedURL(sessionID: String) throws -> URL {
        let documentsPath = FileManager.default.urls(
            for: .documentDirectory,
            in: .userDomainMask
        )[0]

        let recordingsPath = documentsPath.appendingPathComponent("Recordings", isDirectory: true)

        let fileName = "lesson_\(sessionID)_merged.m4a"
        return recordingsPath.appendingPathComponent(fileName)
    }

    /// Setup memory monitoring for long recordings
    private func setupMemoryMonitoring() {
        memoryWarningObserver = NotificationCenter.default.addObserver(
            forName: UIApplication.didReceiveMemoryWarningNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            _Concurrency.Task { @MainActor [weak self] in
                self?.handleMemoryWarning()
            }
        }
    }

    /// Handle memory warning during recording
    @MainActor private func handleMemoryWarning() {
        guard isRecording else { return }

        logger.warning("Memory warning received during recording")

        // Trigger immediate auto-save to free memory
        autoSaveRecording()

        // Consider reducing recording quality if needed (future enhancement)
    }

    /// Send notification when recording completes
    private func sendCompletionNotification(duration: TimeInterval) {
        _Concurrency.Task {
            let content = UNMutableNotificationContent()
            content.title = "Registrazione Completata"

            let hours = Int(duration) / 3_600
            let minutes = (Int(duration) % 3_600) / 60

            if hours > 0 {
                content.body = "Lezione registrata: \(hours)h \(minutes)m salvata con successo."
            } else {
                content.body = "Lezione registrata: \(minutes) minuti salvata con successo."
            }

            content.sound = .default

            let request = UNNotificationRequest(
                identifier: "recording-complete-\(Date().timeIntervalSince1970)",
                content: content,
                trigger: nil
            )

            do {
                try await UNUserNotificationCenter.current().add(request)
            } catch {
                self.logger.error("Failed to schedule recording completion notification: \(error.localizedDescription)")
            }
        }
    }

    /// Clean up abandoned recording sessions on init
    private func cleanupAbandonedSessions() {
        _Concurrency.Task { [weak self] in
            guard let self else { return }

            do {
                let documentsPath = FileManager.default.urls(
                    for: .documentDirectory,
                    in: .userDomainMask
                )[0]

                let backupsPath = documentsPath.appendingPathComponent("Recordings/Backups", isDirectory: true)

                // Check if backups directory exists
                guard FileManager.default.fileExists(atPath: backupsPath.path) else {
                    return
                }

                let backupFiles = try FileManager.default.contentsOfDirectory(
                    at: backupsPath,
                    includingPropertiesForKeys: [.creationDateKey],
                    options: .skipsHiddenFiles
                )

                // Remove backup files older than 7 days
                let sevenDaysAgo = Date().addingTimeInterval(-7 * 24 * 60 * 60)

                for fileURL in backupFiles {
                    let attributes = try FileManager.default.attributesOfItem(atPath: fileURL.path)
                    if let creationDate = attributes[.creationDate] as? Date,
                       creationDate < sevenDaysAgo {
                        try FileManager.default.removeItem(at: fileURL)
                        logger.info("Cleaned up old backup: \(fileURL.lastPathComponent)")
                    }
                }
            } catch {
                logger.error("Cleanup failed: \(error.localizedDescription)")
            }
        }
    }

    /// Get current recording statistics
    @MainActor func getRecordingStatistics() -> RecordingStats? {
        guard isRecording else { return recordingStats }

        let fileSize = try? currentRecordingURL.flatMap {
            try FileManager.default.attributesOfItem(atPath: $0.path)[.size] as? Int64
        }

        return RecordingStats(
            duration: recordingDuration,
            fileSize: fileSize ?? 0,
            segmentCount: backupSegments.count + 1,
            quality: "64 kbps AAC",
            sessionID: sessionIdentifier ?? "unknown"
        )
    }
}

// MARK: - Recording Statistics

struct RecordingStats {
    let duration: TimeInterval
    let fileSize: Int64
    let segmentCount: Int
    let quality: String
    let sessionID: String

    var fileSizeMB: Double {
        Double(fileSize) / (1_024 * 1_024)
    }

    var formattedDuration: String {
        let hours = Int(duration) / 3_600
        let minutes = (Int(duration) % 3_600) / 60
        let seconds = Int(duration) % 60
        return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
    }

    var formattedFileSize: String {
        if fileSizeMB < 1 {
            return String(format: "%.1f KB", Double(fileSize) / 1_024)
        } else {
            return String(format: "%.1f MB", fileSizeMB)
        }
    }
}

// MARK: - AVAudioRecorderDelegate

extension ExtendedVoiceRecordingService: AVAudioRecorderDelegate {
    nonisolated func audioRecorderDidFinishRecording(
        _ recorder: AVAudioRecorder,
        successfully flag: Bool
    ) {
        _Concurrency.Task { @MainActor [weak self] in
            guard let self else { return }
            if flag {
                logger.info("Recording finished successfully")
            } else {
                logger.error("Recording finished with error")
            }
        }
    }

    nonisolated func audioRecorderEncodeErrorDidOccur(
        _ recorder: AVAudioRecorder,
        error: Error?
    ) {
        _Concurrency.Task { @MainActor [weak self] in
            guard let self else { return }
            logger.error("Recording encode error: \(error?.localizedDescription ?? "unknown")")
        }
    }
}

// MARK: - Errors

enum RecordingError: LocalizedError {
    case permissionDenied
    case recordingFailed
    case maxDurationReached
    case lowBattery

    var errorDescription: String? {
        switch self {
        case .permissionDenied:
            return "Accesso al microfono negato"
        case .recordingFailed:
            return "Impossibile avviare la registrazione"
        case .maxDurationReached:
            return "Durata massima registrazione raggiunta (6 ore)"
        case .lowBattery:
            return "Batteria scarica. Collega il caricatore."
        }
    }
}
