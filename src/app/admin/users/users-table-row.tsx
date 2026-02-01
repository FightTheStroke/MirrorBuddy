"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableCell } from "@/components/ui/table";
import {
  Lock,
  Unlock,
  Trash2,
  RefreshCw,
  Settings,
  ExternalLink,
} from "lucide-react";
import { TierChangeModal } from "@/components/admin/tier-change-modal";
import { UserLimitOverrideModal } from "@/components/admin/user-limit-override-modal";

interface User {
  id: string;
  username: string | null;
  email: string | null;
  role: "USER" | "ADMIN";
  disabled: boolean;
  createdAt: Date;
  subscription: {
    id: string;
    tier: {
      id: string;
      code: string;
      name: string;
      chatLimitDaily: number;
      voiceMinutesDaily: number;
      toolsLimitDaily: number;
      docsLimitTotal: number;
      features: unknown;
    };
    overrideLimits: unknown;
    overrideFeatures: unknown;
  } | null;
}

interface Tier {
  id: string;
  code: string;
  name: string;
}

interface UsersTableRowProps {
  user: User;
  isSelected: boolean;
  isLoading: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onDelete: () => void;
  availableTiers: Tier[];
}

function getTierDisplay(user: User): {
  name: string;
  variant: "success" | "warning" | "neutral";
} {
  const tierName = user.subscription?.tier.name || "Base";
  const tierCode = user.subscription?.tier.code || "BASE";

  // Determine variant based on tier code
  let variant: "success" | "warning" | "neutral" = "neutral";
  if (tierCode === "PRO") {
    variant = "success";
  } else if (tierCode === "TRIAL") {
    variant = "warning";
  }

  return { name: tierName, variant };
}

export function UsersTableRow({
  user,
  isSelected,
  isLoading,
  onSelect,
  onToggle,
  onDelete,
  availableTiers,
}: UsersTableRowProps) {
  const router = useRouter();
  const [showTierModal, setShowTierModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const tierDisplay = getTierDisplay(user);

  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "BUTTON" ||
      target.closest("button")
    ) {
      return;
    }
    router.push(`/admin/users/${user.id}`);
  };

  return (
    <>
      <tr
        className="border-b hover:bg-accent cursor-pointer"
        onClick={handleRowClick}
      >
        <TableCell className="px-3 py-3 w-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="rounded"
          />
        </TableCell>
        <TableCell className="font-medium">{user.username || "—"}</TableCell>
        <TableCell className="text-muted-foreground">
          {user.email || "—"}
        </TableCell>
        <TableCell>
          <StatusBadge variant={user.role === "ADMIN" ? "warning" : "neutral"}>
            {user.role}
          </StatusBadge>
        </TableCell>
        <TableCell>
          <StatusBadge variant={tierDisplay.variant}>
            {tierDisplay.name}
          </StatusBadge>
        </TableCell>
        <TableCell>
          <StatusBadge variant={user.disabled ? "disabled" : "active"}>
            {user.disabled ? "Disabled" : "Active"}
          </StatusBadge>
        </TableCell>
        <TableCell className="text-muted-foreground">
          {new Date(user.createdAt).toLocaleDateString()}
        </TableCell>
        <TableCell>
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowTierModal(true)}
              disabled={isLoading}
              className="text-xs"
              aria-label="Change tier"
              title="Change tier"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowLimitModal(true)}
              disabled={isLoading || !user.subscription}
              className="text-xs"
              aria-label="Override limits"
              title="Override limits"
            >
              <Settings className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onToggle}
              disabled={isLoading}
              className="text-xs"
              aria-label={user.disabled ? "Enable user" : "Disable user"}
            >
              {user.disabled ? (
                <Unlock className="w-3 h-3" />
              ) : (
                <Lock className="w-3 h-3" />
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onDelete}
              disabled={isLoading}
              className="text-xs text-red-600"
              aria-label="Delete user"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/admin/users/${user.id}`)}
              className="text-xs"
              aria-label="View user details"
              title="View details"
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </TableCell>
      </tr>

      <TierChangeModal
        isOpen={showTierModal}
        onClose={() => setShowTierModal(false)}
        onSuccess={() => {
          // Reload the page to show updated tier
          window.location.reload();
        }}
        user={{
          id: user.id,
          username: user.username,
          email: user.email,
          currentTier: user.subscription?.tier,
        }}
        availableTiers={availableTiers}
      />

      {user.subscription && (
        <UserLimitOverrideModal
          isOpen={showLimitModal}
          onClose={() => setShowLimitModal(false)}
          onSuccess={() => {
            // Reload the page to show updated overrides
            window.location.reload();
          }}
          user={{
            id: user.id,
            username: user.username,
            email: user.email,
            subscription: user.subscription,
          }}
        />
      )}
    </>
  );
}
