#!/usr/bin/env node

/**
 * Nightly Simulation Runner - Tests maestri system prompts against Ollama model tiers
 * Usage: npx tsx scripts/nightly-sim-runner.ts [options]
 * Options:
 *   --models 3b,8b,12b    Test specific tiers (default: all)
 *   --maestri id1,id2      Test specific maestri (default: all)
 *   --verbose              Verbose output
 *   --dry-run              Don't write files
 */

import fs from "fs/promises";
import path from "path";
import { getAllMaestri } from "../src/data/maestri";
import type {
  ModelTier,
  NightlyReport,
  SimulationResult,
} from "./nightly-sim-types";
import {
  MODEL_CONFIGS,
  parseCliArgs,
  testMaestroOnModel,
} from "./nightly-sim-utils";

/**
 * Main entry point
 */
async function main() {
  const options = parseCliArgs(process.argv.slice(2));

  let maestriToTest = getAllMaestri();
  if (options.selectedMaestri.length > 0) {
    maestriToTest = maestriToTest.filter((m) =>
      options.selectedMaestri.includes(m.id),
    );
  }

  console.log(`Starting nightly simulation runner...`);
  console.log(`Maestri to test: ${maestriToTest.length}`);
  console.log(`Model tiers: ${options.selectedTiers.join(", ")}`);
  console.log(`Verbose: ${options.verboseMode}`);
  console.log(`Dry-run: ${options.dryRun}`);
  console.log();

  const allResults: SimulationResult[] = [];
  const startTime = Date.now();
  let completedSimulations = 0;
  let passedSimulations = 0;

  // Run simulations
  for (const maestro of maestriToTest) {
    if (options.verboseMode) {
      console.log(`Testing ${maestro.displayName}...`);
    }

    for (const tierStr of options.selectedTiers) {
      const modelConfig = MODEL_CONFIGS[tierStr as keyof typeof MODEL_CONFIGS];

      try {
        const result = await testMaestroOnModel(
          maestro.id,
          maestro.displayName,
          maestro.systemPrompt,
          modelConfig,
          options.verboseMode,
        );

        allResults.push(result);
        completedSimulations++;

        if (result.summary.passed) {
          passedSimulations++;
        }

        if (!options.verboseMode) {
          const status = result.summary.passed ? "✓" : "✗";
          console.log(
            `${status} ${maestro.displayName} on ${tierStr}: ${result.summary.passedTests}/${result.summary.totalTests} passed`,
          );
        }
      } catch (error) {
        completedSimulations++;
        console.error(
          `Failed: ${maestro.displayName} on ${tierStr}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  const totalDuration = Date.now() - startTime;

  // Generate report
  const report: NightlyReport = {
    timestamp: new Date().toISOString(),
    date: new Date().toISOString().split("T")[0],
    configuration: {
      modelTiers: options.selectedTiers as ModelTier[],
      maestriIds: maestriToTest.map((m) => m.id),
      verboseMode: options.verboseMode,
      dryRun: options.dryRun,
    },
    results: allResults,
    summary: {
      totalSimulations: completedSimulations,
      passedSimulations,
      failedSimulations: completedSimulations - passedSimulations,
      totalDuration_ms: totalDuration,
    },
  };

  // Write report (unless dry-run)
  if (!options.dryRun) {
    const reportDir = path.join(process.cwd(), "reports");
    const reportPath = path.join(reportDir, `nightly-sim-${report.date}.json`);

    try {
      await fs.mkdir(reportDir, { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`\nReport: ${reportPath}`);
    } catch (error) {
      console.error("Failed to write report:", error);
    }
  }

  // Print summary
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Nightly Simulation Summary`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Total: ${report.summary.totalSimulations}`);
  console.log(
    `Passed: ${report.summary.passedSimulations} / Failed: ${report.summary.failedSimulations}`,
  );
  console.log(`Duration: ${report.summary.totalDuration_ms}ms`);
  console.log(`${"=".repeat(60)}`);

  process.exit(report.summary.failedSimulations > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
