import SwiftUI
import Charts

/// Graph renderer for mathematical functions and data visualization
@MainActor
final class MathGraphRenderer {

    // MARK: - Graph Generation

    /// Generate data points for a mathematical function
    func generateFunctionData(
        function: MathFunction,
        xRange: ClosedRange<Double> = -10...10,
        points: Int = 200
    ) -> [GraphPoint] {
        let step = (xRange.upperBound - xRange.lowerBound) / Double(points)
        var dataPoints: [GraphPoint] = []

        for i in 0...points {
            let x = xRange.lowerBound + step * Double(i)

            // Calculate y value based on function type
            if let y = calculateY(for: x, function: function) {
                dataPoints.append(GraphPoint(x: x, y: y))
            }
        }

        return dataPoints
    }

    /// Generate chart view for a function
    func createFunctionChart(
        function: MathFunction,
        xRange: ClosedRange<Double> = -10...10,
        yRange: ClosedRange<Double>? = nil
    ) -> some View {
        let data = generateFunctionData(function: function, xRange: xRange)

        return FunctionChartView(
            data: data,
            function: function,
            xRange: xRange,
            yRange: yRange
        )
    }

    /// Create chart for multiple functions on same axes
    func createMultiFunctionChart(
        functions: [MathFunction],
        xRange: ClosedRange<Double> = -10...10
    ) -> some View {
        MultiFunctionChartView(
            functions: functions,
            xRange: xRange
        )
    }

    /// Create scatter plot for data points
    func createScatterPlot(
        data: [GraphPoint],
        title: String = "Scatter Plot"
    ) -> some View {
        ScatterPlotView(data: data, title: title)
    }

    /// Create bar chart for statistics
    func createBarChart(
        data: [BarDataPoint],
        title: String = "Bar Chart"
    ) -> some View {
        BarChartView(data: data, title: title)
    }

    // MARK: - Function Evaluation

    private func calculateY(for x: Double, function: MathFunction) -> Double? {
        switch function.type {
        case .linear:
            return function.parameters["m"]! * x + function.parameters["b"]!

        case .quadratic:
            let a = function.parameters["a"]!
            let b = function.parameters["b"]!
            let c = function.parameters["c"]!
            return a * x * x + b * x + c

        case .cubic:
            let a = function.parameters["a"]!
            let b = function.parameters["b"]!
            let c = function.parameters["c"]!
            let d = function.parameters["d"]!
            return a * pow(x, 3) + b * pow(x, 2) + c * x + d

        case .polynomial:
            guard let coefficients = function.coefficients else { return nil }
            var result = 0.0
            for (index, coefficient) in coefficients.enumerated() {
                result += coefficient * pow(x, Double(coefficients.count - 1 - index))
            }
            return result

        case .exponential:
            let a = function.parameters["a"]!
            let b = function.parameters["b"]!
            return a * exp(b * x)

        case .logarithmic:
            let a = function.parameters["a"]!
            let b = function.parameters["b"]!
            guard x > 0 else { return nil }
            return a * log(x) + b

        case .sine:
            let a = function.parameters["a"] ?? 1.0  // amplitude
            let b = function.parameters["b"] ?? 1.0  // frequency
            let c = function.parameters["c"] ?? 0.0  // phase shift
            let d = function.parameters["d"] ?? 0.0  // vertical shift
            return a * sin(b * x + c) + d

        case .cosine:
            let a = function.parameters["a"] ?? 1.0
            let b = function.parameters["b"] ?? 1.0
            let c = function.parameters["c"] ?? 0.0
            let d = function.parameters["d"] ?? 0.0
            return a * cos(b * x + c) + d

        case .tangent:
            let a = function.parameters["a"] ?? 1.0
            let b = function.parameters["b"] ?? 1.0
            let c = function.parameters["c"] ?? 0.0
            let d = function.parameters["d"] ?? 0.0
            let tanValue = tan(b * x + c)
            // Avoid asymptotes
            guard abs(tanValue) < 100 else { return nil }
            return a * tanValue + d

        case .absolute:
            let a = function.parameters["a"]!
            let h = function.parameters["h"] ?? 0.0
            let k = function.parameters["k"] ?? 0.0
            return a * abs(x - h) + k

        case .squareRoot:
            let a = function.parameters["a"]!
            let h = function.parameters["h"] ?? 0.0
            let k = function.parameters["k"] ?? 0.0
            guard x - h >= 0 else { return nil }
            return a * sqrt(x - h) + k

        case .rational:
            // f(x) = (ax + b) / (cx + d)
            let a = function.parameters["a"]!
            let b = function.parameters["b"]!
            let c = function.parameters["c"]!
            let d = function.parameters["d"]!
            let denominator = c * x + d
            guard abs(denominator) > 0.001 else { return nil } // Avoid division by zero
            return (a * x + b) / denominator

        case .custom:
            // Custom functions would need expression evaluation
            return nil
        }
    }

