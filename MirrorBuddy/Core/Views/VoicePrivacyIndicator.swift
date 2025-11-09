//
//  VoicePrivacyIndicator.swift
//  MirrorBuddy
//
//  Privacy indicator for continuous voice listening
//  Always visible when microphone is active
//  Inspired by iOS system privacy indicators
//

import SwiftUI

/// Privacy indicator showing continuous voice listening status
struct VoicePrivacyIndicator: View {
    @ObservedObject var voiceEngine: ContinuousVoiceEngine
    @State private var isPulsing: Bool = false

    var body: some View {
        HStack(spacing: 6) {
            // Pulsing microphone icon
            Image(systemName: "mic.fill")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(.white)
                .opacity(isPulsing ? 1.0 : 0.6)

            // "Recording" text
            Text("Recording")
                .font(.openDyslexic(size: 12, weight: .semibold))
                .foregroundStyle(.white)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background {
            Capsule()
                .fill(.red.gradient)
                .shadow(color: .red.opacity(0.3), radius: 8, x: 0, y: 2)
        }
        .onAppear {
            startPulsingAnimation()
        }
    }

    private func startPulsingAnimation() {
        withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
            isPulsing = true
        }
    }
}

/// Extended version with waveform visualization
struct VoicePrivacyIndicatorWithWaveform: View {
    @ObservedObject var voiceEngine: ContinuousVoiceEngine

    var body: some View {
        VStack(spacing: 8) {
            // Privacy indicator
            HStack(spacing: 6) {
                Image(systemName: "mic.fill")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.white)

                Text("Recording")
                    .font(.openDyslexic(size: 12, weight: .semibold))
                    .foregroundStyle(.white)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background {
                Capsule()
                    .fill(.red.gradient)
            }

            // Waveform visualization
            AudioWaveformView(amplitudes: voiceEngine.waveformAmplitudes)
                .frame(height: 40)
                .padding(.horizontal, 24)
        }
    }
}

/// Audio waveform visualization
struct AudioWaveformView: View {
    let amplitudes: [Float]

    var body: some View {
        HStack(spacing: 2) {
            ForEach(Array(amplitudes.enumerated()), id: \.offset) { index, amplitude in
                RoundedRectangle(cornerRadius: 2)
                    .fill(
                        LinearGradient(
                            colors: [.blue.opacity(0.6), .purple.opacity(0.8)],
                            startPoint: .bottom,
                            endPoint: .top
                        )
                    )
                    .frame(width: 3, height: CGFloat(amplitude * 40))
                    .animation(.easeOut(duration: 0.1), value: amplitude)
            }
        }
        .frame(maxHeight: .infinity, alignment: .center)
    }
}

// MARK: - Previews

#Preview("Simple Indicator") {
    VoicePrivacyIndicator(voiceEngine: .shared)
        .padding()
        .background(.gray.opacity(0.1))
}

#Preview("With Waveform") {
    VoicePrivacyIndicatorWithWaveform(voiceEngine: .shared)
        .padding()
        .background(.gray.opacity(0.1))
}

#Preview("Dark Mode") {
    VoicePrivacyIndicator(voiceEngine: .shared)
        .padding()
        .background(.black)
        .preferredColorScheme(.dark)
}
