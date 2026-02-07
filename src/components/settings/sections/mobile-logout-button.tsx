"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { csrfFetch } from "@/lib/auth/csrf-client";
import { getUserIdFromCookie } from "@/lib/auth/client-auth";

export function MobileLogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isAuthenticated] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!getUserIdFromCookie();
  });

  if (!isAuthenticated) return null;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await csrfFetch("/api/auth/logout", { method: "POST" });
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("mirrorbuddy")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      window.location.href = "/welcome";
    } catch {
      setIsLoggingOut(false);
    }
  };

  return (
    <Button
      variant="destructive"
      className="w-full"
      onClick={handleLogout}
      disabled={isLoggingOut}
      data-testid="mobile-logout-button"
    >
      <LogOut className="w-4 h-4 mr-2" />
      {isLoggingOut ? "Disconnessione..." : "Disconnetti"}
    </Button>
  );
}
