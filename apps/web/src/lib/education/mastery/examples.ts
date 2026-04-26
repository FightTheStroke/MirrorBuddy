/**
 * @file examples.ts
 * @brief Example curriculum and usage
 */

import type { Topic } from './types';

/**
 * Example: Create a simple math curriculum
 */
export function createExampleCurriculum(): Topic[] {
  return [
    {
      id: "math.arithmetic.addition",
      name: "Addition",
      prerequisites: [],
      subject: "math",
      gradeLevel: 1,
    },
    {
      id: "math.arithmetic.subtraction",
      name: "Subtraction",
      prerequisites: ["math.arithmetic.addition"],
      subject: "math",
      gradeLevel: 1,
    },
    {
      id: "math.arithmetic.multiplication",
      name: "Multiplication",
      prerequisites: ["math.arithmetic.addition"],
      subject: "math",
      gradeLevel: 2,
    },
    {
      id: "math.arithmetic.division",
      name: "Division",
      prerequisites: ["math.arithmetic.multiplication"],
      subject: "math",
      gradeLevel: 3,
    },
    {
      id: "math.fractions.basics",
      name: "Fractions Basics",
      prerequisites: ["math.arithmetic.division"],
      subject: "math",
      gradeLevel: 3,
    },
    {
      id: "math.fractions.addition",
      name: "Adding Fractions",
      prerequisites: ["math.fractions.basics"],
      subject: "math",
      gradeLevel: 4,
    },
  ];
}

