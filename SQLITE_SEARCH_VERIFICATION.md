# SQLite Search Verification Guide

This document provides instructions for verifying that the materials search API maintains backward compatibility with SQLite databases.

## Overview

The materials search has been optimized to use PostgreSQL full-text search when available, but falls back to SQLite's ILIKE pattern matching for compatibility. This test verifies the SQLite fallback works correctly.

## Prerequisites

1. Node.js and npm installed
2. SQLite database (default configuration)
3. Dev server not running (will be started as part of test)

## Automatic Verification

### Option 1: Run the automated test script

```bash
# Terminal 1: Start dev server with SQLite (default)
npm run dev

# Terminal 2: Run verification script
node test-sqlite-search.mjs
```

The script will:
1. Create a test material with searchable content
2. Perform searches using various query terms
3. Verify results contain expected materials
4. Test case-insensitive matching
5. Clean up test data

Expected output:
```
============================================================
SQLite Search Verification Test
============================================================

4. Checking database type...
✓ Using SQLite (default)
  DATABASE_URL: not set (defaults to SQLite)

1. Creating test material with searchable content...
✓ Material created: clxxx123456789
  Title: Test Photosynthesis Material
  SearchableText: Test Photosynthesis Material Biology...

2. Searching for materials with query: "photosynthesis"...
✓ Search completed
  Found: 1 material(s)
  Total: 1

3. Verifying search results...
✓ Expected material found in results
  ID: clxxx123456789
  Title: Test Photosynthesis Material
  ToolType: mindmap

5. Testing various search terms...
  ✓ "photosynthesis" - Found
  ✓ "biology" - Found
  ✓ "chlorophyll" - Found
  ✓ "plants" - Found
  ✓ "photo" - Found
  ✓ "PHOTOSYNTHESIS" - Found

6. Cleaning up test data...
✓ Cleaned up 1 test material(s)

============================================================
✓ All tests passed!
============================================================

NOTE: Check server logs to confirm SQLite contains filter was used.
      Look for Prisma query logs with "contains" or "LIKE" operators.
```

## Manual Verification

### Step 1: Verify Database Configuration

```bash
# Check DATABASE_URL (should be unset or point to SQLite)
echo $DATABASE_URL

# Expected: empty, "file:./prisma/dev.db", or similar SQLite path
# NOT: "postgresql://" or "postgres://"
```

### Step 2: Start Dev Server

```bash
# Ensure using SQLite (default)
unset DATABASE_URL  # Or: export DATABASE_URL="file:./prisma/dev.db"

# Start dev server
npm run dev

# Server should start on http://localhost:3000
```

### Step 3: Create Test Material

```bash
# Use curl or any HTTP client
curl -X POST http://localhost:3000/api/materials \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "toolId": "test-tool-sqlite-1",
    "toolType": "mindmap",
    "title": "Photosynthesis Study Guide",
    "subject": "Biology",
    "preview": "Learn about how plants convert sunlight into energy",
    "content": {
      "nodes": [
        {"id": "1", "label": "Photosynthesis"},
        {"id": "2", "label": "Chlorophyll"},
        {"id": "3", "label": "Sunlight"},
        {"id": "4", "label": "Carbon Dioxide"},
        {"id": "5", "label": "Oxygen"}
      ],
      "edges": [
        {"from": "1", "to": "2"},
        {"from": "1", "to": "3"},
        {"from": "1", "to": "4"},
        {"from": "1", "to": "5"}
      ]
    }
  }'
```

Expected response:
```json
{
  "success": true,
  "material": {
    "id": "clxxx...",
    "toolId": "test-tool-sqlite-1",
    "title": "Photosynthesis Study Guide",
    "searchableText": "Photosynthesis Study Guide Biology Learn about...",
    ...
  },
  "created": true
}
```

### Step 4: Test Search

```bash
# Test 1: Search for "photosynthesis"
curl "http://localhost:3000/api/materials?userId=test-user-123&search=photosynthesis"

# Test 2: Search for "biology" (subject match)
curl "http://localhost:3000/api/materials?userId=test-user-123&search=biology"

# Test 3: Search for "chlorophyll" (content match)
curl "http://localhost:3000/api/materials?userId=test-user-123&search=chlorophyll"

# Test 4: Case-insensitive search
curl "http://localhost:3000/api/materials?userId=test-user-123&search=PHOTOSYNTHESIS"

# Test 5: Partial match
curl "http://localhost:3000/api/materials?userId=test-user-123&search=photo"
```

