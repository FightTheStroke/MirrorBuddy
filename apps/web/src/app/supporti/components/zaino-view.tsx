"use client";

import { AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { AlertCircle, Backpack } from "lucide-react";
import { MaterialViewer } from "@/components/education/archive";
import { PageHeader } from "@/components/ui/page-header";
import { useZainoView } from "./hooks/use-zaino-view";
import { FilterChips } from "./components/filter-chips";
import { SearchControls } from "./components/search-controls";
import { LearningPathsView } from "./components/learning-paths-view";
import { ResultsSection } from "./components/results-section";
import { EmptyStateTips } from "./components/empty-state-tips";

interface ZainoViewProps {
  initialType?: string;
  initialSubject?: string;
}

export function ZainoView({ initialType, initialSubject }: ZainoViewProps) {
  const t = useTranslations("education.supporti");
  const {
    sortBy,
    setSortBy,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    isLoading,
    error,
    selectedItem,
    filtered,
    typeFilter,
    dateFilter,
    subjectFilter,
    subjects,
    isPercorsi,
    counts,
    selectedPathId,
    setSelectedPathId,
    selectedTopicId,
    setSelectedTopicId,
    handleDelete,
    handleView,
    handleCloseViewer,
    handleBookmark,
    handleRate,
    handleTypeFilter,
    handleDateFilter,
    handleSubjectFilter,
    getSubjectFilterCount,
    getDateFilterCount,
    clearAllFilters,
    getFilterCount,
    hasActiveFilters,
    debouncedQuery,
  } = useZainoView({ initialType, initialSubject });

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-2 sm:px-4 max-w-7xl">
          <PageHeader icon={Backpack} title={t("pageTitle")} />
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
              {t("errorTitle")}
            </h3>
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              {t("reloadButton")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-2 sm:px-4 max-w-7xl">
        <PageHeader icon={Backpack} title={t("pageTitle")} />

        <div className="mb-6">
          <SearchControls
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            hasActiveFilters={hasActiveFilters}
            filteredCount={filtered.length}
            onClearFilters={clearAllFilters}
          />
        </div>

        <FilterChips
          typeFilter={typeFilter}
          dateFilter={dateFilter}
          subjectFilter={subjectFilter}
          subjects={subjects}
          onTypeFilterChange={handleTypeFilter}
          onDateFilterChange={handleDateFilter}
          onSubjectFilterChange={handleSubjectFilter}
          getTypeFilterCount={getFilterCount}
          getSubjectFilterCount={getSubjectFilterCount}
          getDateFilterCount={getDateFilterCount}
        />

        {isPercorsi ? (
          <LearningPathsView
            selectedPathId={selectedPathId}
            selectedTopicId={selectedTopicId}
            onPathSelect={setSelectedPathId}
            onTopicSelect={setSelectedTopicId}
            onBack={() => setSelectedTopicId(null)}
            onComplete={() => setSelectedTopicId(null)}
          />
        ) : (
          <ResultsSection
            isLoading={isLoading}
            filtered={filtered}
            viewMode={viewMode}
            typeFilter={typeFilter}
            debouncedQuery={debouncedQuery}
            onDelete={handleDelete}
            onView={handleView}
            onBookmark={handleBookmark}
            onRate={handleRate}
          />
        )}

        <EmptyStateTips
          show={!isLoading && counts.total === 0 && !isPercorsi}
        />
      </div>

      <AnimatePresence>
        {selectedItem && (
          <MaterialViewer item={selectedItem} onClose={handleCloseViewer} />
        )}
      </AnimatePresence>
    </div>
  );
}
