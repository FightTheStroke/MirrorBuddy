import SwiftUI

/// User-friendly error banner with recovery actions (Task 58.1)
///
/// ## Features
/// - Non-technical, localized Italian error messages
/// - Retry buttons for retryable errors
/// - Fallback indicators
/// - Icon-based visual hierarchy
/// - Accessibility support
/// - Dismissible with animations
struct ErrorBannerView: View {
    let error: APIErrorProtocol
    let onRetry: (() -> Void)?
    let onDismiss: () -> Void

    @State private var isExpanded = false
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with icon and message
            HStack(spacing: 12) {
                // Error icon
                errorIcon
                    .font(.title2)
                    .foregroundStyle(.white)
                    .frame(width: 40, height: 40)
                    .background(errorColor)
                    .clipShape(Circle())
                    .accessibilityHidden(true)

                // Error message
                VStack(alignment: .leading, spacing: 4) {
                    Text(userFriendlyTitle)
                        .font(.headline)
                        .foregroundStyle(.primary)

                    Text(userFriendlyMessage)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(isExpanded ? nil : 2)
                }

                Spacer()

                // Dismiss button
                Button(action: onDismiss) {
                    Image(systemName: "xmark")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(.secondary)
                        .frame(width: 28, height: 28)
                }
                .accessibilityLabel("Chiudi avviso errore")
            }

            // Expanded details and actions
            if isExpanded {
                Divider()

                // Recovery suggestion
                if let suggestion = recoverySuggestion {
                    HStack(spacing: 8) {
                        Image(systemName: "lightbulb.fill")
                            .font(.caption)
                            .foregroundStyle(.yellow)
                            .accessibilityHidden(true)

                        Text(suggestion)
                            .font(.callout)
                            .foregroundStyle(.secondary)
                    }
                }

                // Action buttons
                HStack(spacing: 12) {
                    // Retry button for retryable errors
                    if error.isRetryable, let onRetry {
                        Button(action: onRetry) {
                            Label {
                                Text("Riprova")
                                    .fontWeight(.semibold)
                            } icon: {
                                Image(systemName: "arrow.clockwise")
                            }
                            .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.small)
                        .accessibilityHint("Riprova l'operazione fallita")

                        if let retryAfter = error.retryAfter {
                            Text("Attendi \(Int(retryAfter))s")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }

                    // Help button with documentation link
                    if let docURL = error.documentationURL {
                        Link(destination: docURL) {
                            Label {
                                Text("Aiuto")
                                    .fontWeight(.semibold)
                            } icon: {
                                Image(systemName: "questionmark.circle")
                            }
                            .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.small)
                        .accessibilityHint("Apri la documentazione di aiuto")
                    }
                }
            }

            // Expand/collapse toggle
            Button(action: {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                    isExpanded.toggle()
                }
            }) {
                HStack {
                    Text(isExpanded ? "Nascondi dettagli" : "Mostra dettagli")
                        .font(.caption)
                        .fontWeight(.medium)

                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption2)
                        .fontWeight(.semibold)
                }
                .foregroundStyle(.secondary)
            }
            .accessibilityLabel(isExpanded ? "Nascondi dettagli errore" : "Mostra dettagli errore")
        }
        .padding(16)
        .background(bannerBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(
            color: Color.black.opacity(colorScheme == .dark ? 0.4 : 0.15),
            radius: 8,
            y: 4
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(errorColor.opacity(0.3), lineWidth: 1)
        )
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Errore: \(userFriendlyTitle)")
        .accessibilityValue(userFriendlyMessage)
        .accessibilityHint(recoverySuggestion ?? "")
    }

    // MARK: - Error Icon

    private var errorIcon: some View {
        Group {
            switch error.errorCategory {
            case .network:
                Image(systemName: "wifi.slash")
            case .authentication:
                Image(systemName: "person.crop.circle.badge.xmark")
            case .authorization:
                Image(systemName: "lock.shield")
            case .rateLimit:
                Image(systemName: "hourglass")
            case .serverError, .timeout:
                Image(systemName: "exclamationmark.triangle.fill")
            case .validation:
                Image(systemName: "checkmark.circle.trianglebadge.exclamationmark")
            case .configuration:
                Image(systemName: "gearshape.fill")
            default:
                Image(systemName: "exclamationmark.circle.fill")
            }
        }
    }

    // MARK: - Computed Properties

    private var errorColor: Color {
        switch error.errorCategory {
        case .network:
            return .orange
        case .authentication, .authorization:
            return .red
        case .rateLimit, .timeout:
            return .yellow
        case .serverError:
            return .red
        case .validation:
            return .orange
        default:
            return .gray
        }
    }

    private var bannerBackground: some View {
        Group {
            if colorScheme == .dark {
                Color(uiColor: .secondarySystemGroupedBackground)
            } else {
                Color(uiColor: .systemBackground)
            }
        }
    }

    private var userFriendlyTitle: String {
        switch error.errorCategory {
        case .network:
            return "Problema di connessione"
        case .authentication:
            return "Accesso richiesto"
        case .authorization:
            return "Accesso negato"
        case .rateLimit:
            return "Troppe richieste"
        case .serverError:
            return "Problema temporaneo"
        case .clientError:
            return "Richiesta non valida"
        case .validation:
            return "Dati non validi"
        case .configuration:
            return "Configurazione mancante"
        case .parsing:
            return "Errore di formato"
        case .timeout:
            return "Tempo scaduto"
        case .unknown:
            return "Errore imprevisto"
        }
    }

    private var userFriendlyMessage: String {
        switch error.errorCategory {
        case .network:
            return "Controlla la tua connessione Internet e riprova."
        case .authentication:
            return "Accedi nuovamente per continuare a usare questa funzione."
        case .authorization:
            return "Non hai i permessi necessari per accedere a questa risorsa."
        case .rateLimit:
            if let retryAfter = error.retryAfter {
                return "Hai fatto troppe richieste. Attendi \(Int(retryAfter)) secondi e riprova."
            }
            return "Hai fatto troppe richieste. Attendi un momento e riprova."
        case .serverError:
            return "Il servizio sta riscontrando problemi. Riprova tra qualche istante."
        case .clientError:
            return "C'è stato un problema con la tua richiesta. Controlla i dati e riprova."
        case .validation:
            return "Alcuni dati inseriti non sono corretti. Controlla e riprova."
        case .configuration:
            return "Manca una configurazione necessaria. Controlla le impostazioni."
        case .parsing:
            return "Il formato dei dati ricevuti non è quello atteso. Aggiorna l'app."
        case .timeout:
            return "L'operazione ha impiegato troppo tempo. Controlla la connessione."
        case .unknown:
            return "Si è verificato un errore imprevisto. Riprova più tardi."
        }
    }

    private var recoverySuggestion: String? {
        // Use the recovery suggestion from the error protocol if available
        // Fall back to category-specific suggestions
        if let suggestion = error.recoverySuggestion {
            return localizeRecoverySuggestion(suggestion)
        }
        return nil
    }

    private func localizeRecoverySuggestion(_ suggestion: String) -> String {
        // Translate common English recovery suggestions to Italian
        // In production, use proper localization system
        let translations: [String: String] = [
            "Check your internet connection and try again.": "Controlla la tua connessione Internet e riprova.",
            "Please sign in again to continue using this feature.": "Accedi nuovamente per continuare a usare questa funzione.",
            "Check your API credentials and configuration in settings.": "Controlla le tue credenziali API e la configurazione nelle impostazioni.",
            "The service is experiencing issues. Please try again later.": "Il servizio sta riscontrando problemi. Riprova tra qualche istante."
        ]

        return translations[suggestion] ?? suggestion
    }
}

