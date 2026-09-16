import type { BinaryLike } from 'node:crypto';

export interface InputIdentity {
  root: string;
  revision: string;
  source: string;
  environment: string;
  node: string;
  platform: string;
  architecture: string;
  pnpm: string;
}

export function digest(value: BinaryLike): string;
export function inputIdentity(
  directory: string,
  environment?: Record<string, string | undefined>,
): InputIdentity;
export function buildIdentity(root: string): string;
