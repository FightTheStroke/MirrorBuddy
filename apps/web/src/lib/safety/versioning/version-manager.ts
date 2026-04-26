/**
 * Safety Version Manager
 * Part of Ethical Design Hardening (F-13)
 *
 * Manages safety configuration versions with changelog tracking.
 * Enables rollback, auditing, and safe deployments.
 */

import { logger } from '@/lib/logger';
import {
  SafetyVersion,
  SafetyRule,
  VersionChange,
} from './types';

const log = logger.child({ module: 'safety-versioning' });

/**
 * In-memory version storage (would be DB in production)
 */
const versions: Map<string, SafetyVersion> = new Map();
let activeVersion: string | null = null;

/**
 * Initialize with default safety rules
 */
export function initializeDefaultVersion(): SafetyVersion {
  const defaultRules: SafetyRule[] = [
    {
      id: 'content_inappropriate_1',
      name: 'Block inappropriate content',
      category: 'content_moderation',
      pattern: '\\b(violenza|droga|armi|suicid)\\b',
      enabled: true,
      priority: 100,
      action: 'block',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'prompt_injection_1',
      name: 'Block prompt injection attempts',
      category: 'prompt_injection',
      pattern: '(ignore|dimentica|ignora)\\s+(previous|tutte|istruzioni)',
      enabled: true,
      priority: 99,
      action: 'block',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'pii_protection_1',
      name: 'Block PII requests',
      category: 'pii_protection',
      pattern: '(dimmi il tuo|qual è il tuo)\\s+(indirizzo|telefono|password)',
      enabled: true,
      priority: 95,
      action: 'block',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'topic_off_topic_1',
      name: 'Flag off-topic discussions',
      category: 'topic_restriction',
      enabled: true,
      priority: 50,
      action: 'warn',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const version: SafetyVersion = {
    version: '1.0.0',
    releasedAt: new Date(),
    changelog: [
      {
        type: 'added',
        description: 'Initial safety ruleset for MirrorBuddy',
        impact: 'high',
      },
    ],
    rules: defaultRules,
    isActive: true,
    createdBy: 'system',
  };

  versions.set(version.version, version);
  activeVersion = version.version;

  log.info('Initialized default safety version', { version: version.version });

  return version;
}

/**
 * Create a new version from existing
 */
export function createNewVersion(
  baseVersion: string,
  newVersionNumber: string,
  changes: VersionChange[],
  ruleUpdates: {
    add?: SafetyRule[];
    modify?: Partial<SafetyRule>[];
    remove?: string[];
  },
  createdBy: string
): SafetyVersion {
  const base = versions.get(baseVersion);
  if (!base) {
    throw new Error(`Base version ${baseVersion} not found`);
  }

  // Clone rules from base
  let newRules = [...base.rules.map((r) => ({ ...r }))];

  // Apply modifications
  if (ruleUpdates.modify) {
    for (const mod of ruleUpdates.modify) {
      const idx = newRules.findIndex((r) => r.id === mod.id);
      if (idx >= 0) {
        newRules[idx] = { ...newRules[idx], ...mod, updatedAt: new Date() };
      }
    }
  }

  // Apply removals
  if (ruleUpdates.remove) {
    newRules = newRules.filter((r) => !ruleUpdates.remove!.includes(r.id));
  }

  // Apply additions
  if (ruleUpdates.add) {
    newRules.push(...ruleUpdates.add);
  }

  const newVersion: SafetyVersion = {
    version: newVersionNumber,
    releasedAt: new Date(),
    changelog: changes,
    rules: newRules,
    isActive: false,
    createdBy,
  };

  versions.set(newVersionNumber, newVersion);

  log.info('Created new safety version', {
    version: newVersionNumber,
    baseVersion,
    changes: changes.length,
    createdBy,
  });

  return newVersion;
}

/**
 * Activate a version (make it the current active)
 */
export function activateVersion(versionNumber: string): SafetyVersion {
  const version = versions.get(versionNumber);
  if (!version) {
    throw new Error(`Version ${versionNumber} not found`);
  }

  // Deactivate current active
  if (activeVersion) {
    const current = versions.get(activeVersion);
    if (current) {
      current.isActive = false;
    }
  }

  // Activate new version
  version.isActive = true;
  activeVersion = versionNumber;

  log.warn('Activated safety version', {
    version: versionNumber,
    previousVersion: activeVersion,
    ruleCount: version.rules.length,
  });

  return version;
}

/**
 * Rollback to previous version
 */
export function rollbackVersion(): SafetyVersion | null {
  const versionList = Array.from(versions.keys()).sort().reverse();

  if (versionList.length < 2) {
    log.warn('Cannot rollback - no previous version');
    return null;
  }

  const currentIdx = versionList.indexOf(activeVersion!);
  if (currentIdx < 0 || currentIdx >= versionList.length - 1) {
    log.warn('Cannot rollback - at oldest version');
    return null;
  }

  const previousVersion = versionList[currentIdx + 1];
  return activateVersion(previousVersion);
}

/**
 * Get current active version
 */
export function getActiveVersion(): SafetyVersion | null {
  if (!activeVersion) {
    return null;
  }
  return versions.get(activeVersion) || null;
}

/**
 * Get version by number
 */
export function getVersion(versionNumber: string): SafetyVersion | null {
  return versions.get(versionNumber) || null;
}

/**
 * Get all versions for history
 */
export function getAllVersions(): SafetyVersion[] {
  return Array.from(versions.values()).sort(
    (a, b) => b.releasedAt.getTime() - a.releasedAt.getTime()
  );
}

/**
 * Get active rules (convenience method)
 */
export function getActiveRules(): SafetyRule[] {
  const version = getActiveVersion();
  if (!version) {
    return [];
  }
  return version.rules.filter((r) => r.enabled);
}

/**
 * Format changelog for display
 */
export function formatChangelog(version: SafetyVersion): string {
  let output = `## Safety Rules v${version.version}\n`;
  output += `Released: ${version.releasedAt.toISOString()}\n\n`;

  const grouped = {
    security: version.changelog.filter((c) => c.type === 'security'),
    added: version.changelog.filter((c) => c.type === 'added'),
    fixed: version.changelog.filter((c) => c.type === 'fixed'),
    modified: version.changelog.filter((c) => c.type === 'modified'),
    removed: version.changelog.filter((c) => c.type === 'removed'),
  };

  for (const [type, changes] of Object.entries(grouped)) {
    if (changes.length > 0) {
      output += `### ${type.charAt(0).toUpperCase() + type.slice(1)}\n`;
      for (const change of changes) {
        const impact = change.impact === 'high' ? ' ⚠️' : '';
        output += `- ${change.description}${impact}\n`;
      }
      output += '\n';
    }
  }

  return output;
}

/**
 * Validate version number format
 */
export function isValidVersionNumber(version: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(version);
}

/**
 * Compare two version numbers
 */
export function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if (partsA[i] > partsB[i]) return 1;
    if (partsA[i] < partsB[i]) return -1;
  }
  return 0;
}
