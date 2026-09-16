import type { InputIdentity } from './lib/release-evidence-inputs.mjs';

export function run(kind: string, directory: string, reuse?: boolean): void;
export function collect(directory: string, identity?: InputIdentity): string;
