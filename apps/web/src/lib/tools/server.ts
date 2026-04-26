// Server-only barrel for the tools module. Re-exports the client-safe
// surface from ./index plus modules that depend on Prisma, embeddings,
// next-intl/server, or other server-only APIs. Importing this from a
// Client Component will break the build — use ./index (or per-file deep
// imports) on the client.
export * from './index';

export * from './tool-embedding';
export * from './tool-executor';
export * from './tool-executor-orchestration';
export * from './tool-executor-plugin-factory';
export * from './tool-executor-schemas';
export * from './tool-i18n';
export * from './tool-output-storage';
export * from './tool-persistence';
export * from './tool-rag-indexer';
