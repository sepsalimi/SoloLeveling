// Provides transparent rule-based text extraction for the temporary serverless Pages build.
import { isoDate } from "@/lib/dates";
import { normalizeDuration } from "@/lib/duration";
import { removeDuplicateActivities } from "@/lib/duplicates";
import { ActivityEntry } from "@/types/activity";

type Rule = {
  keywords: string[];
  title: (text: string) => string;
  category: ActivityEntry["primaryCategory"];
  socialContext: (text: string) => ActivityEntry["socialContext"];
  purposeTags: ActivityEntry["purposeTags"];
};

const rules: Rule[] = [
  {
    keywords: ["worked", "work"],
    title: (text) => text.includes("presentation") ? "Client presentation" : "Focused work",
    category: "work",
    socialContext: (text) => text.includes("coworker") ? "with_coworkers" : "solo",
    purposeTags: ["productive"]
  },
  {
    keywords: ["gym", "exercise", "workout"],
    title: () => "Exercise",
    category: "exercise",
    socialContext: () => "public",
    purposeTags: ["growth", "recovery"]
  },
  {
    keywords: ["lunch", "dinner", "breakfast"],
    title: (text) => text.includes("lunch") ? "Lunch" : text.includes("breakfast") ? "Breakfast" : "Dinner",
    category: "food",
    socialContext: socialContext,
    purposeTags: ["necessary", "fun"]
  },
  {
    keywords: ["youtube", "movie", "watched"],
    title: (text) => text.includes("movie") ? "Movie" : "Entertainment",
    category: "entertainment",
    socialContext: socialContext,
    purposeTags: ["fun", "recovery"]
  },
  {
    keywords: ["cleaned", "cleaning", "chores"],
    title: () => "Household chores",
    category: "chores",
    socialContext: () => "solo",
    purposeTags: ["necessary"]
  }
];

function socialContext(text: string): ActivityEntry["socialContext"] {
  if (text.includes("alone") || text.includes("solo")) return "solo";
  if (text.includes("partner")) return "with_partner";
  if (text.includes("family")) return "with_family";
  if (text.includes("friend") || text.includes("aya")) return "with_friends";
  if (text.includes("coworker")) return "with_coworkers";
  return "unknown";
}

function segmentFor(text: string, keyword: string) {
  const start = text.indexOf(keyword);
  const remainder = text.slice(start);
  return remainder.split(/\b(?:and then|then|after that|afterwards)\b|[.!?]/)[0].trim();
}

export async function extractLocalActivities(transcript: string, existing: ActivityEntry[] = []) {
  const text = transcript.toLowerCase();
  const extracted: ActivityEntry[] = [];
  const unresolvedIssues: string[] = [];

  for (const rule of rules) {
    const keyword = rule.keywords.find((candidate) => text.includes(candidate));
    if (!keyword) continue;
    const segment = segmentFor(text, keyword);
    const durationMinutes = normalizeDuration(segment);
    if (!durationMinutes) {
      unresolvedIssues.push(`A duration was not clear for ${rule.title(segment).toLowerCase()}. Add it manually during review.`);
      continue;
    }
    const efficiencyMatch = segment.match(/(\d{1,3})\s*(?:percent|%)/);
    extracted.push({
      id: `local-draft-${Date.now()}-${extracted.length}`,
      title: rule.title(segment),
      activityDate: isoDate(),
      durationMinutes,
      primaryCategory: rule.category,
      socialContext: rule.socialContext(segment),
      purposeTags: rule.purposeTags,
      efficiencyPercent: rule.category === "work" && efficiencyMatch ? Number(efficiencyMatch[1]) : undefined,
      confidence: 0.75,
      sourceTranscriptSegment: segment,
      needsReview: true
    });
  }

  if (!extracted.length && !unresolvedIssues.length) {
    unresolvedIssues.push("No supported activity with an explicit duration was found. Add an activity manually during review.");
  }

  return {
    activities: removeDuplicateActivities([...existing, ...extracted]),
    unresolvedIssues
  };
}
