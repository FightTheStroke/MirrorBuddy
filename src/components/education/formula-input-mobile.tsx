"use client";

import { useState, useRef } from "react";
import { useDeviceType } from "@/hooks/use-device-type";

/**
 * Math symbols for the virtual keyboard
 * Organized by category for easy insertion
 */
const MATH_SYMBOLS = [
  // Common operators and functions
  { symbol: "√", name: "Square root" },
  { symbol: "∛", name: "Cube root" },
  { symbol: "π", name: "Pi" },
  { symbol: "∞", name: "Infinity" },
  { symbol: "°", name: "Degree" },
  { symbol: "%", name: "Percent" },

  // Calculus
  { symbol: "∫", name: "Integral" },
  { symbol: "∂", name: "Partial derivative" },
  { symbol: "Σ", name: "Summation" },
  { symbol: "∏", name: "Product" },
  { symbol: "∇", name: "Nabla" },
  { symbol: "Δ", name: "Delta" },

  // Relationships
  { symbol: "≈", name: "Approximately equal" },
  { symbol: "≠", name: "Not equal" },
  { symbol: "≤", name: "Less than or equal" },
  { symbol: "≥", name: "Greater than or equal" },
  { symbol: "∝", name: "Proportional" },
  { symbol: "±", name: "Plus minus" },

  // Logic and set theory
  { symbol: "∈", name: "Element of" },
  { symbol: "∉", name: "Not element of" },
  { symbol: "⊂", name: "Subset" },
  { symbol: "∪", name: "Union" },
  { symbol: "∩", name: "Intersection" },
  { symbol: "∅", name: "Empty set" },

  // Superscript/subscript helpers
  { symbol: "²", name: "Superscript 2" },
  { symbol: "³", name: "Superscript 3" },
  { symbol: "ⁿ", name: "Superscript n" },
  { symbol: "₀", name: "Subscript 0" },
  { symbol: "₁", name: "Subscript 1" },
  { symbol: "ₙ", name: "Subscript n" },

  // Greek letters
  { symbol: "α", name: "Alpha" },
  { symbol: "β", name: "Beta" },
  { symbol: "γ", name: "Gamma" },
  { symbol: "θ", name: "Theta" },
  { symbol: "λ", name: "Lambda" },
  { symbol: "μ", name: "Mu" },
];

export interface FormulaInputMobileProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  className?: string;
}

export function FormulaInputMobile({
  value,
  onChange,
  onSubmit,
  placeholder = "Enter formula",
  className = "",
}: FormulaInputMobileProps) {
  const [showKeyboard, setShowKeyboard] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isPhone } = useDeviceType();

  const handleSymbolClick = (symbol: string) => {
    if (inputRef.current) {
      const start = inputRef.current.selectionStart || value.length;
      const newValue = value.slice(0, start) + symbol + value.slice(start);
      onChange(newValue);

      // Keep focus on input and position cursor after symbol
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(
            start + symbol.length,
            start + symbol.length,
          );
        }
      }, 0);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className={`flex flex-col gap-2 p-2 sm:p-4 ${className}`}>
      {/* Input field */}
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-base sm:text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          aria-label="Formula input"
        />

        {/* Toggle Math Keyboard Button */}
        <button
          onClick={() => setShowKeyboard(!showKeyboard)}
          className="min-h-[44px] min-w-[44px] px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 sm:self-start"
          aria-label="Toggle math keyboard"
          aria-pressed={showKeyboard}
        >
          <span className="text-lg">𝑓(x)</span>
          <span className="text-xs hidden sm:inline">
            {showKeyboard ? "Hide" : "Show"} Math
          </span>
        </button>
      </div>

      {/* Math Keyboard - Bottom Sheet on Mobile */}
      {showKeyboard && (
        <div
          className={`
            math-keyboard
            bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600
            rounded-t-lg p-2 sm:p-4
            max-h-[40vh] overflow-y-auto
            ${isPhone ? "fixed left-0 right-0 bottom-0 z-40 rounded-t-lg rounded-b-none" : ""}
          `}
          role="toolbar"
          aria-label="Math symbols keyboard"
        >
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
            {MATH_SYMBOLS.map((item) => (
              <button
                key={item.symbol}
                onClick={() => handleSymbolClick(item.symbol)}
                className={`
                  math-symbol
                  min-h-[44px] min-w-[44px] h-12 sm:h-14
                  flex items-center justify-center
                  bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500
                  hover:bg-blue-50 dark:hover:bg-gray-500 hover:border-blue-400
                  rounded-md font-semibold text-sm sm:text-base
                  transition-colors active:bg-blue-100 dark:active:bg-gray-400
                  text-gray-900 dark:text-white
                `}
                title={item.name}
                aria-label={item.name}
              >
                {item.symbol}
              </button>
            ))}
          </div>

          {/* Close button on mobile */}
          {isPhone && (
            <button
              onClick={() => setShowKeyboard(false)}
              className="w-full mt-2 min-h-[44px] px-3 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
              aria-label="Close math keyboard"
            >
              Done
            </button>
          )}
        </div>
      )}
    </div>
  );
}
