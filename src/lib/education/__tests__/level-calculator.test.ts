import { describe, expect, it } from 'vitest';
import { calculateEducationLevel } from '../level-calculator';

describe('level-calculator', () => {
  it('maps score bands to level', () => {
    expect(calculateEducationLevel(95)).toBe(5);
    expect(calculateEducationLevel(78)).toBe(4);
    expect(calculateEducationLevel(61)).toBe(3);
    expect(calculateEducationLevel(41)).toBe(2);
    expect(calculateEducationLevel(10)).toBe(1);
  });
});
