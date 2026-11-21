// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { nextMilestone } from './deadlines';

describe('nextMilestone', () => {
  it('points at the next deadline that has not started', () => {
    expect(nextMilestone(new Date('2024-06-01T12:00:00Z'))).toBe(0);
    expect(nextMilestone(new Date('2026-11-21T12:00:00Z'))).toBe(1);
    expect(nextMilestone(new Date('2027-01-01T12:00:00Z'))).toBe(2);
  });
  it('returns -1 once every deadline applies', () => {
    expect(nextMilestone(new Date('2028-01-01T12:00:00Z'))).toBe(-1);
  });
});
