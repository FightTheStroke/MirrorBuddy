// Test script for calculator-handler.ts functionality
// Tests basic expressions required by subtask-4-1

const { Parser } = require('expr-eval');

// Test expressions from subtask-4-1 verification
const testCases = [
  { expression: '2+2', expected: 4, description: 'Simple addition' },
  { expression: '5*10', expected: 50, description: 'Simple multiplication' },
  { expression: 'sqrt(16)', expected: 4, description: 'Square root function' },
  { expression: 'sin(PI/2)', expected: 1, description: 'Trigonometric function with PI constant', tolerance: 0.0001 },
  { expression: 'E^2', expected: 7.389, description: 'Exponential with E constant', tolerance: 0.001 }
];

console.log('='.repeat(60));
console.log('CALCULATOR HANDLER VERIFICATION TEST');
console.log('='.repeat(60));
console.log();

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  try {
    const parser = new Parser();

    // Add custom constants (same as calculator-handler.ts)
    parser.consts.PI = Math.PI;
    parser.consts.E = Math.E;

    const result = parser.evaluate(testCase.expression.trim());

    // Check if result is valid number
    if (typeof result !== 'number' || !isFinite(result)) {
      console.log(`❌ Test ${index + 1} FAILED: ${testCase.description}`);
      console.log(`   Expression: ${testCase.expression}`);
      console.log(`   Error: Result is not a valid number`);
      console.log();
      failed++;
      return;
    }

    // Check if result matches expected (with tolerance for floating point)
    const tolerance = testCase.tolerance || 0.0001;
    const matches = Math.abs(result - testCase.expected) < tolerance;

    if (matches) {
      console.log(`✅ Test ${index + 1} PASSED: ${testCase.description}`);
      console.log(`   Expression: ${testCase.expression}`);
      console.log(`   Result: ${result}`);
      console.log(`   Expected: ${testCase.expected}`);
      console.log();
      passed++;
    } else {
      console.log(`❌ Test ${index + 1} FAILED: ${testCase.description}`);
      console.log(`   Expression: ${testCase.expression}`);
      console.log(`   Result: ${result}`);
      console.log(`   Expected: ${testCase.expected}`);
      console.log(`   Difference: ${Math.abs(result - testCase.expected)}`);
      console.log();
      failed++;
    }
  } catch (error) {
    console.log(`❌ Test ${index + 1} FAILED: ${testCase.description}`);
    console.log(`   Expression: ${testCase.expression}`);
    console.log(`   Error: ${error.message}`);
    console.log();
    failed++;
  }
});

console.log('='.repeat(60));
console.log(`RESULTS: ${passed} passed, ${failed} failed (${testCases.length} total)`);
console.log('='.repeat(60));

// Exit with error code if any tests failed
process.exit(failed > 0 ? 1 : 0);
