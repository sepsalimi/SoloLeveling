const wordNumbers: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12
};

export function parseClockTime(input: string): number | null {
  const clean = input.trim().toLowerCase();
  const numeric = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (numeric) {
    let hours = Number(numeric[1]);
    const minutes = Number(numeric[2] ?? "0");
    const meridian = numeric[3];
    if (minutes > 59 || hours > 24) return null;
    if (meridian === "pm" && hours < 12) hours += 12;
    if (meridian === "am" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  const word = clean.match(/^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)$/);
  return word ? wordNumbers[word[1]] * 60 : null;
}

export function calculateDurationFromTimes(startTime?: string, endTime?: string): number | null {
  if (!startTime || !endTime) return null;
  const start = parseClockTime(startTime);
  const end = parseClockTime(endTime);
  if (start == null || end == null || end <= start) return null;
  return end - start;
}

export function normalizeDuration(text: string): number | null {
  const clean = text.toLowerCase();
  if (/\b(?:an|a)\s+hours?\b/.test(clean)) return 60;

  const decimalHours = clean.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/);
  if (decimalHours) return Math.round(Number(decimalHours[1]) * 60);

  const wordHour = clean.match(
    /(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)(?:\s+and\s+a\s+half)?\s+hours?/
  );
  if (wordHour) {
    const base = wordNumbers[wordHour[1]];
    return base * 60 + (wordHour[0].includes("half") ? 30 : 0);
  }

  const half = clean.match(/(?:two and a half|2 and a half|2\.5)\s+hours?/);
  if (half) return 150;

  const minutes = clean.match(/(\d+)\s*(?:minutes?|mins?|m)\b/);
  if (minutes) return Number(minutes[1]);

  const wordMinutes = clean.match(/(twenty|thirty|forty|fifty|sixty)\s+minutes?/);
  const wordMinuteValues: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60 };
  if (wordMinutes) return wordMinuteValues[wordMinutes[1]];

  const range = clean.match(/from\s+([a-z0-9:]+)\s+(?:until|to)\s+([a-z0-9:]+)/);
  if (range) return calculateDurationFromTimes(range[1], range[2]);

  return null;
}