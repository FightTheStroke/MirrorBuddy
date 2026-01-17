'use client';

// ============================================================================
// ARCHIVE VIEW
// Unified view for browsing all saved materials (tools, PDFs, photos)
// Issue #37: Unified Archive page with bookmark, rating, filters
// ============================================================================

import { AnimatePresence } from 'framer-motion';
import {
  TOOL_LABELS,
  EmptyState,
  GridView,
  ListView,
  MaterialViewer,
  ArchiveHeader,
  ArchiveFilters,
  useArchiveView,
} from './archive';

export function ArchiveView() {
  const {
    filter,
    setFilter,
    sortBy,
    setSortBy,
    searchQuery,
    viewMode,
    setViewMode,
    subjectFilter,
    setSubjectFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    isLoading,
    selectedItem,
    filtered,
    availableSubjects,
    countByType,
    handleDelete,
    handleView,
    handleCloseViewer,
    handleNavigateToRelated,
    handleSearchChange,
    handleBookmark,
    handleRate,
    clearFilters,
    hasActiveFilters,
  } = useArchiveView();

  return (
    <div className="space-y-6">
      {/* Header */}
      <ArchiveHeader
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        sortBy={sortBy}
        onSortChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Filters */}
      <ArchiveFilters
        filter={filter}
        onFilterChange={setFilter}
        countByType={countByType}
        subjectFilter={subjectFilter}
        onSubjectChange={setSubjectFilter}
        availableSubjects={availableSubjects}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Content */}
      <div role="tabpanel" aria-label={`Materiali ${filter === 'all' ? 'tutti' : filter === 'bookmarked' ? 'preferiti' : TOOL_LABELS[filter]}`}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} />
        ) : viewMode === 'grid' ? (
          <GridView
            items={filtered}
            onDelete={handleDelete}
            onView={handleView}
            onBookmark={handleBookmark}
            onRate={handleRate}
          />
        ) : (
          <ListView
            items={filtered}
            onDelete={handleDelete}
            onView={handleView}
            onBookmark={handleBookmark}
            onRate={handleRate}
          />
        )}
      </div>

      {/* Material Viewer Modal */}
      <AnimatePresence>
        {selectedItem && (
          <MaterialViewer
            item={selectedItem}
            onClose={handleCloseViewer}
            onNavigate={handleNavigateToRelated}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
