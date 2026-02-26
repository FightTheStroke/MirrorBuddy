/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockFindMany,
  mockDisconnect,
  mockGetAllMaestri,
  mockCreateExperiment,
  mockRunExperiment,
} = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockDisconnect: vi.fn(),
  mockGetAllMaestri: vi.fn(),
  mockCreateExperiment: vi.fn(),
  mockRunExperiment: vi.fn(),
}));

vi.mock("../../src/lib/db", () => ({
  prisma: {
    syntheticProfile: {
      findMany: mockFindMany,
    },
    $disconnect: mockDisconnect,
  },
}));

vi.mock("../../src/data/maestri", () => ({
  getAllMaestri: mockGetAllMaestri,
}));

vi.mock("../../src/lib/research/experiment-service", () => ({
  createExperiment: mockCreateExperiment,
  runExperiment: mockRunExperiment,
}));

import { runNightlyBenchmark } from "../nightly-benchmark";

describe("nightly-benchmark script logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDisconnect.mockResolvedValue(undefined);
    process.env.DATABASE_URL = "postgres://test-db";
  });

  it("generates full maestro × profile matrix", async () => {
    mockGetAllMaestri.mockReturnValue([{ id: "mario" }, { id: "sofia" }]);
    mockFindMany.mockResolvedValue([
      { id: "sp-a", name: "Beginner Reader" },
      { id: "sp-b", name: "Focused Learner" },
    ]);
    mockCreateExperiment
      .mockResolvedValueOnce({ id: "exp-1" })
      .mockResolvedValueOnce({ id: "exp-2" })
      .mockResolvedValueOnce({ id: "exp-3" })
      .mockResolvedValueOnce({ id: "exp-4" });
    mockRunExperiment.mockResolvedValue({ status: "completed" });
    const log = vi.fn();

    const summary = await runNightlyBenchmark({ log, error: vi.fn() });

    expect(mockCreateExperiment).toHaveBeenCalledTimes(4);
    expect(mockRunExperiment).toHaveBeenCalledTimes(4);
    expect(summary.totalPairs).toBe(4);
    expect(summary.completed).toBe(4);
  });

  it("continues when one experiment fails and records failure", async () => {
    mockGetAllMaestri.mockReturnValue([{ id: "mario" }]);
    mockFindMany.mockResolvedValue([
      { id: "sp-a", name: "Beginner Reader" },
      { id: "sp-b", name: "Focused Learner" },
    ]);
    mockCreateExperiment
      .mockResolvedValueOnce({ id: "exp-1" })
      .mockRejectedValueOnce(new Error("engine timeout"));
    mockRunExperiment.mockResolvedValueOnce({ status: "completed" });
    const error = vi.fn();

    const summary = await runNightlyBenchmark({ log: vi.fn(), error });

    expect(mockCreateExperiment).toHaveBeenCalledTimes(2);
    expect(mockRunExperiment).toHaveBeenCalledTimes(1);
    expect(summary.totalPairs).toBe(2);
    expect(summary.completed).toBe(1);
    expect(summary.failed).toBe(1);
    expect(error).toHaveBeenCalledWith(
      "[nightly-benchmark] pair=mario×Focused Learner status=failed error=engine timeout",
    );
  });

  it("prints summary using expected output format", async () => {
    mockGetAllMaestri.mockReturnValue([{ id: "mario" }]);
    mockFindMany.mockResolvedValue([
      { id: "sp-a", name: "Beginner Reader" },
      { id: "sp-b", name: "Focused Learner" },
    ]);
    mockCreateExperiment
      .mockResolvedValueOnce({ id: "exp-1" })
      .mockResolvedValueOnce({ id: "exp-2" });
    mockRunExperiment
      .mockResolvedValueOnce({ status: "completed" })
      .mockResolvedValueOnce({ status: "running" });
    const log = vi.fn();

    const summary = await runNightlyBenchmark({ log, error: vi.fn() });

    expect(summary.nonCompleted).toBe(1);
    expect(log).toHaveBeenCalledWith("=== Nightly benchmark summary ===");
    expect(log).toHaveBeenCalledWith("Total pairs: 2");
    expect(log).toHaveBeenCalledWith("Completed: 1");
    expect(log).toHaveBeenCalledWith("Failed: 0");
    expect(log).toHaveBeenCalledWith("Non-completed (includes running/draft): 1");
    expect(log).toHaveBeenCalledWith("Maestros: 1");
    expect(log).toHaveBeenCalledWith("Active SyntheticProfile records: 2");
  });
});
