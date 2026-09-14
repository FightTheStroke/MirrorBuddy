export type UserListTab = 'all' | 'active' | 'disabled' | 'trash';
export type ListedUserRole = 'USER' | 'ADMIN' | 'ADMIN_READONLY';

export interface UserListQuery {
  page: number;
  pageSize: number;
  tab: UserListTab;
  search: string;
  staging: boolean;
}

export interface ListedTier {
  id: string;
  code: string;
  name: string;
}
export interface ListedUser {
  id: string;
  username: string | null;
  email: string | null;
  role: ListedUserRole;
  disabled: boolean;
  isTestData: boolean;
  createdAt: string;
  subscription: { id: string; tier: ListedTier } | null;
}
export interface ListedDeletedUser {
  userId: string;
  username: string | null;
  email: string | null;
  deletedAt: string;
}
export interface UserLimitDetails {
  id: string;
  tier: ListedTier & {
    chatLimitDaily: number;
    voiceMinutesDaily: number;
    toolsLimitDaily: number;
    docsLimitTotal: number;
    features: unknown;
  };
  overrideLimits: unknown;
  overrideFeatures: unknown;
}
export interface UserListPage {
  query: UserListQuery;
  users: ListedUser[];
  backups: ListedDeletedUser[];
  total: number;
  totalPages: number;
  totalUsers: number;
  trashTotal: number;
  stagingCount: number;
}
export type UserSearchParams = Record<string, string | string[] | undefined>;
