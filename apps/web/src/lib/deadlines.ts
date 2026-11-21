// SPDX-License-Identifier: MIT
/** Deadlines of § 27 (38) UStG as explained in the BMF FAQ (status 29 Oct 2026). */
export const MILESTONES: { year: string; from: string; n: 1 | 2 | 3 }[] = [
  { year: '2025', from: '2025-01-01', n: 1 },
  { year: '2027', from: '2027-01-01', n: 2 },
  { year: '2028', from: '2028-01-01', n: 3 },
];

/** Index of the first milestone that has not started yet, -1 when all apply. */
export function nextMilestone(now: Date): number {
  const iso = now.toISOString().slice(0, 10);
  return MILESTONES.findIndex((m) => m.from > iso);
}
