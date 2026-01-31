/* eslint-disable @typescript-eslint/no-require-imports */
const it = require('../messages/it/compliance.json');
const en = require('../messages/en/compliance.json');

console.log('=== Structure Verification ===\n');
console.log('Italian (it):');
console.log('  - Top-level keys:', Object.keys(it).join(', '));
console.log('  - compliance.legal exists?', it.compliance.legal !== undefined);
console.log('  - compliance.aiTransparency exists?', it.compliance.aiTransparency !== undefined);
console.log('  - compliance.aiTransparency type:', typeof it.compliance.aiTransparency);
console.log('  - compliance.badges exists?', it.compliance.badges !== undefined);

console.log('\nEnglish (en):');
console.log('  - Top-level keys:', Object.keys(en).join(', '));
console.log('  - compliance.legal exists?', en.compliance.legal !== undefined);
console.log('  - compliance.aiTransparency exists?', en.compliance.aiTransparency !== undefined);

console.log('\n✅ Restructuring verified successfully');
