import SwiftUI

/// Advanced calculator integrated with Math Mode
struct MathCalculatorView: View {
    @StateObject private var calculator = MathCalculator()
    @State private var showHistory = false

    var body: some View {
        VStack(spacing: 0) {
            // Display
            displaySection

            Divider()

            // Function selector
            functionSelector

            Divider()

            // Buttons
            buttonGrid

            // History drawer
            if showHistory {
                historySection
            }
        }
        .background(Color(.systemGroupedBackground))
    }

    // MARK: - Display Section

    private var displaySection: some View {
        VStack(alignment: .trailing, spacing: 8) {
            // Expression being built
            if !calculator.currentExpression.isEmpty {
                Text(calculator.currentExpression)
                    .font(.system(.body, design: .monospaced))
                    .foregroundColor(.secondary)
                    .lineLimit(2)
                    .minimumScaleFactor(0.5)
            }

            // Result display
            Text(calculator.displayValue)
                .font(.system(size: 44, weight: .light, design: .rounded))
                .lineLimit(1)
                .minimumScaleFactor(0.3)

            // Error message
            if let error = calculator.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
            }
        }
        .frame(maxWidth: .infinity, alignment: .trailing)
        .padding()
        .background(Color(.systemBackground))
    }

    // MARK: - Function Selector

    private var functionSelector: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(MathCalculator.CalculatorMode.allCases, id: \.self) { mode in
                    Button(action: {
                        calculator.setMode(mode)
                    }) {
                        Text(mode.displayName)
                            .font(.caption)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(calculator.mode == mode ? Color.blue : Color(.systemGray5))
                            .foregroundColor(calculator.mode == mode ? .white : .primary)
                            .cornerRadius(8)
                    }
                }
            }
            .padding(.horizontal)
        }
        .padding(.vertical, 8)
    }

    // MARK: - Button Grid

    private var buttonGrid: some View {
        VStack(spacing: 12) {
            ForEach(calculator.buttonLayout, id: \.self) { row in
                HStack(spacing: 12) {
                    ForEach(row, id: \.self) { button in
                        CalculatorButton(
                            button: button
                        )                            { calculator.processInput(button) }
                    }
                }
            }
        }
        .padding()
    }

    // MARK: - History Section

    private var historySection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("History")
                    .font(.headline)
                Spacer()
                Button("Clear") {
                    calculator.clearHistory()
                }
                .font(.caption)
            }
            .padding()

            ScrollView {
                LazyVStack(alignment: .leading, spacing: 8) {
                    ForEach(calculator.history) { entry in
                        HistoryEntryView(entry: entry) {
                            calculator.loadFromHistory(entry)
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
        .frame(height: 200)
        .background(Color(.systemBackground))
    }
}

// MARK: - Calculator Button

struct CalculatorButton: View {
    let button: MathCalculator.CalcButton
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(button.display)
                .font(.system(size: button.fontSize, weight: .medium, design: .rounded))
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .aspectRatio(button.aspectRatio, contentMode: .fit)
                .background(button.backgroundColor)
                .foregroundColor(button.foregroundColor)
                .cornerRadius(12)
        }
        .frame(height: 60)
    }
}

// MARK: - History Entry View

struct HistoryEntryView: View {
    let entry: MathCalculator.HistoryEntry
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 4) {
                Text(entry.expression)
                    .font(.system(.body, design: .monospaced))
                Text("= \(entry.result)")
                    .font(.system(.title3, design: .monospaced))
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(8)
        }
    }
}

// MARK: - Math Calculator Logic

@MainActor
final class MathCalculator: ObservableObject {
    @Published var displayValue = "0"
    @Published var currentExpression = ""
    @Published var errorMessage: String?
    @Published var mode: CalculatorMode = .basic
    @Published var history: [HistoryEntry] = []

    private var currentValue: Double = 0
    private var storedValue: Double = 0
    private var currentOperation: Operation?
    private var shouldResetDisplay = true

    // MARK: - Calculator Modes

    enum CalculatorMode: CaseIterable {
        case basic
        case scientific
        case graphing
        case statistics

        var displayName: String {
            switch self {
            case .basic: return "Basic"
            case .scientific: return "Scientific"
            case .graphing: return "Graphing"
            case .statistics: return "Statistics"
            }
        }
    }

    // MARK: - Button Layout

    var buttonLayout: [[CalcButton]] {
        switch mode {
        case .basic:
            return basicLayout
        case .scientific:
            return scientificLayout
        case .graphing:
            return graphingLayout
        case .statistics:
            return statisticsLayout
        }
    }

