"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CharacterCard } from "./character-card";
import { CharacterEditModal } from "./character-edit-modal";

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

const TABS = ["ALL", "MAESTRO", "COACH", "BUDDY"] as const;
type TabType = (typeof TABS)[number];

export function CharacterGrid() {
  const t = useTranslations("admin");
  const [characters, setCharacters] = useState<CharacterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("ALL");
  const [editingCharacter, setEditingCharacter] =
    useState<CharacterData | null>(null);

  const fetchCharacters = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/characters");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCharacters(data.characters);
    } catch {
      // Error handled by empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  const filtered =
    activeTab === "ALL"
      ? characters
      : characters.filter((c) => c.type === activeTab);

  const counts = {
    ALL: characters.length,
    MAESTRO: characters.filter((c) => c.type === "MAESTRO").length,
    COACH: characters.filter((c) => c.type === "COACH").length,
    BUDDY: characters.filter((c) => c.type === "BUDDY").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <>
      {/* Toolbar: tabs + refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {tab === "ALL"
                ? t("characters.all")
                : tab.charAt(0) + tab.slice(1).toLowerCase()}
              <span className="ml-1.5 text-xs opacity-60">{counts[tab]}</span>
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={fetchCharacters}>
          <RefreshCw className="h-4 w-4 mr-1.5" />
          {t("characters.refresh")}
        </Button>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((character) => (
          <CharacterCard
            key={character.id}
            character={character}
            onEdit={() => setEditingCharacter(character)}
            onToggle={fetchCharacters}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-slate-500 py-8">
          {t("characters.noResults")}
        </p>
      )}

      {/* Edit modal */}
      {editingCharacter && (
        <CharacterEditModal
          character={editingCharacter}
          open={!!editingCharacter}
          onClose={() => setEditingCharacter(null)}
          onSaved={fetchCharacters}
        />
      )}
    </>
  );
}
