import { getLocalDateString } from './utils';
import type { StudySession } from '../types';

/**
 * Returns the number of consecutive days (including today) with at least
 * one focus session. Counts backwards from today using getLocalDateString.
 */
export function getCurrentStreak(sessions: StudySession[]): number {
  const focusDates = new Set(
    sessions
      .filter(s => s.type === 'focus')
      .map(s => getLocalDateString(s.timestamp))
  );

  let streak = 0;
  const cursor = new Date();

  while (true) {
    const dateStr = getLocalDateString(cursor.getTime());
    if (!focusDates.has(dateStr)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

/**
 * Scans all focus session dates and returns the maximum number of
 * consecutive days found anywhere in the data.
 */
export function getLongestStreak(sessions: StudySession[]): number {
  const dates = new Set(
    sessions
      .filter(s => s.type === 'focus')
      .map(s => getLocalDateString(s.timestamp))
  );

  if (dates.size === 0) return 0;

  // Convert to Date objects, sort ascending
  const sorted = Array.from(dates)
    .map(d => {
      const [y, m, day] = d.split('-').map(Number);
      return new Date(y, m - 1, day);
    })
    .sort((a, b) => a.getTime() - b.getTime());

  let longest = 1;
  let current = 1;
  const ONE_DAY = 24 * 60 * 60 * 1000;

  for (let i = 1; i < sorted.length; i++) {
    const diff = (sorted[i].getTime() - sorted[i - 1].getTime()) / ONE_DAY;
    if (Math.abs(diff - 1) < 0.01) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }

  return longest;
}
