//
//  ExtendedVoiceRecordingService.swift
//  MirrorBuddy
//
//  Extended voice recording service for classroom lessons (up to 6 hours)
//  Features: background recording, auto-save, battery monitoring
//

import Foundation
import AVFoundation
import UIKit
import UserNotifications
import Combine
import os.log

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

    // MARK: - Initialization

    private override init() {
        super.init()
        setupAudioSession()
        setupBatteryMonitoring()
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
                options: [.defaultToSpeaker, .allowBluetooth]
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
        await withCheckedContinuation { continuation in
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                continuation.resume(returning: granted)
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
        sessionIdentifier = UUID().uuidString

        // Create recording URL
        let recordingURL = try createRecordingURL(sessionID: self.sessionIdentifier!)
        currentRecordingURL = recordingURL

        // Configure audio recorder with AAC compression
        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 44100.0,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.medium.rawValue,
            AVEncoderBitRateKey: 64000 // 64 kbps for efficient storage
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

        // Update state
        isRecording = false
        isPaused = false

        let url = currentRecordingURL
        currentRecordingURL = nil
        sessionIdentifier = nil
        recordingStartTime = nil

        logger.info("Recording stopped. Duration: \(self.recordingDuration) seconds")

        return await MainActor.run {
            url
        }
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

            try? await UNUserNotificationCenter.current().add(request)
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
                        try? await self.stopRecording()
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
                await self?.autoSaveRecording()
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
        let hours = Int(self.recordingDuration) / 3600
        let minutes = (Int(self.recordingDuration) % 3600) / 60
        let seconds = Int(self.recordingDuration) % 60

        return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
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
