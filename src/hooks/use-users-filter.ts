"use client";

import { useMemo } from "react";

interface User {
  id: string;
  username: string | null;
  email: string | null;
  role: "USER" | "ADMIN";
  disabled: boolean;
  isTestData: boolean;
  createdAt: Date;
  subscription: {
    id: string;
    tier: {
      id: string;
      code: string;
      name: string;
      chatLimitDaily: number;
      voiceMinutesDaily: number;
      toolsLimitDaily: number;
      docsLimitTotal: number;
      features: unknown;
    };
    overrideLimits: unknown;
    overrideFeatures: unknown;
  } | null;
}

type FilterTab = "all" | "active" | "disabled" | "trash";

export function useUsersFilter(
  users: User[],
  filter: FilterTab,
  search: string,
  showStagingData: boolean,
) {
  const filteredUsers = useMemo(() => {
    let result = users;
    if (!showStagingData) {
      result = result.filter((u) => !u.isTestData);
    }
    if (filter === "active") result = result.filter((u) => !u.disabled);
    else if (filter === "disabled") result = result.filter((u) => u.disabled);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.email?.toLowerCase().includes(q) ||
          u.username?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [users, filter, search, showStagingData]);

  const stagingDataCount = useMemo(() => {
    return users.filter((u) => u.isTestData).length;
  }, [users]);

  return { filteredUsers, stagingDataCount };
}
