import { ActivityCategory, ActivityEntry, CheckInSession } from "../types/activity";
import { LifeTask } from "../types/task";
export type ActivityCue = { id: string; label: string; emoji: string; color: string; category: ActivityCategory; aliases: string[] };
export const defaultCues: ActivityCue[] = [
  { id: "work", label: "Work", emoji: "💼", color: "#FFD447", category: "work", aliases: ["work", "worked", "office", "job", "shift"] },
  { id: "workout", label: "Workout", emoji: "💪", color: "#FF6B9B", category: "exercise", aliases: ["workout", "worked out", "exercise", "exercised", "gym", "ran", "run", "walk", "walked", "swam"] },
  { id: "peng", label: "P.Eng study", emoji: "📚", color: "#A998FF", category: "learning", aliases: ["p.eng", "p eng", "peng", "engineering exam"] },
  { id: "admin", label: "Life Admin", emoji: "🏡", color: "#5DE2C5", category: "chores", aliases: ["cleaned", "cleaning", "laundry", "chores", "errands", "groceries", "bills", "admin"] },
  { id: "leisure", label: "Leisure", emoji: "🎮", color: "#FFAC59", category: "entertainment", aliases: ["game", "games", "gaming", "played", "movie", "watched", "read"] },
  { id: "people", label: "People", emoji: "💬", color: "#75C9FF", category: "social", aliases: ["friends", "family", "partner", "visited", "called"] },
  { id: "rest", label: "Rest", emoji: "🌙", color: "#F3A5ED", category: "rest", aliases: ["slept", "sleep", "nap", "napped", "rested", "rest"] },
];
export type HeardActivity = { key: string; title: string; cueId?: string; category: ActivityCategory; minutes: number | null; source: string };

export function normalizeSpeech(value: string) { return value.toLowerCase().replace(/[.’']/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim(); }
export function matchesCue(text: string, cue: ActivityCue) {
  const normalized = " " + normalizeSpeech(text).replace(/\bwork(?:ed)? out\b/g, "workout") + " ";
  return [cue.label, ...cue.aliases].some(alias => {
    const word = normalizeSpeech(alias).replace(/\bwork(?:ed)? out\b/g, "workout");
    return word.length > 0 && normalized.includes(" " + word + " ");
  });
}
export function mentionedCues(transcript: string, cues: ActivityCue[]) {
  return new Set(hearActivities(transcript, cues).flatMap(a => a.cueId ? [a.cueId] : []));
}
export function spokenMinutes(text: string): number | null {
  const numbers: Record<string, number> = { a:1, an:1, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10, fifteen:15, twenty:20, thirty:30, forty:40, fifty:50, sixty:60, ninety:90 };
  const normalized = text.toLowerCase()
    .replace(/half an? hour/g, "30 minutes")
    .replace(/a quarter (?:of an? )?hour/g, "15 minutes")
    .replace(/(one|two|three|four) and a half hours?/g, (_, n: string) => (numbers[n] + 0.5) + " hours")
    .replace(/\b(twenty|thirty|forty|fifty)[ -](one|two|three|four|five|six|seven|eight|nine)\b/g, (_, tens: string, ones: string) => String(numbers[tens] + numbers[ones]))
    .replace(/\b(a|an|one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty|forty|fifty|sixty|ninety)\b(?=\s+(?:hours?|hrs?|minutes?|mins?)\b)/g, n => String(numbers[n]));
  const matches = [...normalized.matchAll(/\b(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)\b/g)];
  if (!matches.length) return null;
  const total = Math.round(matches.reduce((sum, m) => sum + Number(m[1]) * (/^h/.test(m[2]) ? 60 : 1), 0));
  return total > 0 && total <= 1440 ? total : null;
}
export function hearActivities(transcript: string, cues: ActivityCue[]): HeardActivity[] {
  const clauses = transcript.split(/\n+|;|[!?](?:\s+|$)|\.(?=\s+|$)|\b(?:and after|after that|and then|then|but|after I|and I|also I)\b|\band\s+(?=(?:worked|went|studied|exercised|ran|cleaned|played|watched|slept|read|cooked|visited|walked)\b)/i).map(t => t.trim()).filter(Boolean);
  return clauses.flatMap<HeardActivity>((source, index) => {
    if (/\b(didn['’]?t|did not|never|skipped|haven['’]?t|have not|plan to|planning to|want to|need to|going to|will|tomorrow)\b/i.test(source)) return [];
    const matched = cues.filter(cue => matchesCue(source, cue));
    // A duration shared by multiple topics is ambiguous; ask once the person finishes.
    if (matched.length) return matched.map(cue => ({ key: index + ":" + cue.id, title: cue.label, cueId: cue.id, category: cue.category, minutes: matched.length === 1 ? spokenMinutes(source) : null, source }));
    const category: ActivityCategory = /\b(studied|learned|course|study)\b/i.test(source) ? "learning" : /\b(ate|cooked|lunch|dinner|breakfast)\b/i.test(source) ? "food" : "other";
    if (!/\b(I|we|spent|studied|learned|ate|cooked|went|did|finished|completed)\b/i.test(source) && !spokenMinutes(source)) return [];
    return [{ key: index + ":other", title: source.slice(0, 100), category, minutes: spokenMinutes(source), source }];
  });
}
export function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + "T12:00:00Z")) && new Date(value + "T12:00:00Z").toISOString().slice(0,10) === value;
}
export function makeEveningSession(id: string, date: string, transcript: string, heard: HeardActivity[]): CheckInSession {
  if (!validDate(date)) throw new Error("Choose a valid date (YYYY-MM-DD).");
  if (!heard.length) throw new Error("Add at least one activity.");
  if (heard.some(a => !a.title.trim() || !Number.isInteger(a.minutes) || a.minutes! < 1 || a.minutes! > 1440)) throw new Error("Give each activity a title and a duration from 1 to 1,440 minutes.");
  if (heard.reduce((sum, a) => sum + a.minutes!, 0) > 1440) throw new Error("These activities total more than 24 hours. Check for overlapping time.");
  const entries: ActivityEntry[] = heard.map((a, i) => ({
    id: id + "-" + i, title: a.title.trim(), activityDate: date, durationMinutes: a.minutes!,
    primaryCategory: a.category, socialContext: "unknown",
    purposeTags: a.category === "work" ? ["productive"] : a.category === "learning" ? ["growth"] : a.category === "entertainment" ? ["fun"] : a.category === "rest" ? ["recovery"] : ["necessary"],
    confidence: 1, needsReview: false, sourceTranscriptSegment: a.source,
  }));
  return { id, sessionDate: date, sessionType: "evening", status: "completed", createdAt: new Date().toISOString(), completedAt: new Date().toISOString(), transcripts: [transcript], entries, unresolvedIssues: [] };
}
export function morningTasks(tasks: LifeTask[]) {
  return tasks.filter(t => t.status !== "Done").sort((a,b) => {
    const priority = { high:0, medium:1, low:2 };
    return priority[a.priority] - priority[b.priority] || (a.status === "In Progress" ? 0 : 1) - (b.status === "In Progress" ? 0 : 1) || (a.estimatedHours ?? Infinity) - (b.estimatedHours ?? Infinity);
  }).slice(0,3);
}
