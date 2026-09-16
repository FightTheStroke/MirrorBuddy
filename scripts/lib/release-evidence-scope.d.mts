export interface ScopeProfile {
  policy: string;
  command: string[];
  filesCommand?: string[];
  declarationsCommand?: string[];
  declarationsProfile?: {
    api: string;
    root: string;
    watch: boolean;
    allowOnly: boolean;
  };
  environment?: { E2E_TESTS: string };
  outputEnvironment?: string;
}

export interface ExpectedScope {
  version: number;
  kind: string;
  sourceRoot: string;
  profile: ScopeProfile;
  files: { file: string; cases: number; projectId?: string }[];
  coverage?: string[];
  rootDir?: string;
  projects?: string[];
}

export function captureExpectedScope(
  kind: string,
  directory: string,
  sourceRoot: string,
): ExpectedScope;
export function validateExpectedScope(
  kind: string,
  directory: string,
  sourceRoot: string,
): ExpectedScope;
