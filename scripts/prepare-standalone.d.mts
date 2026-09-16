export interface StandalonePaths {
  root: string;
  build: string;
  standalone: string;
  app: string;
  assets: { source: string; destination: string }[];
}

export function standalonePaths(input: unknown): StandalonePaths;
export function prepareStandalone(root: unknown): string;
