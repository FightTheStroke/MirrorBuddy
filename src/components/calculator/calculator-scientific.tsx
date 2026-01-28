"use client";

import { useCallback } from "react";
import { Delete } from "lucide-react";
import { Button } from "@/components/ui/button";
import { evaluate, pi, e } from "mathjs";
import { useCalculatorStore } from "@/lib/stores/calculator-store";
import { cn } from "@/lib/utils";

const BUTTONS_ROW1 = ["sin", "cos", "tan", "π"];
const BUTTONS_ROW2 = ["log", "ln", "√", "^"];
const BUTTONS_ROW3 = ["(", ")", "e", "!"];
const BUTTONS_ROW4 = ["C", "±", "%", "÷"];
const BUTTONS_ROW5 = ["7", "8", "9", "×"];
const BUTTONS_ROW6 = ["4", "5", "6", "-"];
const BUTTONS_ROW7 = ["1", "2", "3", "+"];
const BUTTONS_ROW8 = ["0", ".", "⌫", "="];

const ALL_BUTTONS = [
  BUTTONS_ROW1,
  BUTTONS_ROW2,
  BUTTONS_ROW3,
  BUTTONS_ROW4,
  BUTTONS_ROW5,
  BUTTONS_ROW6,
  BUTTONS_ROW7,
  BUTTONS_ROW8,
];

export function CalculatorScientific() {
  const {
    display,
    expression,
    setDisplay,
    setExpression,
    addToHistory,
    clear,
  } = useCalculatorStore();

  const handleButton = useCallback(
    (btn: string) => {
      // Clear
      if (btn === "C") {
        clear();
        return;
      }

      // Backspace
      if (btn === "⌫") {
        if (display.length > 1) {
          setDisplay(display.slice(0, -1));
        } else {
          setDisplay("0");
        }
        return;
      }

      // Negate
      if (btn === "±") {
        if (display !== "0") {
          setDisplay(
            display.startsWith("-") ? display.slice(1) : "-" + display,
          );
        }
        return;
      }

      // Percent
      if (btn === "%") {
        try {
          const result = evaluate(`${display} / 100`);
          setDisplay(String(result));
        } catch {
          setDisplay("Error");
        }
        return;
      }

      // Constants
      if (btn === "π") {
        setDisplay(String(pi));
        return;
      }
      if (btn === "e") {
        setDisplay(String(e));
        return;
      }

      // Scientific functions
      if (["sin", "cos", "tan", "log", "ln", "√", "!"].includes(btn)) {
        try {
          let result: number;
          const val = parseFloat(display);
          switch (btn) {
            case "sin":
              result = evaluate(`sin(${val} deg)`);
              break;
            case "cos":
              result = evaluate(`cos(${val} deg)`);
              break;
            case "tan":
              result = evaluate(`tan(${val} deg)`);
              break;
            case "log":
              result = evaluate(`log10(${val})`);
              break;
            case "ln":
              result = evaluate(`log(${val})`);
              break;
            case "√":
              result = evaluate(`sqrt(${val})`);
              break;
            case "!":
              result = evaluate(`factorial(${val})`);
              break;
            default:
              result = val;
          }
          const formatted = Number.isInteger(result)
            ? String(result)
            : result.toFixed(8).replace(/\.?0+$/, "");
          setDisplay(formatted);
        } catch {
          setDisplay("Error");
        }
        return;
      }

      // Power
      if (btn === "^") {
        setExpression(expression + display + "^");
        setDisplay("0");
        return;
      }

      // Parentheses
      if (btn === "(" || btn === ")") {
        if (display === "0" && btn === "(") {
          setExpression(expression + "(");
        } else {
          setExpression(expression + display + btn);
          setDisplay("0");
        }
        return;
      }

      // Equals
      if (btn === "=") {
        try {
          const expr = expression + display;
          const result = evaluate(expr);
          const formatted = Number.isInteger(result)
            ? String(result)
            : result.toFixed(8).replace(/\.?0+$/, "");
          addToHistory(`${expr} = ${formatted}`);
          setDisplay(formatted);
          setExpression("");
        } catch {
          setDisplay("Error");
          setExpression("");
        }
        return;
      }

      // Operators
      if (["+", "-", "×", "÷"].includes(btn)) {
        const op = btn === "÷" ? "/" : btn === "×" ? "*" : btn;
        setExpression(expression + display + op);
        setDisplay("0");
        return;
      }

      // Number or decimal
      if (btn === "." && display.includes(".")) return;
      if (display === "0" && btn !== ".") {
        setDisplay(btn);
      } else {
        setDisplay(display + btn);
      }
    },
    [display, expression, setDisplay, setExpression, addToHistory, clear],
  );

  const getButtonStyle = (btn: string) => {
    if (btn === "=") return "bg-blue-600 hover:bg-blue-700 text-white";
    if (["+", "-", "×", "÷", "^"].includes(btn))
      return "bg-slate-200 dark:bg-slate-700";
    if (
      ["sin", "cos", "tan", "log", "ln", "√", "!", "π", "e", "(", ")"].includes(
        btn,
      )
    ) {
      return "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300";
    }
    if (["C", "±", "%"].includes(btn)) return "bg-slate-100 dark:bg-slate-800";
    return "bg-white dark:bg-slate-900";
  };

  return (
    <div className="space-y-2">
      {/* Display */}
      <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 text-right">
        {expression && (
          <div className="text-xs text-slate-500 truncate">{expression}</div>
        )}
        <div className="text-xl font-mono font-semibold text-slate-900 dark:text-white truncate">
          {display}
        </div>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-4 gap-1">
        {ALL_BUTTONS.flat().map((btn, idx) => (
          <Button
            key={idx}
            variant="ghost"
            onClick={() => handleButton(btn)}
            className={cn(
              "h-9 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700",
              "hover:bg-slate-100 dark:hover:bg-slate-700",
              getButtonStyle(btn),
            )}
          >
            {btn === "⌫" ? <Delete className="w-4 h-4" /> : btn}
          </Button>
        ))}
      </div>
    </div>
  );
}
