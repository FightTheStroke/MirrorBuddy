/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UsersTable } from "../users-table";

const mockCsrfFetch = vi.fn();
vi.mock("@/lib/auth/csrf-client", () => ({
  csrfFetch: (...args: unknown[]) => mockCsrfFetch(...args),
}));

const users = [
  {
    id: "user-1",
    username: "alpha",
    email: "alpha@test.com",
    role: "USER" as const,
    disabled: false,
    isTestData: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    subscription: null,
  },
  {
    id: "user-2",
    username: "beta",
    email: "beta@test.com",
    role: "ADMIN" as const,
    disabled: true,
    isTestData: false,
    createdAt: new Date("2026-01-02T00:00:00Z"),
    subscription: null,
  },
];

const mockTrash = [
  {
    userId: "user-3",
    username: "gamma",
    email: "gamma@test.com",
    role: "USER",
    deletedAt: "2026-01-10T00:00:00Z",
    purgeAt: "2026-02-09T00:00:00Z",
    deletedBy: "admin-1",
    reason: null,
  },
];

describe("UsersTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    Object.defineProperty(window, "location", {
      value: { reload: vi.fn() },
      writable: true,
    });
  });

  it("renders users and filters active", () => {
    render(<UsersTable users={users} availableTiers={[]} />);

    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(screen.getByText("beta")).toBeInTheDocument();

    const activeTab = screen.getByText("Attivi");
    fireEvent.click(activeTab);

    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(screen.queryByText("beta")).not.toBeInTheDocument();
  });

  it("loads trash list on tab", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ backups: mockTrash }),
    } as Response);

    render(<UsersTable users={users} availableTiers={[]} />);

    fireEvent.click(screen.getByText("Cestino (0)"));

    await waitFor(() => {
      expect(screen.getByText("gamma")).toBeInTheDocument();
    });
  });

  it("calls delete user endpoint", async () => {
    mockCsrfFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    render(<UsersTable users={users} availableTiers={[]} />);

    const deleteButton = screen.getAllByLabelText("Delete user")[0];
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockCsrfFetch).toHaveBeenCalledWith(
        "/api/admin/users/user-1",
        expect.any(Object),
      );
    });
  });

  it("restores user from trash", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ backups: mockTrash }),
    } as Response);
    mockCsrfFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    render(<UsersTable users={users} availableTiers={[]} />);

    fireEvent.click(screen.getByText("Cestino (0)"));

    await waitFor(() => {
      expect(screen.getByText("gamma")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Ripristina"));

    await waitFor(() => {
      expect(mockCsrfFetch).toHaveBeenCalledWith(
        "/api/admin/users/trash/user-3/restore",
        expect.any(Object),
      );
    });
  });
});
