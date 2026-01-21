"use client";

import { useState, useEffect } from "react";
import { useAdminCountsSSE } from "@/hooks/use-admin-counts-sse";
import { AdminSidebar } from "./admin-sidebar";
import { AdminHeader } from "./admin-header";
import { cn } from "@/lib/utils";

interface AdminLayoutClientProps {
  children: React.ReactNode;
}

export function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // SSE hook for real-time admin counts
  const { counts, status, error } = useAdminCountsSSE();

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Connection Status Indicators */}
      {status === "reconnecting" && (
        <div className="bg-yellow-50 dark:bg-yellow-950/30 border-b border-yellow-200 dark:border-yellow-900 px-4 py-2 text-sm text-yellow-800 dark:text-yellow-200">
          Reconnecting to admin data stream...
        </div>
      )}
      {status === "error" && (
        <div className="bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-900 px-4 py-2 text-sm text-red-800 dark:text-red-200">
          {error || "Connection failed. Please refresh the page."}
        </div>
      )}

      {/* Sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          pendingInvites={counts.pendingInvites}
          systemAlerts={counts.systemAlerts}
        />
      </div>
      <div className="lg:hidden">
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}
        <AdminSidebar
          open={mobileMenuOpen}
          onToggle={() => setMobileMenuOpen(false)}
          pendingInvites={counts.pendingInvites}
          systemAlerts={counts.systemAlerts}
        />
      </div>

      {/* Main Content */}
      <div
        className={cn(
          "transition-all duration-300",
          sidebarOpen ? "lg:ml-64" : "lg:ml-20",
        )}
      >
        <AdminHeader
          onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          sidebarOpen={sidebarOpen}
          pendingInvites={counts.pendingInvites}
          systemAlerts={counts.systemAlerts}
        />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
