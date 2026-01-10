/**
 * Knowledge Hub Hooks
 *
 * Custom React hooks for the Knowledge Hub feature.
 * Provides search, collections, tags, smart collections, and bulk actions.
 */

export {
  useMaterialsSearch,
  sortMaterialsByRecency,
  filterMaterials,
  type UseMaterialsSearchOptions,
  type MaterialSearchResult,
  type UseMaterialsSearchReturn,
} from './use-materials-search';

export {
  useCollections,
  type CollectionData,
  type UseCollectionsOptions,
  type UseCollectionsReturn,
} from './use-collections';

export { useTags } from './use-tags';
export {
  getRandomTagColor,
  TAG_COLORS,
  type TagData,
  type UseTagsOptions,
  type UseTagsReturn,
} from './tag-types';

export {
  useSmartCollections,
  type SmartCollectionDefinition,
  type MaterialWithExtras,
  type UseSmartCollectionsOptions,
  type SmartCollection,
  type UseSmartCollectionsReturn,
} from './use-smart-collections';

export {
  useBulkActions,
  type UseBulkActionsOptions,
  type UseBulkActionsReturn,
} from './use-bulk-actions';
