"use client";

import { useState, useEffect } from "react";
import { FlaskConical, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { csrfFetch } from "@/lib/auth/csrf-client";
import type { TierName } from "@/types/tier-types";

interface SimulationStatus {
  isSimulating: boolean;
  simulatedTier: TierName | null;
}

const TIER_OPTIONS: { value: TierName; label: string; color: string }[] = [
  { value: "trial", label: "Trial", color: "bg-slate-500" },
  { value: "base", label: "Base", color: "bg-blue-500" },
  { value: "pro", label: "Pro", color: "bg-purple-500" },
];

/**
 * Admin-only tier simulator widget
 * Allows admins to simulate different tier levels for testing
 */
export function TierSimulator() {
  const [status, setStatus] = useState<SimulationStatus>({
    isSimulating: false,
    simulatedTier: null,
  });
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);

  // Fetch current simulation status on mount
  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/admin/simulate-tier");
        if (res.ok) {
          const data = (await res.json()) as SimulationStatus;
          setStatus(data);
        }
      } catch {
        // Silently fail - admin check will handle unauthorized
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, []);

  const simulateTier = async (tier: TierName) => {
    setChanging(true);
    try {
      const res = await csrfFetch("/api/admin/simulate-tier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      if (res.ok) {
        setStatus({ isSimulating: true, simulatedTier: tier });
        // Reload page to apply simulated tier
        window.location.reload();
      }
    } catch {
      // Handle error silently
    } finally {
      setChanging(false);
    }
  };

  const clearSimulation = async () => {
    setChanging(true);
    try {
      const res = await csrfFetch("/api/admin/simulate-tier", {
        method: "DELETE",
      });
      if (res.ok) {
        setStatus({ isSimulating: false, simulatedTier: null });
        // Reload page to apply real tier
        window.location.reload();
      }
    } catch {
      // Handle error silently
    } finally {
      setChanging(false);
    }
  };

  if (loading) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 h-9",
            status.isSimulating &&
              "border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300",
          )}
        >
          <FlaskConical className="h-4 w-4" />
          {status.isSimulating ? (
            <span className="hidden sm:inline">
              SIM: {status.simulatedTier?.toUpperCase()}
            </span>
          ) : (
            <span className="hidden sm:inline">Simula Tier</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs text-slate-500 font-normal">
          Simula un tier per testing
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {TIER_OPTIONS.map((tier) => (
          <DropdownMenuItem
            key={tier.value}
            onClick={() => simulateTier(tier.value)}
            disabled={changing}
            className="cursor-pointer"
          >
            <span className={cn("w-2 h-2 rounded-full mr-2", tier.color)} />
            <span className="flex-1">{tier.label}</span>
            {status.simulatedTier === tier.value && (
              <Check className="h-4 w-4 text-green-500" />
            )}
            {changing && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
          </DropdownMenuItem>
        ))}
        {status.isSimulating && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={clearSimulation}
              disabled={changing}
              className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
            >
              <X className="h-4 w-4 mr-2" />
              Termina Simulazione
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
