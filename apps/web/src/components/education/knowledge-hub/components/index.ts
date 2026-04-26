/**
 * Knowledge Hub Components
 *
 * UI components for the Knowledge Hub feature.
 */

// Search and navigation
export { SearchBar } from './search-bar';
export type { SearchBarProps } from './search-bar';

export { SidebarNavigation } from './sidebar-navigation';
export type {
  SidebarNavigationProps,
  Collection,
  TagItem,
} from './sidebar-navigation';

// Actions
export { QuickActions } from './quick-actions';
export type { QuickActionsProps } from './quick-actions';

export { BulkToolbar } from './bulk-toolbar';
export type { BulkToolbarProps } from './bulk-toolbar';

// Display
export { StatsPanel } from './stats-panel';
export type { StatsPanelProps, MaterialStats } from './stats-panel';

export { MaterialCard } from './material-card';
export type { MaterialCardProps, Material } from './material-card';

// Knowledge Graph (Wave 3)
export { RelatedMaterials } from './related-materials';
