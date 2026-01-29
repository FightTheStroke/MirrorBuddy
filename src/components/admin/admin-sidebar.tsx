"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Users,
  Settings,
  ShieldCheck,
  Languages,
  ChevronLeft,
  Microscope,
  School,
  LayoutDashboard,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogoBrain } from "@/components/branding/logo-brain";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Research", href: "/admin/research", icon: Microscope },
  { label: "School Portal", href: "/admin/school", icon: School },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Locales", href: "/admin/locales", icon: Languages },
  { label: "Safety", href: "/admin/safety", icon: ShieldCheck },
  { label: "Tiers", href: "/admin/tiers", icon: Zap },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3 border-b border-border">
        <LogoBrain size={32} />
        <span className="font-bold text-lg">Admin</span>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-11 px-4 rounded-xl",
                  isActive
                    ? "bg-primary/10 text-primary hover:bg-primary/15"
                    : "text-muted-foreground",
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <Link href="/">
          <Button variant="outline" className="w-full gap-2 rounded-xl">
            <ChevronLeft className="w-4 h-4" />
            Back to App
          </Button>
        </Link>
      </div>
    </aside>
  );
}
