"use client";

import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Cpu, Download, ShieldCheck } from "lucide-react";
import { edgeAI } from "@/lib/ai/providers/web-llm";

/**
 * 💻 WebLLM Model Status Component
 * Shows download progress for local Edge AI models.
 */
export function WebLLMStatus() {
  const [progress, setProgress] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const startDownload = async () => {
    setIsInitializing(true);
    try {
      await edgeAI.init((p) => setProgress(p * 100));
      setIsReady(true);
    } catch (err) {
      console.error("Failed to load local model", err);
    } finally {
      setIsInitializing(false);
    }
  };

  if (isReady) return (
    <div className="flex items-center gap-2 text-xs text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full border border-green-100">
      <ShieldCheck className="w-3.5 h-3.5" /> Edge AI Active (Offline Ready)
    </div>
  );

  return (
    <Card className="bg-slate-50 border-slate-200">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-violet-600" />
            <span className="text-sm font-semibold">Local AI Engine</span>
          </div>
          {!isInitializing && (
            <button 
              onClick={startDownload}
              className="text-xs bg-violet-600 text-white px-2 py-1 rounded hover:bg-violet-700 transition-colors"
            >
              Initialize Edge Mode
            </button>
          )}
        </div>
        
        {isInitializing && (
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] text-slate-500 uppercase tracking-wider font-bold">
              <span>Downloading Model Weights...</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
            <p className="text-[10px] text-slate-400 italic flex items-center gap-1">
              <Download className="w-3 h-3" /> Files will be cached in your browser for offline use.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
