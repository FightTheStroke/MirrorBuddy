//
//  VoiceSessionState.swift
//  MirrorBuddy
//
//  Voice session states for real-time conversation
//  Supports voice-first, neurodiverse-friendly experience
//

import SwiftUI

/// Voice session state for real-time conversation
enum VoiceSessionState: Equatable {
    case inactive              // Not connected, ready to start
    case connecting            // Connecting to OpenAI Realtime API
    case passive               // Connected, listening passively (breathing)
    case listening             // User is speaking
    case thinking              // AI is processing
    case speaking              // AI is responding
    case paused                // Conversation paused, ready to resume
    case error(String)         // Error state with message

    /// Display name for VoiceOver accessibility
    var accessibilityLabel: String {
        switch self {
        case .inactive:
            return "Inattivo. Tocca per iniziare la conversazione."
        case .connecting:
            return "Connessione in corso..."
        case .passive:
            return "In ascolto. Inizia a parlare quando vuoi."
        case .listening:
            return "Ti sto ascoltando..."
        case .thinking:
            return "Sto pensando..."
        case .speaking:
            return "Sto parlando. Interrompimi quando vuoi."
        case .paused:
            return "In pausa. Pronta a riprendere quando vuoi."
        case .error(let message):
            return "Errore: \(message)"
        }
    }

    /// Visual description for context banner
    var statusText: String {
        switch self {
        case .inactive:
            return "Pronta ad ascoltarti"
        case .connecting:
            return "Connessione..."
        case .passive:
            return "Ti ascolto..."
        case .listening:
            return "Sto ascoltando"
        case .thinking:
            return "Sto pensando..."
        case .speaking:
            return "Sto parlando"
        case .paused:
            return "In pausa"
        case .error:
            return "Errore"
        }
    }

    /// Primary color for state visualization
    var primaryColor: Color {
        switch self {
        case .inactive:
            return .gray
        case .connecting:
            return .orange
        case .passive:
            return .blue.opacity(0.6)
        case .listening:
            return .blue
        case .thinking:
            return .green
        case .speaking:
            return .purple
        case .paused:
            return .orange
        case .error:
            return .red
        }
    }

    /// Secondary color for gradients
    var secondaryColor: Color {
        switch self {
        case .inactive:
            return .gray.opacity(0.5)
        case .connecting:
            return .yellow
        case .passive:
            return .cyan.opacity(0.4)
        case .listening:
            return .cyan
        case .thinking:
            return .mint
        case .speaking:
            return .pink
        case .paused:
            return .yellow
        case .error:
            return .red.opacity(0.7)
        }
    }

    /// System icon for state
    var systemIcon: String {
        switch self {
        case .inactive:
            return "mic.slash"
        case .connecting:
            return "antenna.radiowaves.left.and.right"
        case .passive:
            return "waveform"
        case .listening:
            return "mic.fill"
        case .thinking:
            return "brain.head.profile"
        case .speaking:
            return "speaker.wave.3.fill"
        case .paused:
            return "pause.circle.fill"
        case .error:
            return "exclamationmark.triangle.fill"
        }
    }

    /// Should show breathing animation
    var showsBreathing: Bool {
        switch self {
        case .passive, .paused:
            return true
        default:
            return false
        }
    }

    /// Should show active waveform
    var showsActiveWaveform: Bool {
        switch self {
        case .listening, .speaking:
            return true
        default:
            return false
        }
    }

    /// Can be interrupted by user
    var allowsInterruption: Bool {
        switch self {
        case .speaking:
            return true
        default:
            return false
        }
    }

    /// Is actively in conversation
    var isActive: Bool {
        switch self {
        case .passive, .listening, .thinking, .speaking, .paused:
            return true
        default:
            return false
        }
    }
}

/// Voice session configuration for OpenAI Realtime API
struct VoiceSessionConfiguration {
    /// Enable server-side Voice Activity Detection
    var enableVAD: Bool = true

    /// VAD threshold (0.0-1.0, higher = more sensitive)
    var vadThreshold: Double = 0.5

    /// Prefix padding in milliseconds (audio before speech detection)
    var prefixPaddingMs: Int = 300

    /// Silence duration in milliseconds (how long silence before stopping)
    var silenceDurationMs: Int = 700

    /// Voice to use for AI responses
    var voice: VoiceOption = .alloy

    /// Enable audio transcription
    var enableTranscription: Bool = true

    /// Temperature for AI responses (0.0-1.0)
    var temperature: Double = 0.8

    /// Session persistence duration (minutes)
    var sessionPersistenceMinutes: Int = 5

    enum VoiceOption: String, CaseIterable {
        case alloy = "alloy"
        case echo = "echo"
        case fable = "fable"
        case onyx = "onyx"
        case nova = "nova"
        case shimmer = "shimmer"

        var displayName: String {
            rawValue.capitalized
        }
    }
}