    private var basicLayout: [[CalcButton]] {
        [
            [.clear, .plusMinus, .percent, .divide],
            [.digit(7), .digit(8), .digit(9), .multiply],
            [.digit(4), .digit(5), .digit(6), .subtract],
            [.digit(1), .digit(2), .digit(3), .add],
            [.digit(0), .decimal, .equals]
        ]
    }

    private var scientificLayout: [[CalcButton]] {
        [
            [.sin, .cos, .tan, .clear],
            [.ln, .log, .exp, .power],
            [.sqrt, .square, .reciprocal, .divide],
            [.digit(7), .digit(8), .digit(9), .multiply],
            [.digit(4), .digit(5), .digit(6), .subtract],
            [.digit(1), .digit(2), .digit(3), .add],
            [.digit(0), .decimal, .pi, .equals]
        ]
    }

    private var graphingLayout: [[CalcButton]] {
        basicLayout
    }

    private var statisticsLayout: [[CalcButton]] {
        basicLayout
    }

    // MARK: - Input Processing

    func processInput(_ button: CalcButton) {
        errorMessage = nil

        switch button {
        case .digit(let number):
            handleDigit(number)

        case .decimal:
            handleDecimal()

        case .add, .subtract, .multiply, .divide, .power:
            handleOperation(button.operation!)

        case .equals:
            handleEquals()

        case .clear:
            handleClear()

        case .plusMinus:
            handlePlusMinus()

        case .percent:
            handlePercent()

        case .sin, .cos, .tan:
            handleTrigFunction(button)

        case .sqrt:
            handleSquareRoot()

        case .square:
            handleSquare()

        case .ln, .log:
            handleLogarithm(button)

        case .exp:
            handleExponential()

        case .reciprocal:
            handleReciprocal()

        case .pi:
            handlePi()
        }
    }

    // MARK: - Input Handlers

    private func handleDigit(_ digit: Int) {
        if shouldResetDisplay {
            displayValue = String(digit)
            shouldResetDisplay = false
        } else {
            if displayValue == "0" {
                displayValue = String(digit)
            } else {
                displayValue += String(digit)
            }
        }

        currentValue = Double(displayValue) ?? 0
    }

    private func handleDecimal() {
        if shouldResetDisplay {
            displayValue = "0."
            shouldResetDisplay = false
        } else if !displayValue.contains(".") {
            displayValue += "."
        }
    }

    private func handleOperation(_ operation: Operation) {
        if let currentOp = currentOperation {
            performOperation(currentOp)
        } else {
            storedValue = currentValue
        }

        currentOperation = operation
        currentExpression = "\(formatNumber(storedValue)) \(operation.symbol)"
        shouldResetDisplay = true
    }

    private func handleEquals() {
        guard let operation = currentOperation else { return }

        let expression = "\(formatNumber(storedValue)) \(operation.symbol) \(formatNumber(currentValue))"

        performOperation(operation)

        // Add to history
        history.insert(
            HistoryEntry(expression: expression, result: formatNumber(currentValue)),
            at: 0
        )

        currentExpression = ""
        currentOperation = nil
        shouldResetDisplay = true
    }

    private func performOperation(_ operation: Operation) {
        switch operation {
        case .add:
            currentValue = storedValue + currentValue
        case .subtract:
            currentValue = storedValue - currentValue
        case .multiply:
            currentValue = storedValue * currentValue
        case .divide:
            if currentValue != 0 {
                currentValue = storedValue / currentValue
            } else {
                errorMessage = "Cannot divide by zero"
                currentValue = 0
            }
        case .power:
            currentValue = pow(storedValue, currentValue)
        }

        displayValue = formatNumber(currentValue)
        storedValue = currentValue
    }

    private func handleClear() {
        displayValue = "0"
        currentExpression = ""
        currentValue = 0
        storedValue = 0
        currentOperation = nil
        shouldResetDisplay = true
        errorMessage = nil
    }

    private func handlePlusMinus() {
        currentValue = -currentValue
        displayValue = formatNumber(currentValue)
    }

    private func handlePercent() {
        currentValue = currentValue / 100
        displayValue = formatNumber(currentValue)
    }

    private func handleTrigFunction(_ button: CalcButton) {
        let radians = currentValue * .pi / 180 // Convert to radians

        switch button {
        case .sin:
            currentValue = sin(radians)
        case .cos:
            currentValue = cos(radians)
        case .tan:
            currentValue = tan(radians)
        default:
            break
        }

        displayValue = formatNumber(currentValue)
        shouldResetDisplay = true
    }

