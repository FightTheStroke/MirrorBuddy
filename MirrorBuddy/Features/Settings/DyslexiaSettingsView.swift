import SwiftUI
import Combine

/// Settings view for dyslexia-friendly text rendering (Task 74.2)
struct DyslexiaSettingsView: View {
    @ObservedObject var service = DyslexiaFriendlyTextService.shared
    @Environment(\.dismiss) private var dismiss

    @State private var showPreview = false

    let previewText = """
    Questa è un'anteprima del testo con le impostazioni per la dislessia applicate. \
    Puoi regolare il font, la spaziatura delle lettere, la spaziatura delle righe e \
    molto altro per trovare la combinazione più comoda per te.

    Le impostazioni verranno salvate automaticamente e applicate a tutto il testo dell'app.
    """

    var body: some View {
        NavigationStack {
            Form {
                // Enable/Disable section
                Section {
                    Toggle("Abilita Modalità Dislessia", isOn: $service.isEnabled)
                } footer: {
                    Text("Applica font e spaziature ottimizzati per la lettura")
                }

                if service.isEnabled {
                    // Font selection section (Subtask 74.1)
                    fontSection

                    // Letter spacing section (Subtask 74.1)
                    letterSpacingSection

                    // Line spacing section (Subtask 74.2)
                    lineSpacingSection

                    // Paragraph spacing section (Subtask 74.2)
                    paragraphSpacingSection

                    // Text size section
                    textSizeSection

                    // Color theme section (Subtask 74.3)
                    colorThemeSection

                    // Reading aids section (Subtask 74.3)
                    ReadingAidsSettings()

                    // Preview section
                    previewSection

                    // Presets section
                    presetsSection
                }
            }
            .navigationTitle("Accessibilità Dislessia")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Fine") {
                        dismiss()
                    }
                }
            }
        }
    }

    // MARK: - Font Section (Subtask 74.1)

    @ViewBuilder
    private var fontSection: some View {
        Section {
            Picker("Font", selection: $service.selectedFont) {
                ForEach(DyslexiaFriendlyTextService.DyslexiaFont.allCases) { font in
                    HStack {
                        Text(font.displayName)
                        if !font.isAvailable {
                            Text("(Non disponibile)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .tag(font)
                }
            }
            .pickerStyle(.inline)

            if !service.isOpenDyslexicAvailable {
                Text("Il font OpenDyslexic non è disponibile su questo dispositivo")
                    .font(.caption)
                    .foregroundStyle(.orange)
            }
        } header: {
            Text("Font")
        } footer: {
            Text("Il font OpenDyslexic è progettato specificamente per migliorare la leggibilità")
        }
    }

    // MARK: - Letter Spacing Section (Subtask 74.1)

    @ViewBuilder
    private var letterSpacingSection: some View {
        Section {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("Spaziatura Lettere")
                    Spacer()
                    Text(String(format: "%.1fx", service.letterSpacing))
                        .foregroundStyle(.secondary)
                        .monospacedDigit()
                }

                Slider(value: $service.letterSpacing, in: 1.0...2.0, step: 0.1)

                HStack {
                    Text("Normale")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text("Ampia")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        } footer: {
            Text("Maggiore spaziatura tra le lettere può migliorare la leggibilità")
        }
    }

    // MARK: - Line Spacing Section (Subtask 74.2)

    @ViewBuilder
    private var lineSpacingSection: some View {
        Section {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("Spaziatura Righe")
                    Spacer()
                    Text(String(format: "%.1fx", service.lineSpacing))
                        .foregroundStyle(.secondary)
                        .monospacedDigit()
                }

                Slider(value: $service.lineSpacing, in: 1.0...3.0, step: 0.1)

                HStack {
                    Text("Stretta")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text("Ampia")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        } footer: {
            Text("Maggiore spazio tra le righe rende il testo più facile da seguire")
        }
    }

    // MARK: - Paragraph Spacing Section (Subtask 74.2)

    @ViewBuilder
    private var paragraphSpacingSection: some View {
        Section {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("Spaziatura Paragrafi")
                    Spacer()
                    Text("\(Int(service.paragraphSpacing))pt")
                        .foregroundStyle(.secondary)
                        .monospacedDigit()
                }

                Slider(value: $service.paragraphSpacing, in: 0...40, step: 4)

                HStack {
                    Text("Nessuna")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text("Molto Ampia")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        } footer: {
            Text("Spazio aggiuntivo tra i paragrafi aiuta a distinguere i blocchi di testo")
        }
    }

    // MARK: - Text Size Section

    @ViewBuilder
    private var textSizeSection: some View {
        Section {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("Dimensione Testo")
                    Spacer()
                    Text("\(Int(service.textSizeMultiplier * 100))%")
                        .foregroundStyle(.secondary)
                        .monospacedDigit()
                }

                Slider(value: $service.textSizeMultiplier, in: 1.0...2.0, step: 0.1)

                HStack {
                    Image(systemName: "textformat.size.smaller")
                        .foregroundStyle(.secondary)
                    Spacer()
                    Image(systemName: "textformat.size.larger")
                        .foregroundStyle(.secondary)
                }
            }
        } footer: {
            Text("Aumenta la dimensione base del testo")
        }
    }

    // MARK: - Color Theme Section (Subtask 74.3)

    @ViewBuilder
    private var colorThemeSection: some View {
        Section {
            Picker("Tema Colore", selection: $service.colorTheme) {
                ForEach(DyslexiaFriendlyTextService.DyslexiaColorTheme.allCases) { theme in
                    HStack {
                        Circle()
                            .fill(theme.backgroundColor)
                            .frame(width: 20, height: 20)
                            .overlay(
                                Circle()
                                    .stroke(Color.secondary, lineWidth: 1)
                            )

                        Text(theme.displayName)

                        Circle()
                            .fill(theme.textColor)
                            .frame(width: 20, height: 20)
                            .overlay(
                                Circle()
                                    .stroke(Color.secondary, lineWidth: 1)
                            )
                    }
                    .tag(theme)
                }
            }
            .pickerStyle(.inline)
        } header: {
            Text("Contrasto Colori")
        } footer: {
            Text("Alcuni contrasti di colore possono rendere la lettura più confortevole")
        }
    }

    // MARK: - Preview Section

    @ViewBuilder
    private var previewSection: some View {
        Section {
            VStack(alignment: .leading, spacing: 12) {
                Text("Anteprima")
                    .font(.headline)

                Text(previewText)
                    .font(service.font(for: 16))
                    .kerning(service.letterSpacing - 1.0)
                    .lineSpacing(service.lineSpacing * 16 - 16)
                    .padding()
                    .background(service.colorTheme.backgroundColor)
                    .foregroundStyle(service.colorTheme.textColor)
                    .cornerRadius(12)
            }
        } header: {
            Text("Anteprima Impostazioni")
        }
    }

    // MARK: - Presets Section

    @ViewBuilder
    private var presetsSection: some View {
        Section {
            Button {
                service.applyRecommendedSettings()
            } label: {
                HStack {
                    Image(systemName: "star.fill")
                    Text("Applica Impostazioni Consigliate")
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .tint(.blue)

            Button(role: .destructive) {
                service.resetToDefaults()
            } label: {
                HStack {
                    Image(systemName: "arrow.counterclockwise")
                    Text("Ripristina Predefiniti")
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
        } header: {
            Text("Preimpostazioni")
        } footer: {
            Text("Le impostazioni consigliate applicano valori ottimizzati per la dislessia")
        }
    }
}

#Preview {
    DyslexiaSettingsView()
}
