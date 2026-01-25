/**
 * Solution Display Component
 *
 * Shows step-by-step solution for homework problems
 */

import { motion } from "framer-motion";
import { TouchTarget } from "@/components/ui/touch-target";
import { cn } from "@/lib/utils";

export interface Solution {
  steps: string[];
  answer: string;
  explanation: string;
}

interface SolutionDisplayProps {
  solution: Solution;
  selectedSubject?: string;
  onReset: () => void;
}

export function SolutionDisplay({
  solution,
  selectedSubject,
  onReset,
}: SolutionDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Subject Badge */}
      {selectedSubject && (
        <div className="inline-block">
          <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium">
            {selectedSubject}
          </span>
        </div>
      )}

      {/* Solution Steps */}
      <div className="space-y-4">
        <h3 className="text-lg xs:text-xl font-semibold text-slate-900 dark:text-white">
          Solution Steps
        </h3>
        <div className="space-y-3">
          {solution.steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex gap-4 p-3 xs:p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 dark:bg-blue-400 flex items-center justify-center text-white font-bold text-sm">
                {idx + 1}
              </div>
              <p className="flex-1 text-sm xs:text-base text-slate-700 dark:text-slate-300 break-words">
                {step}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Answer */}
      <div className="space-y-3">
        <h3 className="text-lg xs:text-xl font-semibold text-slate-900 dark:text-white">
          Answer
        </h3>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="p-4 xs:p-6 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg"
        >
          <p className="text-base xs:text-lg font-semibold text-green-700 dark:text-green-300 break-words">
            {solution.answer}
          </p>
        </motion.div>
      </div>

      {/* Explanation */}
      <div className="space-y-3">
        <h3 className="text-lg xs:text-xl font-semibold text-slate-900 dark:text-white">
          Explanation
        </h3>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="p-4 xs:p-6 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg"
        >
          <p className="text-sm xs:text-base text-amber-900 dark:text-amber-100 break-words leading-relaxed">
            {solution.explanation}
          </p>
        </motion.div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col xs:flex-row gap-3 pt-4">
        <TouchTarget asChild>
          <button
            type="button"
            onClick={onReset}
            className={cn(
              "flex-1",
              "py-3 px-4",
              "flex items-center justify-center gap-2",
              "rounded-lg border-2 border-slate-300 dark:border-slate-700",
              "bg-slate-50 dark:bg-slate-900",
              "text-slate-700 dark:text-slate-300",
              "font-semibold text-sm xs:text-base",
              "hover:bg-slate-100 dark:hover:bg-slate-800",
              "transition-colors duration-200",
              "focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950",
            )}
          >
            <span>Solve Another</span>
          </button>
        </TouchTarget>
      </div>
    </motion.div>
  );
}
