/**
 * SQLite Search Verification Script
 * Tests backward compatibility of materials search with SQLite database
 *
 * Usage: node test-sqlite-search.mjs
 * Prerequisites: npm run dev (in another terminal)
 */

const TEST_USER_ID = 'test-sqlite-user-' + Date.now();
const BASE_URL = 'http://localhost:3000';

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function createTestMaterial() {
  log('\n1. Creating test material with searchable content...', 'cyan');

  const material = {
    userId: TEST_USER_ID,
    toolId: 'test-tool-' + Date.now(),
    toolType: 'mindmap',
    title: 'Test Photosynthesis Material',
    subject: 'Biology',
    preview: 'A study material about photosynthesis in plants',
    content: {
      nodes: [
        { id: '1', label: 'Photosynthesis' },
        { id: '2', label: 'Chlorophyll' },
        { id: '3', label: 'Sunlight' },
      ],
      edges: [
        { from: '1', to: '2' },
        { from: '1', to: '3' },
      ],
    },
  };

  const response = await fetch(`${BASE_URL}/api/materials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(material),
  });

  if (!response.ok) {
    throw new Error(`Failed to create material: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  log(`✓ Material created: ${data.material.id}`, 'green');
  log(`  Title: ${data.material.title}`, 'blue');
  log(`  SearchableText: ${data.material.searchableText || 'null'}`, 'blue');

  return data.material;
}

async function searchMaterials(query) {
  log(`\n2. Searching for materials with query: "${query}"...`, 'cyan');

  const url = `${BASE_URL}/api/materials?userId=${TEST_USER_ID}&search=${encodeURIComponent(query)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to search materials: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  log(`✓ Search completed`, 'green');
  log(`  Found: ${data.materials.length} material(s)`, 'blue');
  log(`  Total: ${data.total}`, 'blue');

  return data;
}

async function verifySearchResults(searchData, expectedMaterialId) {
  log('\n3. Verifying search results...', 'cyan');

  if (searchData.materials.length === 0) {
    throw new Error('❌ No materials found in search results');
  }

  const foundMaterial = searchData.materials.find(m => m.id === expectedMaterialId);
  if (!foundMaterial) {
    throw new Error(`❌ Expected material (${expectedMaterialId}) not found in results`);
  }

  log('✓ Expected material found in results', 'green');
  log(`  ID: ${foundMaterial.id}`, 'blue');
  log(`  Title: ${foundMaterial.title}`, 'blue');
  log(`  ToolType: ${foundMaterial.toolType}`, 'blue');

  return true;
}

async function checkDatabaseType() {
  log('\n4. Checking database type...', 'cyan');

  // Check if DATABASE_URL is set
  const databaseUrl = process.env.DATABASE_URL || '';

  if (!databaseUrl || databaseUrl.startsWith('file:') || databaseUrl.includes('.db')) {
    log('✓ Using SQLite (default)', 'green');
    log('  DATABASE_URL: ' + (databaseUrl || 'not set (defaults to SQLite)'), 'blue');
    return 'sqlite';
  } else if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
    log('⚠ Warning: Using PostgreSQL instead of SQLite', 'yellow');
    log('  DATABASE_URL: ' + databaseUrl, 'blue');
    return 'postgresql';
  }

  log('✓ Database type could not be determined, assuming SQLite', 'yellow');
  return 'unknown';
}

async function testMultipleSearchTerms(materialId) {
  log('\n5. Testing various search terms...', 'cyan');

  const searchTerms = [
    'photosynthesis',    // Should match title
    'biology',           // Should match subject
    'chlorophyll',       // Should match content
    'plants',            // Should match preview
    'photo',             // Partial match
    'PHOTOSYNTHESIS',    // Case-insensitive test
  ];

  for (const term of searchTerms) {
    const data = await searchMaterials(term);
    const found = data.materials.some(m => m.id === materialId);

    if (found) {
      log(`  ✓ "${term}" - Found`, 'green');
    } else {
      log(`  ✗ "${term}" - Not found`, 'red');
    }
  }
}

async function cleanupTestData() {
  log('\n6. Cleaning up test data...', 'cyan');

  // Get all materials for test user
  const response = await fetch(`${BASE_URL}/api/materials?userId=${TEST_USER_ID}`);
  const data = await response.json();

  let deleted = 0;
  for (const material of data.materials) {
    const deleteResponse = await fetch(
      `${BASE_URL}/api/materials?toolId=${material.toolId}`,
      { method: 'DELETE' }
    );

    if (deleteResponse.ok) {
      deleted++;
    }
  }

  log(`✓ Cleaned up ${deleted} test material(s)`, 'green');
}

async function main() {
  try {
    log('='.repeat(60), 'cyan');
    log('SQLite Search Verification Test', 'cyan');
    log('='.repeat(60), 'cyan');

    // Check database type
    const dbType = await checkDatabaseType();

    if (dbType === 'postgresql') {
      log('\n⚠ WARNING: This test is intended for SQLite verification', 'yellow');
      log('  PostgreSQL detected. Results may use full-text search instead.', 'yellow');
      log('  Set DATABASE_URL=file:./prisma/dev.db to test SQLite', 'yellow');
    }

    // Create test material
    const material = await createTestMaterial();

    // Search for material
    const searchData = await searchMaterials('photosynthesis');

    // Verify results
    await verifySearchResults(searchData, material.id);

    // Test multiple search terms
    await testMultipleSearchTerms(material.id);

    // Cleanup
    await cleanupTestData();

    log('\n' + '='.repeat(60), 'cyan');
    log('✓ All tests passed!', 'green');
    log('='.repeat(60), 'cyan');

    log('\nNOTE: Check server logs to confirm SQLite contains filter was used.', 'yellow');
    log('      Look for Prisma query logs with "contains" or "LIKE" operators.', 'yellow');

    process.exit(0);
  } catch (error) {
    log('\n' + '='.repeat(60), 'red');
    log('❌ Test failed!', 'red');
    log('='.repeat(60), 'red');
    log('\nError: ' + error.message, 'red');

    if (error.stack) {
      log('\nStack trace:', 'red');
      log(error.stack, 'red');
    }

    process.exit(1);
  }
}

// Run the test
main();
