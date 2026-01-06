'use client';

import { AnimatePresence } from 'framer-motion';
import { MaterialViewer } from '@/components/education/archive';
import { useZainoView } from './hooks/use-zaino-view';
import { ZainoHeader } from './components/zaino-header';
import { FilterChips } from './components/filter-chips';
import { SearchControls } from './components/search-controls';
import { LearningPathsView } from './components/learning-paths-view';
import { ResultsSection } from './components/results-section';
import { EmptyStateTips } from './components/empty-state-tips';

interface ZainoViewProps {
  initialType?: string;
  initialSubject?: string;
  initialMaestro?: string;
}

export function ZainoView({
  initialType,
  initialSubject,
  initialMaestro,
}: ZainoViewProps) {
  const {
    sortBy,
    setSortBy,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    isLoading,
    selectedItem,
    filtered,
    showFilters,
    setShowFilters,
    typeFilter,
    subjectFilter,
    maestroFilter,
    isPercorsi,
    counts,
    subjects,
    allMaestri,
    hasAdvancedFilters,
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
    getFilterCount,
    navigate,
    debouncedQuery,
  } = useZainoView({ initialType, initialSubject, initialMaestro });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <ZainoHeader />

        <FilterChips
          typeFilter={typeFilter}
          onFilterChange={handleTypeFilter}
          getFilterCount={getFilterCount}
        />

        {!isPercorsi && (
          <SearchControls
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
            hasAdvancedFilters={hasAdvancedFilters}
            subjectFilter={subjectFilter}
            maestroFilter={maestroFilter}
            subjects={subjects}
            allMaestri={allMaestri}
            counts={counts}
            onNavigate={navigate}
          />
        )}

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
