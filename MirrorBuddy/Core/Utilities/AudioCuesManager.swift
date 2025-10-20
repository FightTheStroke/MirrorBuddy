//
//  AudioCuesManager.swift
//  MirrorBuddy
//
//  Audio cues for voice-first interactions
//  Provides non-verbal audio feedback for state changes
//

import AVFoundation
import Foundation
import os.log

/// Manages audio cues for voice conversation states
/// Provides auditory feedback to reduce need for visual attention
@MainActor
final class AudioCuesManager {
    static let shared = AudioCuesManager()

    private let logger = Logger(subsystem: "com.mirrorbuddy", category: "AudioCues")
    private var audioPlayers: [String: AVAudioPlayer] = [:]

    // Audio cue frequencies (in Hz) for simple tone generation
    private enum ToneFrequency: Double {
        case listening = 440.0      // A4 - gentle, welcoming
        case thinking = 523.25      // C5 - processing
        case speaking = 392.0       // G4 - AI responding
        case ready = 329.63         // E4 - ready state
        case error = 277.18         // C#4 - lower, warning
        case success = 587.33       // D5 - confirmation
    }

    private init() {
        setupAudioSession()
    }

    // MARK: - Setup

    private func setupAudioSession() {
        do {
            let audioSession = AVAudioSession.sharedInstance()
            // Use ambient category so it doesn't interrupt other audio
            try audioSession.setCategory(.ambient, mode: .default, options: [.mixWithOthers])
            try audioSession.setActive(true)
        } catch {
            logger.error("Failed to setup audio session: \(error.localizedDescription)")
        }
    }

    // MARK: - Voice State Audio Cues

    /// Play audio cue for state change
    func stateChanged(to state: VoiceSessionState) {
        switch state {
        case .inactive:
            // Silent
            break

        case .connecting:
            playRisingTone()

        case .passive:
            playTone(.ready, duration: 0.1)

        case .listening:
            // Short pleasant tone - user is being heard
            playTone(.listening, duration: 0.15)

        case .thinking:
            // Gentle processing sound
            playTone(.thinking, duration: 0.12)

        case .speaking:
            // Soft descending tone - AI starting to speak
            playDescendingTone()

        case .paused:
            // Two quick tones
            playDoubleTone()

        case .error:
            playTone(.error, duration: 0.2)
        }
    }

    // MARK: - Specific Events

    /// Conversation started successfully
    func conversationStarted() {
        playSuccessChime()
    }

    /// Conversation ended
    func conversationEnded() {
        playGentleFadeOut()
    }

    /// User interrupted AI
    func userInterrupted() {
        // Quick acknowledgment tone
        playTone(.listening, duration: 0.08)
    }

    /// Error occurred
    func errorOccurred() {
        playTone(.error, duration: 0.25)
    }

    // MARK: - Tone Generation

    /// Play a simple sine wave tone
    private func playTone(_ frequency: ToneFrequency, duration: Double, volume: Float = 0.3) {
        let sampleRate = 44100.0
        let samples = Int(sampleRate * duration)

        var audioData = Data(capacity: samples * 2)

        for i in 0..<samples {
            let time = Double(i) / sampleRate
            let amplitude = sin(2.0 * .pi * frequency.rawValue * time)

            // Apply envelope (fade in/out)
            let envelope: Double
            let fadeTime = 0.02 // 20ms fade
            let fadeSamples = Int(fadeTime * sampleRate)

            if i < fadeSamples {
                // Fade in
                envelope = Double(i) / Double(fadeSamples)
            } else if i > samples - fadeSamples {
                // Fade out
                envelope = Double(samples - i) / Double(fadeSamples)
            } else {
                envelope = 1.0
            }

            let sample = Int16(amplitude * envelope * Double(Int16.max) * Double(volume))
            audioData.append(contentsOf: withUnsafeBytes(of: sample.littleEndian) { Array($0) })
        }

        playPCMData(audioData, sampleRate: Int(sampleRate))
    }

    /// Play rising tone (startup)
    private func playRisingTone() {
        let duration = 0.2
        let sampleRate = 44100.0
        let samples = Int(sampleRate * duration)

        var audioData = Data(capacity: samples * 2)

        let startFreq = 200.0
        let endFreq = 400.0

        for i in 0..<samples {
            let time = Double(i) / sampleRate
            let progress = Double(i) / Double(samples)
            let frequency = startFreq + (endFreq - startFreq) * progress
            let amplitude = sin(2.0 * .pi * frequency * time)

            let envelope = 1.0 - (progress * 0.5) // Gentle fade
            let sample = Int16(amplitude * envelope * Double(Int16.max) * 0.25)
            audioData.append(contentsOf: withUnsafeBytes(of: sample.littleEndian) { Array($0) })
        }

        playPCMData(audioData, sampleRate: Int(sampleRate))
    }

