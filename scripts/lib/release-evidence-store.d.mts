import type { InputIdentity } from './release-evidence-inputs.mjs';

export interface ReleaseReceipt {
  version: 1;
  kind: string;
  exitCode: 0;
  identity: InputIdentity;
  command: string[];
  startedAt: number;
  finishedAt: number;
  reportHashes?: Record<string, string>;
  buildBefore?: string;
  buildAfter?: string;
}

export const root: string;
export const kinds: string[];
export function same(a: unknown, b: unknown): boolean;
export function recipe(kind: string, directory: string): string[];
export function artifact(directory: string, name: string): string;
export function evidenceDirectory(input: string, create?: boolean, sourceRoot?: string): string;
export function reports(kind: string): string[];
export function native(directory: string, name: string): unknown;
export function validateReports(kind: string, directory: string): void;
export function validateSourceScope(kind: string, directory: string, sourceRoot: string): void;
export function readReceipt(
  kind: string,
  directory: string,
  identity?: InputIdentity,
): ReleaseReceipt;
