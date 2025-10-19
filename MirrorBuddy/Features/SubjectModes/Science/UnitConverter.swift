import Foundation

/// Comprehensive unit conversion tool for physics and chemistry
final class UnitConverter {
    /// Convert a value from one unit to another
    func convert(value: Double, from fromUnit: PhysicsUnit, to toUnit: PhysicsUnit) throws -> UnitConversionResult {
        // Check if units are in the same category
        guard fromUnit.category == toUnit.category else {
            throw ScienceModeError.conversionFailed("Cannot convert between \(fromUnit.category.rawValue) and \(toUnit.category.rawValue)")
        }

        // Convert to base unit, then to target unit
        let baseValue = value * fromUnit.toBaseMultiplier
        let result = baseValue / toUnit.toBaseMultiplier

        return UnitConversionResult(
            originalValue: value,
            originalUnit: fromUnit,
            convertedValue: result,
            convertedUnit: toUnit,
            formula: "\(value) \(fromUnit.symbol) × \(fromUnit.toBaseMultiplier) ÷ \(toUnit.toBaseMultiplier) = \(result) \(toUnit.symbol)"
        )
    }

    /// Get all units for a specific category
    func getUnits(for category: UnitCategory) -> [PhysicsUnit] {
        PhysicsUnit.allCases.filter { $0.category == category }
    }

    /// Get all available categories
    func getAllCategories() -> [UnitCategory] {
        UnitCategory.allCases
    }
}

// MARK: - Unit Categories

enum UnitCategory: String, CaseIterable {
    case length = "Length"
    case mass = "Mass"
    case time = "Time"
    case temperature = "Temperature"
    case energy = "Energy"
    case force = "Force"
    case pressure = "Pressure"
    case velocity = "Velocity"
    case acceleration = "Acceleration"
    case volume = "Volume"
    case density = "Density"
    case power = "Power"
    case electricCurrent = "Electric Current"
    case voltage = "Voltage"
    case resistance = "Resistance"
    case frequency = "Frequency"
}

// MARK: - Physics Units

enum PhysicsUnit: String, CaseIterable {
    // Length
    case meter
    case kilometer
    case centimeter
    case millimeter
    case mile
    case yard
    case foot
    case inch

    // Mass
    case kilogram
    case gram
    case milligram
    case pound
    case ounce
    case ton

    // Time
    case second
    case minute
    case hour
    case day
    case millisecond

    // Temperature
    case kelvin
    case celsius
    case fahrenheit

    // Energy
    case joule
    case kilojoule
    case calorie
    case kilocalorie
    case electronvolt

    // Force
    case newton
    case kilonewton
    case poundForce = "pound-force"

    // Pressure
    case pascal
    case kilopascal
    case atmosphere
    case bar
    case psi

    // Velocity
    case metersPerSecond = "m/s"
    case kilometersPerHour = "km/h"
    case milesPerHour = "mph"

    // Acceleration
    case metersPerSecondSquared = "m/s²"

    // Volume
    case cubicMeter = "cubic meter"
    case liter
    case milliliter
    case gallon

    // Power
    case watt
    case kilowatt
    case horsepower

    // Electric Current
    case ampere
    case milliampere

    // Voltage
    case volt
    case kilovolt
    case millivolt

    // Resistance
    case ohm
    case kilohm
    case megohm

    // Frequency
    case hertz
    case kilohertz
    case megahertz

    var category: UnitCategory {
        switch self {
        case .meter, .kilometer, .centimeter, .millimeter, .mile, .yard, .foot, .inch:
            return .length
        case .kilogram, .gram, .milligram, .pound, .ounce, .ton:
            return .mass
        case .second, .minute, .hour, .day, .millisecond:
            return .time
        case .kelvin, .celsius, .fahrenheit:
            return .temperature
        case .joule, .kilojoule, .calorie, .kilocalorie, .electronvolt:
            return .energy
        case .newton, .kilonewton, .poundForce:
            return .force
        case .pascal, .kilopascal, .atmosphere, .bar, .psi:
            return .pressure
        case .metersPerSecond, .kilometersPerHour, .milesPerHour:
            return .velocity
        case .metersPerSecondSquared:
            return .acceleration
        case .cubicMeter, .liter, .milliliter, .gallon:
            return .volume
        case .watt, .kilowatt, .horsepower:
            return .power
        case .ampere, .milliampere:
            return .electricCurrent
        case .volt, .kilovolt, .millivolt:
            return .voltage
        case .ohm, .kilohm, .megohm:
            return .resistance
        case .hertz, .kilohertz, .megahertz:
            return .frequency
        }
    }

