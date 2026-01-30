/**
 * Key Vault Table Component
 * Displays stored credentials with masked values
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Eye, Pencil, Trash2, Copy, Check } from "lucide-react";
import type { MaskedSecretVaultEntry } from "@/lib/admin/key-vault-types";

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  return "just now";
}

interface KeyVaultTableProps {
  secrets: MaskedSecretVaultEntry[];
  onEdit: (secret: MaskedSecretVaultEntry) => void;
  onDelete: (secret: MaskedSecretVaultEntry) => void;
}

export function KeyVaultTable({
  secrets,
  onEdit,
  onDelete,
}: KeyVaultTableProps) {
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleReveal = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/key-vault/${id}`);
      if (!response.ok) throw new Error("Failed to decrypt");
      const data = await response.json();
      setRevealedSecret(data.value);
      setTimeout(() => setRevealedSecret(null), 10000);
    } catch (_error) {
      alert("Failed to reveal secret");
    }
  };

  const handleCopy = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/key-vault/${id}`);
      if (!response.ok) throw new Error("Failed to decrypt");
      const data = await response.json();
      await navigator.clipboard.writeText(data.value);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (_error) {
      alert("Failed to copy secret");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-500";
      case "expired":
        return "bg-red-500/10 text-red-500";
      case "rotated":
        return "bg-yellow-500/10 text-yellow-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  if (secrets.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No secrets stored yet. Click &ldquo;Add Key&rdquo; to create one.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Service</TableHead>
          <TableHead>Key Name</TableHead>
          <TableHead>Value</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Last Used</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {secrets.map((secret) => (
          <TableRow key={secret.id}>
            <TableCell className="font-medium">{secret.service}</TableCell>
            <TableCell className="font-mono text-sm">
              {secret.keyName}
            </TableCell>
            <TableCell className="font-mono text-sm">
              {revealedSecret ? (
                <span className="text-xs">{revealedSecret}</span>
              ) : (
                secret.maskedValue
              )}
            </TableCell>
            <TableCell>
              <Badge className={getStatusColor(secret.status)}>
                {secret.status}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {secret.lastUsed
                ? formatRelativeTime(new Date(secret.lastUsed))
                : "Never"}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReveal(secret.id)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(secret.id)}
                >
                  {copiedId === secret.id ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(secret)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(secret)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
