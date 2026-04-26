"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { csrfFetch } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";

interface CharacterData {
  id: string;
  name: string;
  displayName: string;
  type: "MAESTRO" | "COACH" | "BUDDY";
  isEnabled: boolean;
  avatar: string;
  subject?: string;
  color: string;
  tools: string[];
  displayNameOverride?: string | null;
  descriptionOverride?: string | null;
  configId?: string;
}

interface CharacterEditModalProps {
  character: CharacterData;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function CharacterEditModal({
  character,
  open,
  onClose,
  onSaved,
}: CharacterEditModalProps) {
  const t = useTranslations("admin");
  const [displayName, setDisplayName] = useState(
    character.displayNameOverride || "",
  );
  const [description, setDescription] = useState(
    character.descriptionOverride || "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await csrfFetch(`/api/admin/characters/${character.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayNameOverride: displayName || null,
          descriptionOverride: description || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const avatarPath = character.avatar.startsWith("/")
    ? character.avatar
    : `/${character.avatar}`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogTitle>{t("characters.editTitle")}</DialogTitle>

        {/* Character header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="relative h-12 w-12 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
            <Image
              src={avatarPath}
              alt={character.displayName}
              fill
              className="object-cover"
              sizes="48px"
            />
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">
              {character.displayName}
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                {character.type}
              </Badge>
              {character.subject && (
                <span className="text-xs text-slate-500">
                  {character.subject}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4 pt-2">
          <div>
            <label
              htmlFor="displayNameOverride"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              {t("characters.displayNameOverride")}
            </label>
            <Input
              id="displayNameOverride"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={character.displayName}
            />
            <p className="text-xs text-slate-400 mt-1">
              {t("characters.displayNameHint")}
            </p>
          </div>

          <div>
            <label
              htmlFor="descriptionOverride"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              {t("characters.descriptionOverride")}
            </label>
            <textarea
              id="descriptionOverride"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
              placeholder={t("characters.descriptionHint")}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t("characters.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {t("characters.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
