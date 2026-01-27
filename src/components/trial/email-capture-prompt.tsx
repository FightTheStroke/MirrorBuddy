"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, X } from "lucide-react";

interface EmailCapturePromptProps {
  sessionId: string;
  messageCount: number;
  showOnLimit?: boolean;
  threshold?: number;
}

/**
 * Email capture prompt for trial users
 *
 * Shows after N messages or when hitting limit to encourage conversion.
 * Dismissible and stores dismissal in localStorage.
 */
export function EmailCapturePrompt({
  sessionId,
  messageCount,
  showOnLimit = false,
  threshold = 5,
}: EmailCapturePromptProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, _setSuccess] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check localStorage for dismissal
  useEffect(() => {
    const dismissed = localStorage.getItem(
      "mirrorbuddy-email-prompt-dismissed",
    );
    if (dismissed === "true") {
      setIsDismissed(true);
    }
  }, []);

  // Determine if prompt should show
  const shouldShow =
    !isDismissed &&
    !success &&
    !verificationSent &&
    (messageCount >= threshold || showOnLimit);

  const handleDismiss = () => {
    localStorage.setItem("mirrorbuddy-email-prompt-dismissed", "true");
    setIsDismissed(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/trial/email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save email");
      }

      localStorage.setItem("mirrorbuddy-trial-session-id", sessionId);
      setVerificationSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save email");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!shouldShow) {
    return null;
  }

  if (success) {
    return (
      <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 rounded-lg">
        <Mail className="h-4 w-4 text-green-600 dark:text-green-400" />
        <p className="text-sm text-green-800 dark:text-green-200">
          Thanks! We will notify you when full features are available.
        </p>
      </div>
    );
  }

  if (verificationSent) {
    return (
      <div className="flex items-start gap-2 p-4 bg-indigo-50 border border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800 rounded-lg">
        <Mail className="h-4 w-4 text-indigo-600 dark:text-indigo-400 mt-0.5" />
        <p className="text-sm text-indigo-800 dark:text-indigo-200">
          Abbiamo inviato un codice di verifica. Inseriscilo su{" "}
          <Link href="/trial/verify" className="underline">
            /trial/verify
          </Link>{" "}
          per sbloccare gli strumenti della prova.
        </p>
      </div>
    );
  }

  return (
    <Card className="border-2 border-blue-200 dark:border-blue-800 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              {showOnLimit ? "Upgrade to Continue" : "Unlock Full Features"}
            </CardTitle>
            <CardDescription className="mt-1">
              {showOnLimit
                ? "Enter your email to learn about upgrading and continue learning"
                : "Get notified when more features become available"}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-6 w-6 rounded-full"
            aria-label="Maybe later"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            placeholder="your.email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            className="w-full"
            aria-label="Email address"
          />
          {error && (
            <div className="p-2 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
              aria-label="Submit"
            >
              {isSubmitting ? "Saving..." : "Notify Me"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDismiss}
              className="flex-1"
              aria-label="Maybe later"
            >
              Maybe Later
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
