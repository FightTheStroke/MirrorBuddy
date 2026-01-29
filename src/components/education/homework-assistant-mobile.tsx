/**
 * HomeworkAssistantMobile Component (REAL VISION INTEGRATION)
 */

"use client";

import { useState, useCallback } from "react";
import { Zap } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { InputSection } from "./homework-assistant-mobile/input-section";
import {
  SolutionDisplay,
  Solution,
} from "./homework-assistant-mobile/solution-display";
import { logger } from "@/lib/logger";

interface AnalysisPayload {
  file: File;
  subject?: string;
}

interface HomeworkAssistantMobileProps {
  onAnalyze?: (payload: AnalysisPayload) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function HomeworkAssistantMobile({
  onAnalyze,
  onError,
  className,
}: HomeworkAssistantMobileProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [solution, setSolution] = useState<Solution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisSuccess, setAnalysisSuccess] = useState(false);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileSelect = useCallback(
    async (file: File) => {
      setError(null);
      setSolution(null);
      setIsAnalyzing(true);
      setUploadProgress(10);

      try {
        const base64Image = await fileToBase64(file);
        setUploadProgress(30);

        const response = await fetch("/api/homework/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: base64Image,
            subject: selectedSubject,
          }),
        });

        setUploadProgress(70);

        if (!response.ok) {
          throw new Error("Failed to analyze homework. Please try again.");
        }

        const data = await response.json();
        setSolution(data);
        setAnalysisSuccess(true);
        setUploadProgress(100);
        
        onAnalyze?.({ file, subject: selectedSubject });

      } catch (err) {
        const msg = String(err);
        setError(msg);
        onError?.(msg);
        logger.error("Homework analysis UI failed", { error: msg });
      } finally {
        setIsAnalyzing(false);
        setTimeout(() => setAnalysisSuccess(false), 2000);
      }
    },
    [selectedSubject, onAnalyze, onError],
  );

  const handleReset = () => {
    setSolution(null);
    setError(null);
    setSelectedSubject("");
    setUploadProgress(0);
  };

  return (
    <div className={cn("w-full max-w-2xl mx-auto p-4 xs:p-6 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-lg", className)}>
      <div className="mb-6">
        <h2 className="text-xl xs:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Zap className="w-6 h-6 text-amber-500" />
          Homework Assistant (AI Vision)
        </h2>
        <p className="text-sm xs:text-base text-slate-600 dark:text-slate-400 mt-2">
          Capture your homework and I'll guide you through the solution
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!solution ? (
          <InputSection
            key="input"
            onFileSelect={handleFileSelect}
            onError={setError}
            isAnalyzing={isAnalyzing}
            uploadProgress={uploadProgress}
            error={error}
            analysisSuccess={analysisSuccess}
            selectedSubject={selectedSubject}
            onSubjectSelect={setSelectedSubject}
          />
        ) : (
          <SolutionDisplay
            key="solution"
            solution={solution}
            selectedSubject={selectedSubject}
            onReset={handleReset}
          />
        )}
      </AnimatePresence>
    </div>
  );
}