/**
 * @vitest-environment node
 *
 * All count transports must use the shared truth service, never ephemeral activity for DAU.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const FILES_WITH_ACTIVE_USERS_QUERY = [
  {
    name: 'counts/route.ts',
    path: path.resolve(__dirname, '../route.ts'),
  },
  {
    name: 'counts/stream/route.ts',
    path: path.resolve(__dirname, '../stream/route.ts'),
  },
  {
    name: 'publish-admin-counts.ts',
    path: path.resolve(__dirname, '../../../../../lib/helpers/publish-admin-counts.ts'),
  },
  {
    name: 'calculate-and-publish-admin-counts.ts',
    path: path.resolve(__dirname, '../../../../../lib/admin/calculate-and-publish-admin-counts.ts'),
  },
];

describe('Admin counts - isTestData filter (regression)', () => {
  for (const file of FILES_WITH_ACTIVE_USERS_QUERY) {
    it(`${file.name} shares the count service and never queries ephemeral activity for DAU`, () => {
      const source = fs.readFileSync(file.path, 'utf-8');

      expect(source).not.toContain('userActivity.groupBy');
      expect(source).toContain('getAdminCounts()');
    });

    it(`${file.name} does not claim UserActivity lacks isTestData field`, () => {
      const source = fs.readFileSync(file.path, 'utf-8');

      // The old misleading comment should be gone
      expect(source).not.toContain("doesn't have isTestData");
      expect(source).not.toContain('does not have isTestData');
    });
  }
});