    // MARK: - Analysis

    /// Find critical points (maxima, minima, inflection points)
    func findCriticalPoints(
        function: MathFunction,
        inRange range: ClosedRange<Double>
    ) -> CriticalPoints {
        let data = generateFunctionData(function: function, xRange: range, points: 1000)

        var maxima: [GraphPoint] = []
        var minima: [GraphPoint] = []
        var zeros: [GraphPoint] = []

        for i in 1..<(data.count - 1) {
            let prev = data[i - 1]
            let current = data[i]
            let next = data[i + 1]

            // Local maximum
            if current.y > prev.y && current.y > next.y {
                maxima.append(current)
            }

            // Local minimum
            if current.y < prev.y && current.y < next.y {
                minima.append(current)
            }

            // Zero crossing
            if abs(current.y) < 0.1 {
                zeros.append(current)
            }
        }

        return CriticalPoints(maxima: maxima, minima: minima, zeros: zeros)
    }

    /// Calculate derivative numerically
    func calculateDerivative(
        function: MathFunction,
        at x: Double,
        h: Double = 0.0001
    ) -> Double? {
        guard let fxPlusH = calculateY(for: x + h, function: function),
              let fxMinusH = calculateY(for: x - h, function: function) else {
            return nil
        }

        return (fxPlusH - fxMinusH) / (2 * h)
    }

    /// Calculate integral numerically using trapezoidal rule
    func calculateIntegral(
        function: MathFunction,
        from a: Double,
        to b: Double,
        intervals: Int = 1000
    ) -> Double? {
        let h = (b - a) / Double(intervals)
        var sum = 0.0

        guard let fa = calculateY(for: a, function: function),
              let fb = calculateY(for: b, function: function) else {
            return nil
        }

        sum += fa + fb

        for i in 1..<intervals {
            let x = a + Double(i) * h
            guard let fx = calculateY(for: x, function: function) else {
                return nil
            }
            sum += 2 * fx
        }

        return (h / 2) * sum
    }
}

// MARK: - Supporting Types

struct MathFunction: Identifiable {
    let id = UUID()
    let name: String
    let type: FunctionType
    let parameters: [String: Double]
    let coefficients: [Double]?
    let expression: String
    let color: Color

    init(
        name: String,
        type: FunctionType,
        parameters: [String: Double],
        coefficients: [Double]? = nil,
        expression: String,
        color: Color = .blue
    ) {
        self.name = name
        self.type = type
        self.parameters = parameters
        self.coefficients = coefficients
        self.expression = expression
        self.color = color
    }

    // Convenience initializers
    static func linear(m: Double, b: Double, name: String? = nil) -> MathFunction {
        MathFunction(
            name: name ?? "f(x) = \(m)x + \(b)",
            type: .linear,
            parameters: ["m": m, "b": b],
            expression: "\(m)x + \(b)"
        )
    }

