"use client";

import { useState } from "react";
import {
  UserPlus,
  Users,
  Activity,
  AlertTriangle,
  ChevronDown,
  RefreshCw,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/admin/kpi-card";
import { CostPanel } from "@/components/admin/CostPanel";
import { FeatureFlagsPanel } from "@/components/admin/FeatureFlagsPanel";
import { SLOMonitoringPanel } from "@/components/admin/SLOMonitoringPanel";
import { cn } from "@/lib/utils";
import { useAdminCountsSSE } from "@/hooks/use-admin-counts-sse";

const GRAFANA_DASHBOARD_URL = "https://mirrorbuddy.grafana.net/d/dashboard/";

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 bg-card hover:bg-accent transition-colors"
      >
        <span className="font-medium text-foreground">{title}</span>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-muted-foreground transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>
      {isOpen && (
        <div className="p-6 border-t border-border bg-muted">{children}</div>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { counts, status, error } = useAdminCountsSSE();

  // Handle manual refresh (re-establish SSE connection)
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    // Trigger a manual page reload to re-establish SSE connection
    // In a more sophisticated implementation, we could implement a refresh signal
    // via postMessage or similar mechanism, but page reload ensures fresh state
    setTimeout(() => {
      setIsRefreshing(false);
      window.location.reload();
    }, 500);
  };

  // Show loading state while connecting
  if (status === "idle" || status === "connecting") {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Connection Status Indicators */}
      {status === "reconnecting" && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Reconnecting to admin data stream...
          </p>
        </div>
      )}
      {status === "error" && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">
            {error || "Connection failed. Please refresh the page."}
          </p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-end gap-2 mb-6">
        <Button variant="outline" size="sm" asChild>
          <a
            href={GRAFANA_DASHBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Grafana
          </a>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")}
          />
          Aggiorna
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          title="Richieste Beta"
          value={counts.pendingInvites}
          subValue="In attesa di approvazione"
          icon={UserPlus}
          href="/admin/invites"
          badge={counts.pendingInvites}
          badgeColor="amber"
          color="purple"
        />
        <KpiCard
          title="Utenti Totali"
          value={counts.totalUsers}
          subValue="Utenti registrati"
          icon={Users}
          href="/admin/users"
          color="blue"
        />
        <KpiCard
          title="Utenti Attivi"
          value={counts.activeUsers24h}
          subValue="Nelle ultime 24 ore"
          icon={Activity}
          href="/admin/analytics"
          color="green"
        />
        <KpiCard
          title="Alert Sistema"
          value={counts.systemAlerts}
          subValue="Eventi critici non risolti"
          icon={AlertTriangle}
          badge={counts.systemAlerts}
          badgeColor={counts.systemAlerts ? "red" : "green"}
          color={counts.systemAlerts ? "red" : "green"}
        />
      </div>

      {/* Collapsible Panels */}
      <div className="space-y-4">
        <CollapsibleSection title="Cost Monitoring" defaultOpen={false}>
          <CostPanel />
        </CollapsibleSection>

        <CollapsibleSection title="Feature Flags" defaultOpen={false}>
          <FeatureFlagsPanel />
        </CollapsibleSection>

        <CollapsibleSection title="SLO Monitoring" defaultOpen={false}>
          <SLOMonitoringPanel />
        </CollapsibleSection>
      </div>
    </div>
  );
}
