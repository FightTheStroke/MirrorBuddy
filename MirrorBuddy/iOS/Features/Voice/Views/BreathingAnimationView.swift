//
//  BreathingAnimationView.swift
//  MirrorBuddy
//
//  Calming breathing animation for passive listening state
//  Neurodiverse-friendly visual feedback
//

import SwiftUI

/// Breathing animation view for passive listening state
/// Provides calm, non-distracting visual feedback that MirrorBuddy is ready
struct BreathingAnimationView: View {
    let state: VoiceSessionState
    let size: CGFloat

    @State private var breatheIn = false

    var body: some View {
        ZStack {
            // Outer breathing ring
            Circle()
                .stroke(
                    LinearGradient(
                        colors: [
                            state.primaryColor.opacity(0.3),
                            state.secondaryColor.opacity(0.3)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 4
                )
                .scaleEffect(breatheIn ? 1.15 : 1.0)
                .opacity(breatheIn ? 0.3 : 0.6)
                .animation(
                    .easeInOut(duration: 3.5).repeatForever(autoreverses: true),
                    value: breatheIn
                )

            // Middle breathing ring
            Circle()
                .stroke(
                    LinearGradient(
                        colors: [
                            state.primaryColor.opacity(0.5),
                            state.secondaryColor.opacity(0.5)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 3
                )
                .scaleEffect(breatheIn ? 1.1 : 1.0)
                .opacity(breatheIn ? 0.4 : 0.7)
                .animation(
                    .easeInOut(duration: 3.5)
                        .repeatForever(autoreverses: true)
                        .delay(0.3),
                    value: breatheIn
                )

            // Inner breathing ring
            Circle()
                .stroke(
                    LinearGradient(
                        colors: [
                            state.primaryColor.opacity(0.7),
                            state.secondaryColor.opacity(0.7)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 2
                )
                .scaleEffect(breatheIn ? 1.05 : 1.0)
                .opacity(breatheIn ? 0.5 : 0.8)
                .animation(
                    .easeInOut(duration: 3.5)
                        .repeatForever(autoreverses: true)
                        .delay(0.6),
                    value: breatheIn
                )

            // Center icon
            Image(systemName: state.systemIcon)
                .font(.system(size: size * 0.4))
                .foregroundStyle(
                    LinearGradient(
                        colors: [state.primaryColor, state.secondaryColor],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .scaleEffect(breatheIn ? 1.05 : 1.0)
                .animation(
                    .easeInOut(duration: 3.5).repeatForever(autoreverses: true),
                    value: breatheIn
                )
        }
        .frame(width: size, height: size)
        .onAppear {
            breatheIn = true
        }
    }
}

/// Active waveform visualization for listening/speaking states
struct ActiveWaveformView: View {
    let state: VoiceSessionState
    let amplitudes: [CGFloat]
    let size: CGFloat

    var body: some View {
        HStack(spacing: 6) {
            ForEach(0..<amplitudes.count, id: \.self) { index in
                RoundedRectangle(cornerRadius: 3)
                    .fill(
                        LinearGradient(
                            colors: [state.primaryColor, state.secondaryColor],
                            startPoint: .bottom,
                            endPoint: .top
                        )
                    )
                    .frame(
                        width: 5,
                        height: max(8, amplitudes[index] * size)
                    )
                    .animation(.easeInOut(duration: 0.15), value: amplitudes[index])
            }
        }
        .frame(height: size)
    }
}

/// Combined voice state visualization
/// Switches between breathing and waveform based on state
struct VoiceStateVisualization: View {
    let state: VoiceSessionState
    let waveformAmplitudes: [CGFloat]
    let size: CGFloat

    var body: some View {
        ZStack {
            if state.showsBreathing {
                BreathingAnimationView(state: state, size: size)
                    .transition(.scale.combined(with: .opacity))
            } else if state.showsActiveWaveform {
                ActiveWaveformView(
                    state: state,
                    amplitudes: waveformAmplitudes,
                    size: size
                )
                .transition(.scale.combined(with: .opacity))
            } else {
                // Static icon for other states
                Image(systemName: state.systemIcon)
                    .font(.system(size: size * 0.5))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [state.primaryColor, state.secondaryColor],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .transition(.scale.combined(with: .opacity))
            }
        }
        .animation(.easeInOut(duration: 0.3), value: state)
    }
}

// MARK: - Previews

#Preview("Breathing - Passive") {
    VStack(spacing: 40) {
        Text("Passive Listening")
            .font(.headline)

        BreathingAnimationView(
            state: .passive,
            size: 200
        )
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(Color(.systemBackground))
}

#Preview("Breathing - Paused") {
    VStack(spacing: 40) {
        Text("Paused")
            .font(.headline)

        BreathingAnimationView(
            state: .paused,
            size: 200
        )
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(Color(.systemBackground))
}

#Preview("Active Waveform - Listening") {
    VStack(spacing: 40) {
        Text("User Speaking")
            .font(.headline)

        ActiveWaveformView(
            state: .listening,
            amplitudes: [0.3, 0.6, 0.9, 0.7, 0.4, 0.8, 0.5, 0.6, 0.9, 0.3,
                        0.5, 0.7, 0.4, 0.6, 0.8, 0.3, 0.5, 0.9, 0.6, 0.4],
            size: 100
        )
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(Color(.systemBackground))
}

#Preview("Active Waveform - Speaking") {
    VStack(spacing: 40) {
        Text("AI Speaking")
            .font(.headline)

        ActiveWaveformView(
            state: .speaking,
            amplitudes: [0.4, 0.7, 0.5, 0.8, 0.6, 0.3, 0.9, 0.5, 0.4, 0.7,
                        0.6, 0.8, 0.4, 0.5, 0.7, 0.9, 0.3, 0.6, 0.8, 0.5],
            size: 100
        )
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(Color(.systemBackground))
}

#Preview("Combined Visualization") {
    VStack(spacing: 40) {
        ForEach([
            VoiceSessionState.passive,
            .listening,
            .thinking,
            .speaking,
            .paused
        ], id: \.statusText) { state in
            VStack(spacing: 12) {
                Text(state.statusText)
                    .font(.headline)

                VoiceStateVisualization(
                    state: state,
                    waveformAmplitudes: Array(repeating: CGFloat.random(in: 0.3...0.9), count: 20),
                    size: 120
                )
            }
        }
    }
    .padding()
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(Color(.systemBackground))
}