    /// Play descending tone (AI starting)
    private func playDescendingTone() {
        let duration = 0.15
        let sampleRate = 44100.0
        let samples = Int(sampleRate * duration)

        var audioData = Data(capacity: samples * 2)

        let startFreq = 500.0
        let endFreq = 350.0

        for i in 0..<samples {
            let time = Double(i) / sampleRate
            let progress = Double(i) / Double(samples)
            let frequency = startFreq - (startFreq - endFreq) * progress
            let amplitude = sin(2.0 * .pi * frequency * time)

            let envelope = 1.0 - (progress * 0.3)
            let sample = Int16(amplitude * envelope * Double(Int16.max) * 0.25)
            audioData.append(contentsOf: withUnsafeBytes(of: sample.littleEndian) { Array($0) })
        }

        playPCMData(audioData, sampleRate: Int(sampleRate))
    }

    /// Play double tone (pause)
    private func playDoubleTone() {
        playTone(.ready, duration: 0.08, volume: 0.2)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            self?.playTone(.ready, duration: 0.08, volume: 0.2)
        }
    }

    /// Play success chime
    private func playSuccessChime() {
        playTone(.ready, duration: 0.1, volume: 0.25)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) { [weak self] in
            self?.playTone(.success, duration: 0.12, volume: 0.25)
        }
    }

    /// Play gentle fade out
    private func playGentleFadeOut() {
        playTone(.speaking, duration: 0.15, volume: 0.2)
    }

    // MARK: - PCM Playback

    /// Play raw PCM audio data
    private func playPCMData(_ data: Data, sampleRate: Int) {
        // Create a temporary file for the audio data
        let tempURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString)
            .appendingPathExtension("wav")

        // Write WAV header + data
        guard let wavData = createWAVData(from: data, sampleRate: sampleRate) else {
            logger.error("Failed to create WAV data")
            return
        }

        do {
            try wavData.write(to: tempURL)

            let player = try AVAudioPlayer(contentsOf: tempURL)
            player.volume = 1.0
            player.prepareToPlay()
            player.play()

            // Store player to keep it alive
            let key = UUID().uuidString
            audioPlayers[key] = player

            // Clean up after playback
            DispatchQueue.main.asyncAfter(deadline: .now() + player.duration + 0.1) { [weak self] in
                self?.audioPlayers.removeValue(forKey: key)
                try? FileManager.default.removeItem(at: tempURL)
            }
        } catch {
            logger.error("Failed to play audio: \(error.localizedDescription)")
        }
    }

    /// Create WAV file data from PCM samples
    private func createWAVData(from pcmData: Data, sampleRate: Int) -> Data? {
        var wavData = Data()

        // WAV header
        let audioFormat: UInt16 = 1 // PCM
        let numChannels: UInt16 = 1 // Mono
        let bitsPerSample: UInt16 = 16
        let byteRate = UInt32(sampleRate * Int(numChannels) * Int(bitsPerSample) / 8)
        let blockAlign = UInt16(numChannels * bitsPerSample / 8)
        let dataSize = UInt32(pcmData.count)

        // RIFF chunk
        wavData.append("RIFF".data(using: .ascii)!)
        wavData.append(contentsOf: withUnsafeBytes(of: (36 + dataSize).littleEndian) { Array($0) })
        wavData.append("WAVE".data(using: .ascii)!)

        // fmt chunk
        wavData.append("fmt ".data(using: .ascii)!)
        wavData.append(contentsOf: withUnsafeBytes(of: UInt32(16).littleEndian) { Array($0) })
        wavData.append(contentsOf: withUnsafeBytes(of: audioFormat.littleEndian) { Array($0) })
        wavData.append(contentsOf: withUnsafeBytes(of: numChannels.littleEndian) { Array($0) })
        wavData.append(contentsOf: withUnsafeBytes(of: UInt32(sampleRate).littleEndian) { Array($0) })
        wavData.append(contentsOf: withUnsafeBytes(of: byteRate.littleEndian) { Array($0) })
        wavData.append(contentsOf: withUnsafeBytes(of: blockAlign.littleEndian) { Array($0) })
        wavData.append(contentsOf: withUnsafeBytes(of: bitsPerSample.littleEndian) { Array($0) })

        // data chunk
        wavData.append("data".data(using: .ascii)!)
        wavData.append(contentsOf: withUnsafeBytes(of: dataSize.littleEndian) { Array($0) })
        wavData.append(pcmData)

        return wavData
    }

    // MARK: - Stop All

    /// Stop all playing audio cues
    func stopAll() {
        audioPlayers.values.forEach { $0.stop() }
        audioPlayers.removeAll()
    }
}
