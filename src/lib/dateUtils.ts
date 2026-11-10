const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

function makeUtcDay(year: number, month: number, day: number): number | null {
  const date = new Date(Date.UTC(year, month, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) return null;
  return date.getTime();
}

function monthIndex(value: string): number {
  const monthName = value.toLowerCase();
  return MONTHS.findIndex((month) => month === monthName || month.startsWith(monthName));
}

function parseDate(value: string, meetingDate?: string): number | null {
  const input = value.trim();
  if (!input || input.toLowerCase() === "unknown") return null;

  const iso = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return makeUtcDay(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const namedDate = input.match(/^([A-Za-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?$/);
  if (namedDate) {
    const month = monthIndex(namedDate[1]);
    const day = Number(namedDate[2]);
    if (month < 0) return null;

    let year = namedDate[3] ? Number(namedDate[3]) : null;
    if (year === null) {
      const meetingDay = meetingDate ? parseDate(meetingDate) : null;
      if (meetingDay === null) return null;
      const meeting = new Date(meetingDay);
      const sameYearDeadline = makeUtcDay(meeting.getUTCFullYear(), month, day);
      if (sameYearDeadline === null || sameYearDeadline < meetingDay) return null;
      year = meeting.getUTCFullYear();
    }
    return makeUtcDay(year, month, day);
  }

  // Accept other unambiguous date forms only when they explicitly include a year.
  if (!/\b\d{4}\b/.test(input)) return null;
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return null;
  return makeUtcDay(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function utcDay(value: Date): number {
  return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
}

export function daysOverdue(
  deadline: string,
  meetingDate: string | undefined,
  asOf: Date
): number | null {
  const dueDay = parseDate(deadline, meetingDate);
  if (dueDay === null) return null;
  const difference = Math.floor((utcDay(asOf) - dueDay) / (24 * 60 * 60 * 1000));
  return difference > 0 ? difference : null;
}
