/**
 * Pure decision engine for the reachability guard.
 *
 * IO (running knip, reading git, reading files) lives in the CLI and runner
 * modules; everything here is deterministic so it can be unit-tested and
 * mutation-proved without touching the filesystem.
 */

export interface ManifestEntry {
  file: string;
  consumer: string;
  reason: string;
}

export interface ReachabilityInput {
  /** Production files the analyser (knip) reports as unreachable, already scoped. */
  unreachable: string[];
  /** The checked-in baseline of tolerated, currently-unreachable files. */
  baseline: string[];
  /** Files declared reachable-via-non-static-consumer in the manifest. */
  declared: string[];
  /** Files added or modified in this change set (empty when unknown). */
  changedFiles: string[];
  /** When true, editing a baseline file that is still unreachable is an error. */
  editModeFail: boolean;
}

export interface ReachabilityResult {
  newlyUnreachable: string[];
  editedStillUnreachable: string[];
  staleBaseline: string[];
  redundantDeclared: string[];
  ok: boolean;
  errorCount: number;
  warningCount: number;
}

function sorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort();
}

export function analyzeReachability(input: ReachabilityInput): ReachabilityResult {
  const declared = new Set(input.declared);
  const baseline = new Set(input.baseline);
  const changed = new Set(input.changedFiles);
  const unreachable = new Set(input.unreachable);

  // A declared file is considered reachable via a documented non-static consumer.
  const effectivelyUnreachable = new Set([...unreachable].filter((f) => !declared.has(f)));

  // (a) unreachable, not tolerated by the baseline, not declared: the regression.
  const newlyUnreachable = sorted([...effectivelyUnreachable].filter((f) => !baseline.has(f)));

  // (b) a baseline file was edited and is still dead: the "landed twice" bug.
  const editedStillUnreachable = sorted(
    [...effectivelyUnreachable].filter((f) => baseline.has(f) && changed.has(f)),
  );

  // Baseline entries the analyser no longer flags: the backlog shrank, remove them.
  const staleBaseline = sorted([...baseline].filter((f) => !unreachable.has(f)));

  // Manifest entries that are already reachable: harmless, but should be pruned.
  const redundantDeclared = sorted([...declared].filter((f) => !unreachable.has(f)));

  const errorCount =
    newlyUnreachable.length + (input.editModeFail ? editedStillUnreachable.length : 0);
  const warningCount =
    (input.editModeFail ? 0 : editedStillUnreachable.length) + staleBaseline.length;

  return {
    newlyUnreachable,
    editedStillUnreachable,
    staleBaseline,
    redundantDeclared,
    ok: errorCount === 0,
    errorCount,
    warningCount,
  };
}

export function loadManifestFiles(entries: ManifestEntry[]): string[] {
  return entries.map((entry, index) => {
    const file = entry.file?.trim();
    const consumer = entry.consumer?.trim();
    const reason = entry.reason?.trim();
    if (!file) {
      throw new Error(`Manifest entry #${index} is missing "file"`);
    }
    if (!consumer) {
      throw new Error(`Manifest entry "${file}" must name its non-static consumer`);
    }
    if (!reason) {
      throw new Error(`Manifest entry "${file}" must give a reason it is reachable`);
    }
    return file;
  });
}