    var symbol: String {
        switch self {
        case .meter: return "m"
        case .kilometer: return "km"
        case .centimeter: return "cm"
        case .millimeter: return "mm"
        case .mile: return "mi"
        case .yard: return "yd"
        case .foot: return "ft"
        case .inch: return "in"
        case .kilogram: return "kg"
        case .gram: return "g"
        case .milligram: return "mg"
        case .pound: return "lb"
        case .ounce: return "oz"
        case .ton: return "t"
        case .second: return "s"
        case .minute: return "min"
        case .hour: return "h"
        case .day: return "d"
        case .millisecond: return "ms"
        case .kelvin: return "K"
        case .celsius: return "°C"
        case .fahrenheit: return "°F"
        case .joule: return "J"
        case .kilojoule: return "kJ"
        case .calorie: return "cal"
        case .kilocalorie: return "kcal"
        case .electronvolt: return "eV"
        case .newton: return "N"
        case .kilonewton: return "kN"
        case .poundForce: return "lbf"
        case .pascal: return "Pa"
        case .kilopascal: return "kPa"
        case .atmosphere: return "atm"
        case .bar: return "bar"
        case .psi: return "psi"
        case .metersPerSecond: return "m/s"
        case .kilometersPerHour: return "km/h"
        case .milesPerHour: return "mph"
        case .metersPerSecondSquared: return "m/s²"
        case .cubicMeter: return "m³"
        case .liter: return "L"
        case .milliliter: return "mL"
        case .gallon: return "gal"
        case .watt: return "W"
        case .kilowatt: return "kW"
        case .horsepower: return "hp"
        case .ampere: return "A"
        case .milliampere: return "mA"
        case .volt: return "V"
        case .kilovolt: return "kV"
        case .millivolt: return "mV"
        case .ohm: return "Ω"
        case .kilohm: return "kΩ"
        case .megohm: return "MΩ"
        case .hertz: return "Hz"
        case .kilohertz: return "kHz"
        case .megahertz: return "MHz"
        }
    }

    /// Multiplier to convert to base unit
    var toBaseMultiplier: Double {
        switch self {
        // Length (base: meter)
        case .meter: return 1.0
        case .kilometer: return 1_000.0
        case .centimeter: return 0.01
        case .millimeter: return 0.001
        case .mile: return 1_609.34
        case .yard: return 0.9144
        case .foot: return 0.3048
        case .inch: return 0.0254

        // Mass (base: kilogram)
        case .kilogram: return 1.0
        case .gram: return 0.001
        case .milligram: return 0.000001
        case .pound: return 0.453592
        case .ounce: return 0.0283495
        case .ton: return 1_000.0

        // Time (base: second)
        case .second: return 1.0
        case .minute: return 60.0
        case .hour: return 3_600.0
        case .day: return 86_400.0
        case .millisecond: return 0.001

        // Temperature (special case, handled separately)
        case .kelvin: return 1.0
        case .celsius: return 1.0
        case .fahrenheit: return 1.0

        // Energy (base: joule)
        case .joule: return 1.0
        case .kilojoule: return 1_000.0
        case .calorie: return 4.184
        case .kilocalorie: return 4_184.0
        case .electronvolt: return 1.60218e-19

        // Force (base: newton)
        case .newton: return 1.0
        case .kilonewton: return 1_000.0
        case .poundForce: return 4.44822

        // Pressure (base: pascal)
        case .pascal: return 1.0
        case .kilopascal: return 1_000.0
        case .atmosphere: return 101_325.0
        case .bar: return 100_000.0
        case .psi: return 6_894.76

        // Velocity (base: m/s)
        case .metersPerSecond: return 1.0
        case .kilometersPerHour: return 0.277778
        case .milesPerHour: return 0.44704

        // Acceleration (base: m/s²)
        case .metersPerSecondSquared: return 1.0

        // Volume (base: cubic meter)
        case .cubicMeter: return 1.0
        case .liter: return 0.001
        case .milliliter: return 0.000001
        case .gallon: return 0.00378541

        // Power (base: watt)
        case .watt: return 1.0
        case .kilowatt: return 1_000.0
        case .horsepower: return 745.7

        // Electric Current (base: ampere)
        case .ampere: return 1.0
        case .milliampere: return 0.001

        // Voltage (base: volt)
        case .volt: return 1.0
        case .kilovolt: return 1_000.0
        case .millivolt: return 0.001

        // Resistance (base: ohm)
        case .ohm: return 1.0
        case .kilohm: return 1_000.0
        case .megohm: return 1_000_000.0

        // Frequency (base: hertz)
        case .hertz: return 1.0
        case .kilohertz: return 1_000.0
        case .megahertz: return 1_000_000.0
        }
    }
}

// MARK: - Conversion Result

struct UnitConversionResult: Identifiable {
    let id = UUID()
    let originalValue: Double
    let originalUnit: PhysicsUnit
    let convertedValue: Double
    let convertedUnit: PhysicsUnit
    let formula: String

    var formattedOriginal: String {
        String(format: "%.4f %@", originalValue, originalUnit.symbol)
    }

    var formattedConverted: String {
        String(format: "%.4f %@", convertedValue, convertedUnit.symbol)
    }
}
