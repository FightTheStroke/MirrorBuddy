"use client";

import { Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * ProtectedUsersCard Component
 * Displays the whitelist of protected users from PROTECTED_USERS environment variable
 * These users are excluded from test data cleanup operations
 *
 * @component
 */
export function ProtectedUsersCard() {
  // Parse PROTECTED_USERS from environment variable
  const protectedUsersEnv = process.env.PROTECTED_USERS || "";
  const protectedUsers = protectedUsersEnv
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email.length > 0);

  const hasProtectedUsers = protectedUsers.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Protected Users
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Utenti esclusi da cleanup test
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {hasProtectedUsers ? (
          <ul className="space-y-2">
            {protectedUsers.map((email) => (
              <li
                key={email}
                className="flex items-center gap-2 text-sm text-foreground"
              >
                <span className="text-muted-foreground">•</span>
                <span>{email}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Nessun utente protetto configurato
          </p>
        )}
      </CardContent>
    </Card>
  );
}