    static func quadratic(a: Double, b: Double, c: Double, name: String? = nil) -> MathFunction {
        MathFunction(
            name: name ?? "f(x) = \(a)x² + \(b)x + \(c)",
            type: .quadratic,
            parameters: ["a": a, "b": b, "c": c],
            expression: "\(a)x² + \(b)x + \(c)"
        )
    }

    static func sine(amplitude: Double = 1, frequency: Double = 1, phase: Double = 0, shift: Double = 0) -> MathFunction {
        MathFunction(
            name: "f(x) = \(amplitude)sin(\(frequency)x)",
            type: .sine,
            parameters: ["a": amplitude, "b": frequency, "c": phase, "d": shift],
            expression: "\(amplitude)sin(\(frequency)x)"
        )
    }
}

enum FunctionType {
    case linear
    case quadratic
    case cubic
    case polynomial
    case exponential
    case logarithmic
    case sine
    case cosine
    case tangent
    case absolute
    case squareRoot
    case rational
    case custom
}

struct GraphPoint: Identifiable {
    let id = UUID()
    let x: Double
    let y: Double
}

struct BarDataPoint: Identifiable {
    let id = UUID()
    let category: String
    let value: Double
}

struct CriticalPoints {
    let maxima: [GraphPoint]
    let minima: [GraphPoint]
    let zeros: [GraphPoint]
}

// MARK: - Chart Views

struct FunctionChartView: View {
    let data: [GraphPoint]
    let function: MathFunction
    let xRange: ClosedRange<Double>
    let yRange: ClosedRange<Double>?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(function.name)
                .font(.headline)

            Chart(data) { point in
                LineMark(
                    x: .value("x", point.x),
                    y: .value("y", point.y)
                )
                .foregroundStyle(function.color)
            }
            .chartXScale(domain: xRange)
            .chartYScale(domain: yRange ?? calculateYRange())
            .chartXAxis {
                AxisMarks(position: .bottom)
            }
            .chartYAxis {
                AxisMarks(position: .leading)
            }
            .frame(height: 300)
        }
        .padding()
    }

    private func calculateYRange() -> ClosedRange<Double> {
        let yValues = data.map { $0.y }
        let minY = yValues.min() ?? -10
        let maxY = yValues.max() ?? 10
        let padding = (maxY - minY) * 0.1
        return (minY - padding)...(maxY + padding)
    }
}

struct MultiFunctionChartView: View {
    let functions: [MathFunction]
    let xRange: ClosedRange<Double>

    @State private var allData: [(function: MathFunction, points: [GraphPoint])] = []

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Multiple Functions")
                .font(.headline)

            Chart {
                ForEach(allData, id: \.function.id) { item in
                    ForEach(item.points) { point in
                        LineMark(
                            x: .value("x", point.x),
                            y: .value("y", point.y)
                        )
                        .foregroundStyle(item.function.color)
                    }
                }
            }
            .chartXScale(domain: xRange)
            .frame(height: 300)

            // Legend
            HStack(spacing: 16) {
                ForEach(functions) { function in
                    HStack(spacing: 4) {
                        Circle()
                            .fill(function.color)
                            .frame(width: 10, height: 10)
                        Text(function.name)
                            .font(.caption)
                    }
                }
            }
        }
        .padding()
        .onAppear {
            let renderer = MathGraphRenderer()
            allData = functions.map { function in
                (function, renderer.generateFunctionData(function: function, xRange: xRange))
            }
        }
    }
}

struct ScatterPlotView: View {
    let data: [GraphPoint]
    let title: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)

            Chart(data) { point in
                PointMark(
                    x: .value("x", point.x),
                    y: .value("y", point.y)
                )
                .foregroundStyle(.blue)
            }
            .frame(height: 300)
        }
        .padding()
    }
}

struct BarChartView: View {
    let data: [BarDataPoint]
    let title: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)

            Chart(data) { point in
                BarMark(
                    x: .value("Category", point.category),
                    y: .value("Value", point.value)
                )
                .foregroundStyle(.blue)
            }
            .frame(height: 300)
        }
        .padding()
    }
}
