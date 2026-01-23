/**
 * User Journey Lookup Component
 * Search and display individual user funnel journey
 * Plan 069 - Conversion Funnel Dashboard
 */

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, User, Clock, CheckCircle, XCircle } from "lucide-react";

interface JourneyEvent {
  stage: string;
  fromStage: string | null;
  createdAt: string;
  timeSincePrevious: number | null;
}

interface UserJourney {
  identifier: { visitorId: string | null; userId: string | null };
  journey: JourneyEvent[];
  summary: {
    firstSeen: string;
    lastSeen: string;
    currentStage: string;
    totalEvents: number;
    converted: boolean;
    churned: boolean;
    daysInFunnel: number;
  };
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) return `${Math.floor(hours / 24)}d`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function UserJourneyLookup() {
  const [searchId, setSearchId] = useState("");
  const [journey, setJourney] = useState<UserJourney | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    if (!searchId.trim()) return;

    setLoading(true);
    setError(null);
    setJourney(null);

    try {
      const param = searchId.includes("@") ? "userId" : "visitorId";
      const res = await fetch(
        `/api/admin/funnel/user?${param}=${encodeURIComponent(searchId)}`,
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "User not found");
        return;
      }

      setJourney(await res.json());
    } catch {
      setError("Failed to fetch journey");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          User Journey Lookup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="flex gap-2">
          <Input
            placeholder="Visitor ID or User Email"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={loading}>
            <Search className="w-4 h-4 mr-2" />
            {loading ? "..." : "Search"}
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 p-2 bg-red-50 dark:bg-red-900/20 rounded">
            {error}
          </div>
        )}

        {/* Journey Display */}
        {journey && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded">
                <p className="text-muted-foreground">Current Stage</p>
                <p className="font-semibold">{journey.summary.currentStage}</p>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded">
                <p className="text-muted-foreground">Days in Funnel</p>
                <p className="font-semibold">{journey.summary.daysInFunnel}</p>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded">
                <p className="text-muted-foreground">Status</p>
                <p className="font-semibold flex items-center gap-1">
                  {journey.summary.converted ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Converted
                    </>
                  ) : journey.summary.churned ? (
                    <>
                      <XCircle className="w-4 h-4 text-red-500" />
                      Churned
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 text-amber-500" />
                      Active
                    </>
                  )}
                </p>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded">
                <p className="text-muted-foreground">Events</p>
                <p className="font-semibold">{journey.summary.totalEvents}</p>
              </div>
            </div>

            {/* Timeline */}
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
              <div className="space-y-3">
                {journey.journey.map((event, idx) => (
                  <div key={idx} className="relative pl-10">
                    <div className="absolute left-2.5 w-3 h-3 rounded-full bg-purple-500" />
                    <div className="text-sm">
                      <span className="font-medium">{event.stage}</span>
                      {event.fromStage && (
                        <span className="text-muted-foreground">
                          {" "}
                          from {event.fromStage}
                        </span>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {new Date(event.createdAt).toLocaleString()}
                        {event.timeSincePrevious && (
                          <span className="ml-2">
                            (+{formatDuration(event.timeSincePrevious)})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