    private func handleSquareRoot() {
        if currentValue >= 0 {
            currentValue = sqrt(currentValue)
            displayValue = formatNumber(currentValue)
        } else {
            errorMessage = "Cannot take square root of negative number"
        }
        shouldResetDisplay = true
    }

    private func handleSquare() {
        currentValue = currentValue * currentValue
        displayValue = formatNumber(currentValue)
        shouldResetDisplay = true
    }

    private func handleLogarithm(_ button: CalcButton) {
        if currentValue > 0 {
            switch button {
            case .ln:
                currentValue = log(currentValue)
            case .log:
                currentValue = log10(currentValue)
            default:
                break
            }
            displayValue = formatNumber(currentValue)
        } else {
            errorMessage = "Cannot take log of non-positive number"
        }
        shouldResetDisplay = true
    }

    private func handleExponential() {
        currentValue = exp(currentValue)
        displayValue = formatNumber(currentValue)
        shouldResetDisplay = true
    }

    private func handleReciprocal() {
        if currentValue != 0 {
            currentValue = 1 / currentValue
            displayValue = formatNumber(currentValue)
        } else {
            errorMessage = "Cannot divide by zero"
        }
        shouldResetDisplay = true
    }

    private func handlePi() {
        currentValue = .pi
        displayValue = formatNumber(currentValue)
        shouldResetDisplay = true
    }

    // MARK: - Helper Methods

    private func formatNumber(_ number: Double) -> String {
        if number.truncatingRemainder(dividingBy: 1) == 0 && abs(number) < 1e10 {
            return String(format: "%.0f", number)
        } else if abs(number) < 0.0001 || abs(number) > 1e10 {
            return String(format: "%.4e", number)
        } else {
            return String(format: "%.6f", number).trimmingCharacters(in: CharacterSet(charactersIn: "0")).trimmingCharacters(in: CharacterSet(charactersIn: "."))
        }
    }

    func setMode(_ mode: CalculatorMode) {
        self.mode = mode
    }

    func clearHistory() {
        history.removeAll()
    }

    func loadFromHistory(_ entry: HistoryEntry) {
        if let value = Double(entry.result) {
            currentValue = value
            displayValue = entry.result
            shouldResetDisplay = true
        }
    }

    // MARK: - Supporting Types

    enum CalcButton: Hashable {
        case digit(Int)
        case decimal
        case add, subtract, multiply, divide, power
        case equals
        case clear
        case plusMinus
        case percent
        case sin, cos, tan
        case sqrt, square
        case ln, log, exp
        case reciprocal
        case pi

        var display: String {
            switch self {
            case .digit(let num): return "\(num)"
            case .decimal: return "."
            case .add: return "+"
            case .subtract: return "−"
            case .multiply: return "×"
            case .divide: return "÷"
            case .power: return "xʸ"
            case .equals: return "="
            case .clear: return "C"
            case .plusMinus: return "±"
            case .percent: return "%"
            case .sin: return "sin"
            case .cos: return "cos"
            case .tan: return "tan"
            case .sqrt: return "√"
            case .square: return "x²"
            case .ln: return "ln"
            case .log: return "log"
            case .exp: return "eˣ"
            case .reciprocal: return "1/x"
            case .pi: return "π"
            }
        }

        var fontSize: CGFloat {
            switch self {
            case .digit, .decimal, .add, .subtract, .multiply, .divide, .equals:
                return 28
            default:
                return 20
            }
        }

        var backgroundColor: Color {
            switch self {
            case .digit, .decimal, .pi:
                return Color(.systemGray5)
            case .add, .subtract, .multiply, .divide, .equals:
                return .orange
            case .clear, .plusMinus, .percent:
                return Color(.systemGray3)
            default:
                return Color(.systemGray4)
            }
        }

        var foregroundColor: Color {
            switch self {
            case .add, .subtract, .multiply, .divide, .equals:
                return .white
            default:
                return .primary
            }
        }

        var aspectRatio: CGFloat {
            switch self {
            case .digit(0):
                return 2.2
            default:
                return 1
            }
        }

        var operation: Operation? {
            switch self {
            case .add: return .add
            case .subtract: return .subtract
            case .multiply: return .multiply
            case .divide: return .divide
            case .power: return .power
            default: return nil
            }
        }
    }

    enum Operation {
        case add, subtract, multiply, divide, power

        var symbol: String {
            switch self {
            case .add: return "+"
            case .subtract: return "−"
            case .multiply: return "×"
            case .divide: return "÷"
            case .power: return "^"
            }
        }
    }

    struct HistoryEntry: Identifiable {
        let id = UUID()
        let expression: String
        let result: String
    }
}

// MARK: - Preview

#Preview {
    MathCalculatorView()
}
