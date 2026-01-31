/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');

function countKeys(obj) {
  let count = 0;
  for (const k in obj) {
    count++;
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      count += countKeys(obj[k]);
    }
  }
  return count;
}

const file = process.argv[2];
// eslint-disable-next-line security/detect-non-literal-fs-filename -- CLI script reads file from argv
const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
console.log(countKeys(data));
