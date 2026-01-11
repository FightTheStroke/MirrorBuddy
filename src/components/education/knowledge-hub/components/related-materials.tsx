'use client';

/**
 * Related Materials Component - Knowledge Graph UI
 * Wave 3: Shows materials connected via edges
 */

import { useState, useEffect } from 'react';
import { Link2, ArrowRight, GitFork, Layers, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RelatedMaterial {
  id: string;
  toolId: string;
  title: string;
  toolType: string;
}

interface MaterialEdge {
  id: string;
  relationType: string;
  weight: number;
  from: RelatedMaterial;
  to: RelatedMaterial;
}

interface RelatedMaterialsProps {
  materialToolId: string;
  onNavigate?: (toolId: string) => void;
  className?: string;
}

const RELATION_LABELS: Record<string, string> = {
  derived_from: 'Derivato da',
  related_to: 'Correlato a',
  prerequisite: 'Prerequisito',
  extends: 'Estende',
};

const RELATION_ICONS: Record<string, typeof GitFork> = {
  derived_from: GitFork,
  related_to: Link2,
  prerequisite: ArrowRight,
  extends: Layers,
};

export function RelatedMaterials({
  materialToolId,
  onNavigate,
  className,
}: RelatedMaterialsProps) {
  const [edges, setEdges] = useState<MaterialEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function fetchEdges() {
      try {
        setLoading(true);
        const res = await fetch(`/api/materials/${materialToolId}/edges`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setEdges(data.edges || []);
      } catch {
        setError('Impossibile caricare i materiali correlati');
      } finally {
        setLoading(false);
      }
    }

    fetchEdges();
  }, [materialToolId]);

  if (loading) {
    return (
      <div className={cn('animate-pulse bg-muted h-8 rounded', className)} />
    );
  }

  if (error || edges.length === 0) {
    return null; // Hide if no related materials
  }

  // Group edges by relation type
  const grouped = edges.reduce(
    (acc, edge) => {
      const type = edge.relationType;
      if (!acc[type]) acc[type] = [];
      // Determine which material is the "other" one
      const other =
        edge.from.toolId === materialToolId ? edge.to : edge.from;
      acc[type].push(other);
      return acc;
    },
    {} as Record<string, RelatedMaterial[]>
  );

  const totalCount = edges.length;
  const previewCount = 2;

  return (
    <div className={cn('space-y-2', className)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Link2 className="h-4 w-4" />
        <span>
          {totalCount} materiali correlati
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {expanded && (
        <div className="pl-6 space-y-3 border-l-2 border-muted">
          {Object.entries(grouped).map(([relationType, materials]) => {
            const Icon = RELATION_ICONS[relationType] || Link2;
            const label = RELATION_LABELS[relationType] || relationType;
            const displayMaterials = materials.slice(0, previewCount);
            const remaining = materials.length - previewCount;

            return (
              <div key={relationType} className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Icon className="h-3 w-3" />
                  <span>{label}</span>
                </div>
                <div className="space-y-1">
                  {displayMaterials.map((material) => (
                    <button
                      key={material.id}
                      onClick={() => onNavigate?.(material.toolId)}
                      className="block w-full text-left px-2 py-1 text-sm rounded hover:bg-muted transition-colors truncate"
                    >
                      {material.title}
                    </button>
                  ))}
                  {remaining > 0 && (
                    <span className="text-xs text-muted-foreground px-2">
                      +{remaining} altri
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
