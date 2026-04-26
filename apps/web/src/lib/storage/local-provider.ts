/**
 * MirrorBuddy Local Storage Provider
 * Filesystem-based storage for development environment
 *
 * Stores files in local filesystem with metadata in JSON sidecar files.
 * NOT recommended for production - use Azure or S3 instead.
 *
 * Related: ADR-0001, #22 Storage Architecture
 */

export * from './local-provider/index';
