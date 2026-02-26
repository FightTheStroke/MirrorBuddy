#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { prisma } from "../src/lib/db";
import { getAllMaestri } from "../src/data/maestri";
import { createExperiment, runExperiment } from "../src/lib/research/experiment-service";

interface ActiveSyntheticProfile {
  id: string;
  name: string;
}

interface BenchmarkRunResult {
  maestroId: string;
  syntheticProfileId: string;
  syntheticProfileName: string;
  experimentId?: string;
  status: string;
  error?: string;
}

interface NightlyBenchmarkDeps {
  databaseUrl?: string;
  getAllMaestri: typeof getAllMaestri;
  findActiveSyntheticProfiles: () => Promise<ActiveSyntheticProfile[]>;
  createExperiment: typeof createExperiment;
  runExperiment: typeof runExperiment;
  disconnect: () => Promise<void>;
  log: (message: string) => void;
  error: (message: string) => void;
}

interface NightlyBenchmarkSummary {
  totalPairs: number;
  completed: number;
  failed: number;
  nonCompleted: number;
}

const defaultDeps: NightlyBenchmarkDeps = {
  databaseUrl: process.env.DATABASE_URL,
  getAllMaestri,
  findActiveSyntheticProfiles: () =>
    prisma.syntheticProfile.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  createExperiment,
  runExperiment,
  disconnect: () => prisma.$disconnect(),
  log: (message) => console.log(message),
  error: (message) => console.error(message),
};

function buildExperimentName(maestroId: string, syntheticProfileName: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const safeProfileName = syntheticProfileName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `nightly-${date}-${maestroId}-${safeProfileName}`.slice(0, 191);
}

export async function runNightlyBenchmark(overrides: Partial<NightlyBenchmarkDeps> = {}): Promise<NightlyBenchmarkSummary> {
  const deps: NightlyBenchmarkDeps = { ...defaultDeps, ...overrides };

  if (!deps.databaseUrl) {
    throw new Error("DATABASE_URL is required to run nightly benchmark.");
  }

  const maestroIds = deps.getAllMaestri().map((maestro) => maestro.id);
  const activeSyntheticProfiles = await deps.findActiveSyntheticProfiles();

  if (maestroIds.length === 0) {
    throw new Error("No maestro IDs available.");
  }

  if (activeSyntheticProfiles.length === 0) {
    throw new Error("No active SyntheticProfile records found.");
  }

  const matrixSize = maestroIds.length * activeSyntheticProfiles.length;
  deps.log(`[nightly-benchmark] maestros=${maestroIds.length}`);
  deps.log(`[nightly-benchmark] activeSyntheticProfiles=${activeSyntheticProfiles.length}`);
  deps.log(`[nightly-benchmark] totalPairs=${matrixSize}`);

  const results: BenchmarkRunResult[] = [];

  for (const maestroId of maestroIds) {
    for (const syntheticProfile of activeSyntheticProfiles) {
      const name = buildExperimentName(maestroId, syntheticProfile.name);
      const hypothesis = `Nightly benchmark for maestro ${maestroId} with SyntheticProfile ${syntheticProfile.name}`;

      try {
        const { id: experimentId } = await deps.createExperiment({
          name,
          hypothesis,
          maestroId,
          syntheticProfileId: syntheticProfile.id,
          turns: 10,
        });

        const runSummary = await deps.runExperiment(experimentId);
        results.push({
          maestroId,
          syntheticProfileId: syntheticProfile.id,
          syntheticProfileName: syntheticProfile.name,
          experimentId,
          status: runSummary.status,
        });

        deps.log(
          `[nightly-benchmark] pair=${maestroId}×${syntheticProfile.name} status=${runSummary.status} experimentId=${experimentId}`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({
          maestroId,
          syntheticProfileId: syntheticProfile.id,
          syntheticProfileName: syntheticProfile.name,
          status: "failed",
          error: message,
        });
        deps.error(
          `[nightly-benchmark] pair=${maestroId}×${syntheticProfile.name} status=failed error=${message}`,
        );
      }
    }
  }

  const completed = results.filter((result) => result.status === "completed").length;
  const failed = results.filter((result) => result.status === "failed").length;
  const nonCompleted = results.length - completed;

  deps.log("=== Nightly benchmark summary ===");
  deps.log(`Total pairs: ${results.length}`);
  deps.log(`Completed: ${completed}`);
  deps.log(`Failed: ${failed}`);
  deps.log(`Non-completed (includes running/draft): ${nonCompleted}`);
  deps.log(`Maestros: ${maestroIds.length}`);
  deps.log(`Active SyntheticProfile records: ${activeSyntheticProfiles.length}`);

  return {
    totalPairs: results.length,
    completed,
    failed,
    nonCompleted,
  };
}

async function runNightlyBenchmarkCli() {
  try {
    const summary = await runNightlyBenchmark();
    if (summary.failed > 0 || summary.nonCompleted > summary.failed) {
      process.exitCode = 1;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[nightly-benchmark] fatal error: ${message}`);
    process.exitCode = 1;
  } finally {
    await defaultDeps.disconnect();
  }
}

const scriptPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === scriptPath) {
  void runNightlyBenchmarkCli();
}
