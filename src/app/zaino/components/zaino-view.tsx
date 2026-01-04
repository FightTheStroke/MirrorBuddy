'use client';

/**
 * Zaino View (Backpack - School Metaphor)
 * Dynamic 3-level navigation for learning materials
 * Level 1: Choose organization type (Per Materia | Per Data | Per Tipo)
 * Level 2: Dynamic folders based on L1 choice
 * Level 3: Content items with preview
 */

import { useState, useEffect, useMemo, useCallback, useRef, type ChangeEvent } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import Fuse from 'fuse.js';
import { Grid, List, Search, X, ChevronRight, Home, Loader2, FolderOpen, Calendar, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { getActiveMaterials, deleteMaterial } from '@/lib/storage/materials-db';
import { getAllMaestri } from '@/data/maestri';
import {
  type SortBy,
  type ViewMode,
  type ArchiveItem,
  SORT_OPTIONS,
  TOOL_LABELS,
  SUBJECT_LABELS,
  updateMaterialInteraction,
  EmptyState,
  GridView,
  ListView,
  MaterialViewer,
} from '@/components/education/archive';
import { ZainoSidebar } from './zaino-sidebar';

interface ZainoViewProps {
  initialType?: string;
  initialSubject?: string;
  initialMaestro?: string;
  initialSource?: string;
}

type NavLevel = 'home' | 'folders' | 'content';
type OrgType = 'materia' | 'data' | 'tipo';

export function ZainoView({
  initialType,
  initialSubject,
  initialMaestro,
}: ZainoViewProps) {
  const _router = useRouter();
  const searchParams = useSearchParams();
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [materials, setMaterials] = useState<ArchiveItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ArchiveItem | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [navLevel, setNavLevel] = useState<NavLevel>('home');
  const [orgType, setOrgType] = useState<OrgType | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get current filters from URL
  const typeFilter = searchParams.get('type') || initialType;
  const subjectFilter = searchParams.get('subject') || initialSubject;
  const maestroFilter = searchParams.get('maestro') || initialMaestro;
  const isBookmarked = searchParams.get('bookmarked') === 'true';

  // Load all maestri for sidebar
  const allMaestri = useMemo(() =>
    getAllMaestri().map(m => ({ id: m.id, name: m.name })),
  []);

  // Debounce search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedQuery(searchQuery), 200);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery]);

  // Load materials
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const records = await getActiveMaterials();
        setMaterials(records as ArchiveItem[]);
      } catch (error) {
        logger.error('Failed to load materials', { error });
      }
      setIsLoading(false);
    }
    load();
  }, []);

  // Compute counts for sidebar
  const counts = useMemo(() => {
    const result = {
      total: materials.length,
      bookmarked: 0,
      byType: {} as Record<string, number>,
      bySubject: {} as Record<string, number>,
      byMaestro: {} as Record<string, number>,
    };
    for (const item of materials) {
      if (item.isBookmarked) result.bookmarked++;
      result.byType[item.toolType] = (result.byType[item.toolType] || 0) + 1;
      if (item.subject) result.bySubject[item.subject] = (result.bySubject[item.subject] || 0) + 1;
      if (item.maestroId) result.byMaestro[item.maestroId] = (result.byMaestro[item.maestroId] || 0) + 1;
    }
    return result;
  }, [materials]);

  // Extract unique subjects
  const subjects = useMemo(() =>
    Array.from(new Set(materials.map(m => m.subject).filter(Boolean) as string[])).sort(),
  [materials]);

  // Filter and sort
  const filtered = useMemo(() => {
    let result = [...materials];

    if (isBookmarked) {
      result = result.filter(item => item.isBookmarked);
    }
    if (typeFilter) {
      result = result.filter(item => item.toolType === typeFilter);
    }
    if (subjectFilter) {
      result = result.filter(item => item.subject === subjectFilter);
    }
    if (maestroFilter) {
      result = result.filter(item => item.maestroId === maestroFilter);
    }
    if (orgType === 'materia' && selectedFolder) {
      result = result.filter(item => item.subject === selectedFolder);
    }
    if (orgType === 'tipo' && selectedFolder) {
      result = result.filter(item => item.toolType === selectedFolder);
    }
    if (orgType === 'data' && selectedFolder) {
      // Filter by month
      result = result.filter(item => {
        const month = new Date(item.createdAt).toLocaleDateString('it-IT', { year: 'numeric', month: 'long' });
        return month === selectedFolder;
      });
    }

    // Fuzzy search
    if (debouncedQuery.trim()) {
      const fuse = new Fuse(result, {
        keys: [
          { name: 'title', weight: 2 },
          { name: 'subject', weight: 1 },
          { name: 'maestroId', weight: 0.5 },
        ],
        threshold: 0.3,
        ignoreLocation: true,
        minMatchCharLength: 2,
      });
      result = fuse.search(debouncedQuery).map(r => r.item);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'type': return a.toolType.localeCompare(b.toolType);
        case 'rating': return (b.userRating || 0) - (a.userRating || 0);
        case 'views': return (b.viewCount || 0) - (a.viewCount || 0);
        default: return 0;
      }
    });

    return result;
  }, [materials, typeFilter, subjectFilter, maestroFilter, isBookmarked, debouncedQuery, sortBy, orgType, selectedFolder]);

  // Handlers
  const handleDelete = async (toolId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo materiale?')) return;
    try {
      await deleteMaterial(toolId);
      setMaterials(prev => prev.filter(m => m.toolId !== toolId));
    } catch (error) {
      logger.error('Failed to delete', { error });
    }
  };

  const handleView = useCallback((item: ArchiveItem) => setSelectedItem(item), []);
  const handleCloseViewer = useCallback(() => setSelectedItem(null), []);
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value);

  const handleBookmark = useCallback(async (toolId: string, isBookmarked: boolean) => {
    const success = await updateMaterialInteraction(toolId, { isBookmarked });
    if (success) setMaterials(prev => prev.map(m => m.toolId === toolId ? { ...m, isBookmarked } : m));
  }, []);

  const handleRate = useCallback(async (toolId: string, userRating: number) => {
    const success = await updateMaterialInteraction(toolId, { userRating });
    if (success) setMaterials(prev => prev.map(m => m.toolId === toolId ? { ...m, userRating } : m));
  }, []);

  const handleOrgTypeSelect = (type: OrgType) => {
    setOrgType(type);
    setNavLevel('folders');
    setSelectedFolder(null);
  };

  const handleFolderSelect = (folder: string) => {
    setSelectedFolder(folder);
    setNavLevel('content');
  };

  const handleBackToHome = () => {
    setNavLevel('home');
    setOrgType(null);
    setSelectedFolder(null);
  };

  const handleBackToFolders = () => {
    setNavLevel('folders');
    setSelectedFolder(null);
  };

  // Build breadcrumb
  const breadcrumb = useMemo(() => {
    const parts: Array<{ label: string; onClick?: () => void }> = [
      { label: 'Zaino', onClick: handleBackToHome }
    ];
    if (orgType) {
      const labels = { materia: 'Per Materia', data: 'Per Data', tipo: 'Per Tipo' };
      parts.push({ label: labels[orgType], onClick: handleBackToFolders });
    }
    if (selectedFolder) {
      const label = orgType === 'tipo'
        ? TOOL_LABELS[selectedFolder as keyof typeof TOOL_LABELS] || selectedFolder
        : orgType === 'materia'
        ? SUBJECT_LABELS[selectedFolder] || selectedFolder
        : selectedFolder;
      parts.push({ label });
    }
    return parts;
  }, [orgType, selectedFolder]);

  // Generate folders based on org type
  const folders = useMemo(() => {
    if (!orgType) return [];

    if (orgType === 'materia') {
      return subjects.map(s => ({ id: s, label: SUBJECT_LABELS[s] || s, count: counts.bySubject[s] || 0 }));
    }

    if (orgType === 'tipo') {
      return Object.entries(TOOL_LABELS).map(([id, label]) => ({
        id,
        label,
        count: counts.byType[id] || 0,
      })).filter(f => f.count > 0);
    }

    if (orgType === 'data') {
      const months = materials.reduce((acc, item) => {
        const month = new Date(item.createdAt).toLocaleDateString('it-IT', { year: 'numeric', month: 'long' });
        acc.add(month);
        return acc;
      }, new Set<string>());
      return Array.from(months).sort().reverse().map(m => ({
        id: m,
        label: m,
        count: materials.filter(item => {
          const month = new Date(item.createdAt).toLocaleDateString('it-IT', { year: 'numeric', month: 'long' });
          return month === m;
        }).length,
      }));
    }

    return [];
  }, [orgType, subjects, materials, counts]);

  return (
    <div className="flex h-full">
      <ZainoSidebar
        counts={counts}
        subjects={subjects}
        maestros={allMaestri}
        onOrgTypeSelect={handleOrgTypeSelect}
      />

      <div className="flex-1 p-6 overflow-y-auto">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex items-center gap-1 text-sm text-slate-500">
            <li><Home className="w-4 h-4" /></li>
            {breadcrumb.map((item, i) => (
              <li key={i} className="flex items-center gap-1">
                <ChevronRight className="w-4 h-4" />
                {item.onClick ? (
                  <button onClick={item.onClick} className="hover:text-primary">{item.label}</button>
                ) : (
                  <span className="text-slate-900 dark:text-white font-medium">{item.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {navLevel === 'home' ? 'Il Tuo Zaino' : navLevel === 'folders' ? 'Scegli una Cartella' : 'I Tuoi Materiali'}
            </h1>
            <p className="text-sm text-slate-500">
              {navLevel === 'content' && `${filtered.length} materiali`}
            </p>
          </div>

          {navLevel === 'content' && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Cerca..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-9 w-full sm:w-48"
                  aria-label="Cerca materiali"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                <SelectTrigger className="w-[140px]" aria-label="Ordina per">
                  <SelectValue placeholder="Ordina per" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex border rounded-lg dark:border-slate-700">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('rounded-r-none', viewMode === 'grid' && 'bg-slate-100 dark:bg-slate-800')}
                  onClick={() => setViewMode('grid')}
                  aria-label="Vista griglia"
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('rounded-l-none', viewMode === 'list' && 'bg-slate-100 dark:bg-slate-800')}
                  onClick={() => setViewMode('list')}
                  aria-label="Vista lista"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : navLevel === 'home' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              onClick={() => handleOrgTypeSelect('materia')}
              className="p-8 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-xl border-2 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 transition-colors text-left"
            >
              <FolderOpen className="w-12 h-12 text-blue-600 dark:text-blue-400 mb-4" />
              <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-2">Per Materia</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">Organizza i materiali per argomento di studio</p>
            </button>
            <button
              onClick={() => handleOrgTypeSelect('data')}
              className="p-8 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-xl border-2 border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600 transition-colors text-left"
            >
              <Calendar className="w-12 h-12 text-green-600 dark:text-green-400 mb-4" />
              <h3 className="text-xl font-bold text-green-900 dark:text-green-100 mb-2">Per Data</h3>
              <p className="text-sm text-green-700 dark:text-green-300">Trova i materiali per quando li hai creati</p>
            </button>
            <button
              onClick={() => handleOrgTypeSelect('tipo')}
              className="p-8 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-xl border-2 border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 transition-colors text-left"
            >
              <Brain className="w-12 h-12 text-purple-600 dark:text-purple-400 mb-4" />
              <h3 className="text-xl font-bold text-purple-900 dark:text-purple-100 mb-2">Per Tipo</h3>
              <p className="text-sm text-purple-700 dark:text-purple-300">Mappe, quiz, flashcard e altro ancora</p>
            </button>
          </div>
        ) : navLevel === 'folders' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => handleFolderSelect(folder.id)}
                className="p-6 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FolderOpen className="w-8 h-8 text-primary" />
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{folder.label}</h3>
                      <p className="text-sm text-slate-500">{folder.count} elementi</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </button>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filter="all" />
        ) : viewMode === 'grid' ? (
          <GridView items={filtered} onDelete={handleDelete} onView={handleView} onBookmark={handleBookmark} onRate={handleRate} />
        ) : (
          <ListView items={filtered} onDelete={handleDelete} onView={handleView} onBookmark={handleBookmark} onRate={handleRate} />
        )}
      </div>

      <AnimatePresence>
        {selectedItem && <MaterialViewer item={selectedItem} onClose={handleCloseViewer} />}
      </AnimatePresence>
    </div>
  );
}