// MARK: - Error Banner Modifier

extension View {
    /// Display an error banner at the top of the view
    func errorBanner(
        error: Binding<APIErrorProtocol?>,
        onRetry: (() -> Void)? = nil
    ) -> some View {
        self.modifier(ErrorBannerModifier(error: error, onRetry: onRetry))
    }
}

struct ErrorBannerModifier: ViewModifier {
    @Binding var error: APIErrorProtocol?
    let onRetry: (() -> Void)?

    func body(content: Content) -> some View {
        ZStack(alignment: .top) {
            content

            if let error {
                VStack {
                    ErrorBannerView(
                        error: error,
                        onRetry: onRetry
                    ) {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                            self.error = nil
                        }
                    }
                    .padding()
                    .transition(
                        .asymmetric(
                            insertion: .move(edge: .top).combined(with: .opacity),
                            removal: .move(edge: .top).combined(with: .opacity)
                        )
                    )

                    Spacer()
                }
            }
        }
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: error != nil)
    }
}

// MARK: - Previews

#Preview("Network Error") {
    let error = UnifiedAPIError.network(
        URLError(.notConnectedToInternet),
        context: ["operation": "fetch data"]
    )

    ScrollView {
        VStack(spacing: 20) {
            ErrorBannerView(
                error: error,
                onRetry: {
                    print("Retry tapped")
                }
            ) {
                print("Dismiss tapped")
            }

            Text("Contenuto principale dell'app...")
                .padding()

            Spacer()
        }
        .padding()
    }
}

#Preview("Authentication Error") {
    let error = UnifiedAPIError.authentication(
        "Invalid credentials",
        context: ["user": "example@test.com"]
    )

    ErrorBannerView(
        error: error,
        onRetry: nil
    ) {
        print("Dismiss tapped")
    }
    .padding()
}

#Preview("Rate Limit Error") {
    let error = UnifiedAPIError.rateLimit(
        retryAfter: 60,
        context: ["endpoint": "/api/generate"]
    )

    ErrorBannerView(
        error: error,
        onRetry: {
            print("Retry tapped")
        }
    ) {
        print("Dismiss tapped")
    }
    .padding()
}

#Preview("Server Error") {
    let error = UnifiedAPIError.serverError(
        code: 500,
        message: "Internal server error",
        context: ["service": "OpenAI"]
    )

    ErrorBannerView(
        error: error,
        onRetry: {
            print("Retry tapped")
        }
    ) {
        print("Dismiss tapped")
    }
    .padding()
}

#Preview("Dark Mode") {
    let error = UnifiedAPIError.timeout(
        context: ["operation": "PDF processing"]
    )

    ErrorBannerView(
        error: error,
        onRetry: {
            print("Retry tapped")
        }
    ) {
        print("Dismiss tapped")
    }
    .padding()
    .preferredColorScheme(.dark)
}

#Preview("With Modifier") {
    struct PreviewWrapper: View {
        @State private var error: APIErrorProtocol? = UnifiedAPIError.network(
            URLError(.notConnectedToInternet),
            context: nil
        )

        var body: some View {
            VStack {
                Text("Contenuto principale")
                    .padding()

                Button("Simula errore") {
                    error = UnifiedAPIError.rateLimit(retryAfter: 30, context: nil)
                }
                .buttonStyle(.bordered)

                Button("Rimuovi errore") {
                    error = nil
                }
                .buttonStyle(.borderedProminent)
            }
            .errorBanner(error: $error) {
                print("Retry action")
                error = nil
            }
        }
    }

    return PreviewWrapper()
}
