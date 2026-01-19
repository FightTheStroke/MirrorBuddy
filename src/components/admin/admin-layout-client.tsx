"use client";

import { useState, useEffect } from "react";
import { AdminSidebar } from "./admin-sidebar";
import { AdminHeader } from "./admin-header";
import { cn } from "@/lib/utils";

interface AdminCounts {
  pendingInvites: number;
  systemAlerts: number;
}

interface AdminLayoutClientProps {
  children: React.ReactNode;
}

export function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [counts, setCounts] = useState<AdminCounts>({
    pendingInvites: 0,
    systemAlerts: 0,
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch counts for badges
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const response = await fetch("/api/admin/counts");
        if (response.ok) {
          const data = await response.json();
          setCounts({
            pendingInvites: data.pendingInvites || 0,
            systemAlerts: data.systemAlerts || 0,
          });
        }
      } catch {
        // Silently fail - badges will show 0
      }
    };

    fetchCounts();
    // Refresh every 30 seconds
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          pendingInvites={counts.pendingInvites}
          systemAlerts={counts.systemAlerts}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="lg:hidden">
            <AdminSidebar
              open={true}
              onToggle={() => setMobileMenuOpen(false)}
              pendingInvites={counts.pendingInvites}
              systemAlerts={counts.systemAlerts}
            />
          </div>
        </>
      )}

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
        />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