Expected response for each test:
```json
{
  "materials": [
    {
      "id": "clxxx...",
      "title": "Photosynthesis Study Guide",
      "toolType": "mindmap",
      ...
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

### Step 5: Verify SQLite Query Pattern

Check the dev server logs for Prisma query output. You should see queries using `contains` with `mode: 'insensitive'`:

```sql
-- Expected pattern in logs:
SELECT ... FROM "Material"
WHERE ...
  AND (
    "searchableText" LIKE '%photosynthesis%' COLLATE NOCASE
    OR "title" LIKE '%photosynthesis%' COLLATE NOCASE
  )
```

**Key indicators of SQLite fallback:**
- ✅ `LIKE` operator (not `@@` or `websearch_to_tsquery`)
- ✅ `COLLATE NOCASE` (case-insensitive)
- ✅ `%query%` pattern (substring match)
- ❌ Should NOT see: `websearch_to_tsquery`, `tsvector`, `ts_rank`

### Step 6: Clean Up

```bash
# Delete test material
curl -X DELETE "http://localhost:3000/api/materials?toolId=test-tool-sqlite-1"
```

## Verification Checklist

- [ ] Database is configured for SQLite (DATABASE_URL is unset or points to SQLite file)
- [ ] Dev server starts successfully
- [ ] POST /api/materials creates material with searchableText field populated
- [ ] GET /api/materials?search=query returns correct results
- [ ] Search is case-insensitive (matches both "photosynthesis" and "PHOTOSYNTHESIS")
- [ ] Search matches content in title, subject, preview, and searchableText
- [ ] Partial matches work (e.g., "photo" matches "photosynthesis")
- [ ] Server logs show SQLite LIKE queries (not PostgreSQL full-text search)

## Expected Database Behavior

### SQLite (This Test)
- **Query Type**: `LIKE '%query%' COLLATE NOCASE`
- **Performance**: O(n) table scan, slower on large datasets
- **Features**: Case-insensitive substring matching
- **Index**: Cannot use B-tree indexes for LIKE patterns

### PostgreSQL (Different Configuration)
- **Query Type**: `searchableTextVector @@ websearch_to_tsquery('english', query)`
- **Performance**: O(log n) with GIN index, 10-100x faster
- **Features**: Full-text search with ranking, stemming, stop words
- **Index**: Uses GIN index on tsvector column

## Troubleshooting

### Issue: "No materials found"
**Solution**: Ensure searchableText field is populated when creating materials. Check that the `generateSearchableText()` function is working correctly.

### Issue: "Server logs show PostgreSQL queries"
**Solution**: Check DATABASE_URL environment variable. Unset it or set to SQLite path:
```bash
unset DATABASE_URL
# Or
export DATABASE_URL="file:./prisma/dev.db"
```

### Issue: "Case-sensitive search"
**Solution**: Verify Prisma query uses `mode: 'insensitive'` for contains filter. Check code in `src/app/api/materials/route.ts` lines 226-230.

### Issue: "Search too slow"
**Expected**: SQLite search is slower than PostgreSQL full-text search. This is normal. Consider migrating to PostgreSQL for production use. See `docs/POSTGRESQL_FULLTEXT_SETUP.md` for migration guide.

## Success Criteria

✅ **Test passes if:**
1. Material is created with searchableText populated
2. All search queries return the test material
3. Case-insensitive matching works
4. Server logs confirm SQLite LIKE queries (not PostgreSQL full-text)
5. No errors in server logs
6. Backward compatibility is maintained

## Related Files

- Implementation: `src/app/api/materials/route.ts`
- Database Detection: `src/lib/db/database-utils.ts`
- Search Text Generation: `src/lib/search/searchable-text.ts`
- PostgreSQL Migration: `prisma/migrations/fulltext/001_enable_fulltext_search.sql`
- Schema Documentation: `prisma/schema.prisma` (Material model, line 499-505)

## Next Steps

After verifying SQLite backward compatibility:
1. Test PostgreSQL full-text search (see `subtask-5-2`)
2. Run performance benchmarks comparing SQLite vs PostgreSQL
3. Document PostgreSQL setup steps for production deployment
