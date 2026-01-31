"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Fuse from "fuse.js";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getCommandItems, type CommandItem } from "./command-palette-items";

const FUSE_OPTIONS = {
  keys: [
    { name: "label", weight: 0.6 },
    { name: "keywords", weight: 0.3 },
    { name: "id", weight: 0.1 },
  ],
  threshold: 0.4,
  includeScore: true,
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const t = useTranslations("admin");

  const allItems = useMemo(() => getCommandItems(t), [t]);
  const fuse = useMemo(() => new Fuse(allItems, FUSE_OPTIONS), [allItems]);

  const results = useMemo(() => {
    if (!query.trim()) return allItems;
    return fuse.search(query).map((r) => r.item);
  }, [query, fuse, allItems]);

  const navItems = useMemo(
    () => results.filter((i) => i.section === "navigation"),
    [results],
  );
  const actionItems = useMemo(
    () => results.filter((i) => i.section === "action"),
    [results],
  );
  const flatItems = useMemo(
    () => [...navItems, ...actionItems],
    [navItems, actionItems],
  );

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setQuery("");
        setSelectedIndex(0);
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector("[data-selected='true']");
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const executeItem = useCallback(
    (item: CommandItem) => {
      setOpen(false);
      if (item.href) {
        router.push(item.href);
      } else if (item.action === "searchUser") {
        router.push("/admin/users");
      } else if (item.action === "approveInvites") {
        router.push("/admin/invites");
      } else if (item.action === "disableUser") {
        router.push("/admin/users");
      } else if (item.action === "refresh") {
        router.refresh();
      }
    },
    [router],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && flatItems[selectedIndex]) {
        e.preventDefault();
        executeItem(flatItems[selectedIndex]);
      }
    },
    [flatItems, selectedIndex, executeItem],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="max-w-lg p-0 gap-0 overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
          <Search className="h-5 w-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search pages and actions..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-white"
            aria-label="Search admin pages and actions"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-xs text-slate-500">
            esc
          </kbd>
        </div>

        {/* Results list */}
        <div
          ref={listRef}
          className="max-h-80 overflow-y-auto p-2"
          role="listbox"
          aria-label="Search results"
        >
          {flatItems.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-6">
              No results found
            </p>
          )}

          {navItems.length > 0 && (
            <CommandSection
              label="Pages"
              items={navItems}
              startIndex={0}
              selectedIndex={selectedIndex}
              onSelect={executeItem}
            />
          )}

          {actionItems.length > 0 && (
            <CommandSection
              label="Actions"
              items={actionItems}
              startIndex={navItems.length}
              selectedIndex={selectedIndex}
              onSelect={executeItem}
            />
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 border-t border-slate-200 dark:border-slate-800 px-4 py-2 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-slate-100 dark:bg-slate-800 px-1">
              ↑↓
            </kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-slate-100 dark:bg-slate-800 px-1">↵</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-slate-100 dark:bg-slate-800 px-1">
              esc
            </kbd>
            close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CommandSection({
  label,
  items,
  startIndex,
  selectedIndex,
  onSelect,
}: {
  label: string;
  items: CommandItem[];
  startIndex: number;
  selectedIndex: number;
  onSelect: (item: CommandItem) => void;
}) {
  return (
    <div className="mb-2">
      <p className="px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
        {label}
      </p>
      {items.map((item, i) => {
        const globalIndex = startIndex + i;
        const isSelected = globalIndex === selectedIndex;
        return (
          <button
            key={item.id}
            role="option"
            aria-selected={isSelected}
            data-selected={isSelected}
            onClick={() => onSelect(item)}
            className={cn(
              "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              isSelected
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">{item.label}</span>
            {item.href && (
              <span className="text-xs opacity-50 hidden sm:inline">
                {item.href}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
