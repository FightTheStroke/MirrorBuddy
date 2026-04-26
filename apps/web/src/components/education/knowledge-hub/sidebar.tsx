/**
 * Knowledge Hub Sidebar
 * Collections navigation and sidebar toggle button
 */

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarNavigation } from "./components/sidebar-navigation";
import type { ViewMode } from "./knowledge-hub/types";
import type { Collection as SidebarCollection } from "./components/sidebar-navigation";

interface KnowledgeHubSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  viewMode: ViewMode;
  collections: SidebarCollection[];
  selectedCollectionId: string | null;
  onSelectCollection: (id: string | null) => void;
}

export function KnowledgeHubSidebar({
  isCollapsed,
  onToggleCollapse,
  viewMode,
  collections,
  selectedCollectionId,
  onSelectCollection,
}: KnowledgeHubSidebarProps) {
  const shouldShowSidebar = !isCollapsed && viewMode !== "explorer";

  return (
    <>
      {/* Sidebar Panel */}
      {shouldShowSidebar && (
        <div className="w-full max-w-full lg:w-64 flex-shrink-0 bg-white dark:bg-slate-800 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-700 overflow-y-auto overflow-x-hidden">
          <SidebarNavigation
            collections={collections}
            selectedCollectionId={selectedCollectionId}
            onSelectCollection={onSelectCollection}
            onCreateCollection={() => {
              // Open collection creation dialog
            }}
            tags={[]}
            onToggleTag={() => {}}
          />
        </div>
      )}

      {/* Sidebar Toggle Button */}
      {viewMode !== "explorer" && (
        <button
          onClick={onToggleCollapse}
          className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden lg:flex",
            "p-1 rounded-r-lg",
            "bg-white dark:bg-slate-800 border border-l-0 border-slate-200 dark:border-slate-700",
            "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300",
            "transition-colors",
          )}
          aria-label={isCollapsed ? "Mostra sidebar" : "Nascondi sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      )}
    </>
  );
}
