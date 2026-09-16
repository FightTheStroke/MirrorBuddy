export const productionBuildCommand: string;
export const productionConfigFile: string;
export const proofRoute: string;
export const proofFile: string;
export const nextBuildIdFile: string;
export const proofSources: string[];

export interface BuildSourceIdentity {
  configHash: string;
  validatorHash: string;
}

export interface ExpectedBuildProof extends BuildSourceIdentity {
  sourceCommit: string;
  deploymentId: string;
  projectId: string;
}

export function assertBuildConfiguration(input: unknown): void;
export function buildSourceIdentity(root: string): BuildSourceIdentity;
export function verifyBuildProof(input: unknown, expected: ExpectedBuildProof): void;
export function verifyBuildProofResponse(response: string, expected: ExpectedBuildProof): void;
