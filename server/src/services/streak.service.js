/** Formats a Date as a UTC "YYYY-MM-DD" string — the day-granularity key
 * used consistently across quest/streak tracking. UTC (not local time) is
 * used so day boundaries are deterministic regardless of server timezone;
 * for a personal-scale app this is a reasonable simplification over
 * per-user local-midnight boundaries. */
export function toISODateString(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Computes a Duolingo-style streak: consecutive days (walking backward
 * from `now`) present in `questMetDates`. Today not being in the set does
 * NOT break the streak (today isn't over yet); any earlier missing day
 * stops the count immediately. Pure and deterministic — `now` is always
 * injected rather than read internally, so it's fully unit-testable.
 *
 * @param {Set<string>} questMetDates - UTC "YYYY-MM-DD" strings for days
 *   the daily quest target was met
 * @param {Date} now
 * @returns {number}
 */
export function computeStreak(questMetDates, now) {
  const cursor = new Date(now);
  let streak = 0;
  let isToday = true;

  while (true) {
    const dateStr = toISODateString(cursor);

    if (questMetDates.has(dateStr)) {
      streak += 1;
    } else if (!isToday) {
      break;
    }

    isToday = false;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}
