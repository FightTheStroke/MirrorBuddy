"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  MessageCircle,
  BookOpen,
  Users,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TrialOnboardingProps {
  onComplete: () => void;
}

const STEPS = [
  {
    icon: MessageCircle,
    title: "10 messaggi gratuiti",
    description:
      "Prova MirrorBuddy con 10 messaggi gratuiti. Chatta con i nostri Maestri e scopri il tuo modo di imparare.",
  },
  {
    icon: Users,
    title: "3 Maestri da esplorare",
    description:
      "Scegli tra Einstein, Leonardo e Curie. Nella versione completa avrai accesso a tutti i 17 Maestri!",
  },
  {
    icon: BookOpen,
    title: "Strumenti essenziali",
    description:
      "Prova mappe mentali e riassunti. Quiz, flashcard e altri strumenti sono nella beta completa.",
  },
];

/**
 * Trial Onboarding
 *
 * Quick intro shown to new trial users.
 * Explains trial limits.
 */
export function TrialOnboarding({ onComplete }: TrialOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const step = STEPS[currentStep];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600 p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Progress */}
        <div className="flex gap-1 p-4">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-colors ${
                i <= currentStep
                  ? "bg-blue-500"
                  : "bg-slate-200 dark:bg-slate-700"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-8 text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Icon className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Text */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {step.title}
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              {step.description}
            </p>
          </div>

          {/* Navigation */}
          <div className="pt-4">
            <Button onClick={handleNext} size="lg" className="w-full gap-2">
              {currentStep < STEPS.length - 1 ? (
                <>
                  Avanti
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                "Inizia a provare"
              )}
            </Button>
          </div>

          {/* Skip */}
          {currentStep < STEPS.length - 1 && (
            <button
              onClick={onComplete}
              className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Salta introduzione
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 space-y-3">
          <p className="text-xs text-center text-slate-400">
            Nessuna carta di credito richiesta. Prova gratuita.
          </p>
          <div className="flex justify-center">
            <Link href="/invite/request">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-purple-600 dark:text-purple-400"
              >
                <UserPlus className="w-3 h-3 mr-1" />
                Vuoi l&apos;accesso completo? Richiedi la beta
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrialOnboarding;
