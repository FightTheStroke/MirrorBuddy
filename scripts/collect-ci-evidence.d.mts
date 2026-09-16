export interface CiEvidenceOptions {
  env?: Record<string, string | undefined>;
  version?: string;
  execute?: (command: string, args: string[]) => string;
}

export function collectCiEvidence(options?: CiEvidenceOptions): {
  path: string;
  markdown: string;
};
export function validateEvidencePaths(
  reportPath: unknown,
  outputPath?: unknown,
  runnerTemp?: unknown,
): void;
