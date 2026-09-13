import type { Prisma } from '@prisma/client';
import type {
  ListedDeletedUser,
  ListedTier,
  ListedUser,
  ListedUserRole,
  UserLimitDetails,
} from './user-list-types';

export const ADMIN_USER_SELECT = {
  id: true,
  username: true,
  email: true,
  role: true,
  disabled: true,
  isTestData: true,
  createdAt: true,
  subscription: { select: { id: true, tier: { select: { id: true, code: true, name: true } } } },
} as const satisfies Prisma.UserSelect;

export const ADMIN_TRASH_SELECT = {
  userId: true,
  username: true,
  email: true,
  deletedAt: true,
} as const satisfies Prisma.DeletedUserBackupSelect;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new TypeError('Invalid user projection');
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string') throw new TypeError('Invalid projected text');
  return value;
}
function nullableText(value: unknown): string | null {
  return value === null ? null : text(value);
}
function flag(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new TypeError('Invalid projected flag');
  return value;
}
function timestamp(value: unknown): string {
  const date = value instanceof Date ? value : new Date(text(value));
  if (!Number.isFinite(date.getTime())) throw new TypeError('Invalid projected timestamp');
  return date.toISOString();
}
function role(value: unknown): ListedUserRole {
  if (value !== 'USER' && value !== 'ADMIN' && value !== 'ADMIN_READONLY') {
    throw new TypeError('Invalid projected role');
  }
  return value;
}
export function projectListedTier(value: unknown): ListedTier {
  const tier = record(value);
  return { id: text(tier.id), code: text(tier.code), name: text(tier.name) };
}
export function projectListUser(value: unknown): ListedUser {
  const user = record(value);
  const subscription = user.subscription === null ? null : record(user.subscription);
  return {
    id: text(user.id),
    username: nullableText(user.username),
    email: nullableText(user.email),
    role: role(user.role),
    disabled: flag(user.disabled),
    isTestData: flag(user.isTestData),
    createdAt: timestamp(user.createdAt),
    subscription: subscription
      ? { id: text(subscription.id), tier: projectListedTier(subscription.tier) }
      : null,
  };
}
export function projectDeletedUser(value: unknown): ListedDeletedUser {
  const user = record(value);
  return {
    userId: text(user.userId),
    username: nullableText(user.username),
    email: nullableText(user.email),
    deletedAt: timestamp(user.deletedAt),
  };
}
export function exportListUser(user: ListedUser) {
  return {
    username: user.username,
    email: user.email,
    role: user.role,
    disabled: user.disabled,
    createdAt: user.createdAt,
  };
}

/** Single-user editor data is loaded on demand, never carried by the listing/export DTO. */
export function projectUserLimitDetails(value: unknown): UserLimitDetails {
  const subscription = record(value);
  const tier = record(subscription.tier);
  const limit = (key: string) => {
    const value = tier[key];
    if (typeof value !== 'number' || !Number.isFinite(value))
      throw new TypeError('Invalid tier limit');
    return value;
  };
  return {
    id: text(subscription.id),
    tier: {
      ...projectListedTier(tier),
      chatLimitDaily: limit('chatLimitDaily'),
      voiceMinutesDaily: limit('voiceMinutesDaily'),
      toolsLimitDaily: limit('toolsLimitDaily'),
      docsLimitTotal: limit('docsLimitTotal'),
      features: tier.features === null ? {} : record(tier.features),
    },
    overrideLimits:
      subscription.overrideLimits === null ? null : record(subscription.overrideLimits),
    overrideFeatures:
      subscription.overrideFeatures === null ? null : record(subscription.overrideFeatures),
  };
}
