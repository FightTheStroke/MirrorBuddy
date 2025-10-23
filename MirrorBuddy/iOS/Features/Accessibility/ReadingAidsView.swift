import SwiftUI

// MARK: - Reading Ruler (Task 74.3)

/// Reading ruler that highlights the current line of text
struct ReadingRuler: View {
    let lineHeight: CGFloat
    let color: Color

    @State private var position: CGFloat = 0

    var body: some View {
        Rectangle()
            .fill(color.opacity(0.3))
            .frame(height: lineHeight)
            .offset(y: position)
            .allowsHitTesting(false)
    }

    func updatePosition(_ yPosition: CGFloat) {
        withAnimation(.linear(duration: 0.1)) {
            position = yPosition
        }
    }
}

// MARK: - Focus Mode View (Task 74.3)

/// Focus mode that dims surrounding text
struct FocusModeReader: View {
    let content: String
    let focusLineIndex: Int
    let service: DyslexiaFriendlyTextService

    private var lines: [String] {
        content.components(separatedBy: .newlines)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: service.lineSpacing * 8) {
            ForEach(Array(lines.enumerated()), id: \.offset) { index, line in
                Text(line)
                    .font(service.font(for: 16))
                    .kerning(service.letterSpacing - 1.0)
                    .foregroundStyle(index == focusLineIndex ? service.colorTheme.textColor : service.colorTheme.textColor.opacity(0.3))
                    .lineLimit(1)
            }
        }
    }
}

// MARK: - Reading Ruler Container (Task 74.3)

/// Container view that adds reading ruler to any scrollable text content
struct ReadingRulerContainer<Content: View>: View {
    @ObservedObject var service = DyslexiaFriendlyTextService.shared

    let content: Content
    let isEnabled: Bool

    @State private var rulerPosition: CGFloat = 100
    @State private var showRuler = true

    init(isEnabled: Bool = false, @ViewBuilder content: () -> Content) {
        self.isEnabled = isEnabled
        self.content = content()
    }

    var body: some View {
        ZStack(alignment: .topLeading) {
            // Content
            content
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .onChanged { value in
                            if isEnabled {
                                rulerPosition = value.location.y
                            }
                        }
                )

            // Reading ruler overlay
            if isEnabled && showRuler {
                ReadingRuler(
                    lineHeight: service.lineSpacing * 24,
                    color: .blue
                )
                .offset(y: rulerPosition)
            }
        }
    }
}

// MARK: - Focus Mode Toggle (Task 74.3)

/// Toggle control for focus mode
struct FocusModeToggle: View {
    @Binding var isEnabled: Bool

    var body: some View {
        Toggle("Modalità Focus", isOn: $isEnabled)
            .toggleStyle(.switch)
    }
}

// MARK: - Reading Aids Settings (Task 74.3)

/// Settings section for reading aids
struct ReadingAidsSettings: View {
    @AppStorage("readingRuler_enabled") private var rulerEnabled = false
    @AppStorage("focusMode_enabled") private var focusModeEnabled = false

    var body: some View {
        Section {
            Toggle("Righello di Lettura", isOn: $rulerEnabled)
            Toggle("Modalità Focus", isOn: $focusModeEnabled)
        } header: {
            Text("Aiuti alla Lettura")
        } footer: {
            Text("Il righello evidenzia la riga corrente. La modalità focus oscura il testo circostante.")
        }
    }
}

// MARK: - Dyslexia-Friendly Text Container (Task 74.3)

/// Complete dyslexia-friendly text container with all features
struct DyslexiaFriendlyTextContainer: View {
    @ObservedObject var service = DyslexiaFriendlyTextService.shared

    let text: String
    let title: String?

    @AppStorage("readingRuler_enabled") private var rulerEnabled = false
    @AppStorage("focusMode_enabled") private var focusModeEnabled = false

    @State private var currentLineIndex = 0

    init(_ text: String, title: String? = nil) {
        self.text = text
        self.title = title
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Title
                if let title = title {
                    Text(title)
                        .font(service.font(for: 24))
                        .fontWeight(.bold)
                        .kerning(service.letterSpacing - 1.0)
                        .foregroundStyle(service.colorTheme.textColor)
                }

                // Content with focus mode or regular
                if focusModeEnabled && service.isEnabled {
                    FocusModeReader(
                        content: text,
                        focusLineIndex: currentLineIndex,
                        service: service
                    )
                    .onTapGesture { location in
                        // Calculate tapped line
                        let lineHeight = service.lineSpacing * 16
                        currentLineIndex = Int(location.y / lineHeight)
                    }
                } else {
                    Text(text)
                        .font(service.font(for: 16))
                        .kerning(service.letterSpacing - 1.0)
                        .lineSpacing(service.lineSpacing * 16 - 16)
                        .foregroundStyle(service.colorTheme.textColor)
                }
            }
            .padding()
        }
        .background(service.colorTheme.backgroundColor)
        .overlay {
            // Reading ruler (if enabled)
            if rulerEnabled && service.isEnabled && !focusModeEnabled {
                ReadingRulerContainer(isEnabled: rulerEnabled) {
                    Color.clear
                }
            }
        }
    }
}

// MARK: - Preview

#Preview("Reading Ruler") {
    ReadingRulerContainer(isEnabled: true) {
        VStack(alignment: .leading, spacing: 16) {
            ForEach(0..<20, id: \.self) { i in
                Text("Questa è la riga di testo numero \(i + 1) per testare il righello di lettura.")
                    .padding(.vertical, 8)
            }
        }
        .padding()
    }
}

#Preview("Focus Mode") {
    let sampleText = """
    Prima riga di testo per la dimostrazione.
    Seconda riga con modalità focus attiva.
    Terza riga che risulterà oscurata.
    Quarta riga anch'essa in background.
    Quinta riga finale del campione.
    """

    FocusModeReader(
        content: sampleText,
        focusLineIndex: 1,
        service: .shared
    )
    .padding()
}

#Preview("Complete Container") {
    DyslexiaFriendlyTextContainer(
        """
        Questo è un esempio di testo con tutte le funzionalità per la dislessia attivate.

        Puoi attivare il font OpenDyslexic, regolare la spaziatura delle lettere e delle righe, \
        e scegliere un tema di colori ad alto contrasto.

        Il righello di lettura evidenzia la riga corrente mentre leggi, e la modalità focus \
        oscura il testo circostante per aiutarti a concentrarti.

        Tutte queste impostazioni sono completamente personalizzabili per adattarsi alle \
        tue esigenze personali di lettura.
        """,
        title: "Accessibilità per la Dislessia"
    )
}
