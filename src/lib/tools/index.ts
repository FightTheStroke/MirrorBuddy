// Barrel for the tools module. Aggregates the public-API surface so
// workspace consumers (e.g. @mirrorbuddy/tools) can re-export with one
// statement. Per-file deep imports (`@/lib/tools/X`) keep working
// unchanged.
//
// Only the top-level public surface is included here. Many granular
// sub-files (tool-persistence-crud, tool-executor-mapping, …) are
// re-exported through their umbrella module (tool-persistence,
// tool-executor) to avoid duplicate-symbol ambiguity errors. Consumers
// that need a granular file should import the deep path directly.
//
// `constants.ts` is intentionally NOT re-exported — it shares the
// `ToolConfig` type name with `tool-configs.ts`.
export * from './accessible-print';
export * from './demo-html-builder';
export * from './mindmap-utils';
export * from './summary-converters';
export * from './summary-export';
export * from './summary-export-utils';
export * from './svg-overview-generator';
export * from './tool-configs';
// `tool-context-builder` exports `getToolOutputs` which collides with
// `tool-persistence`; consumers should deep-import that file directly.
export * from './tool-embedding';
export * from './tool-executor';
export * from './tool-executor-orchestration';
export * from './tool-executor-plugin-factory';
export * from './tool-executor-schemas';
export * from './tool-i18n';
export * from './tool-output-storage';
export * from './tool-persistence';
export * from './tool-rag-indexer';
export * from './use-blob-url';
