// Server-side Zod validation for OpenAI structured extraction output.
import { z } from "npm:zod@4.1.5";

const activitySchema = z.object({
  id: z.string().min(1).max(120),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable(),
  activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  durationMinutes: z.number().int().min(1).max(1440),
  primaryCategory: z.enum([
    "work",
    "learning",
    "health",
    "exercise",
    "food",
    "chores",
    "social",
    "entertainment",
    "rest",
    "travel",
    "personal_care",
    "other"
  ]),
  socialContext: z.enum([
    "solo",
    "with_partner",
    "with_family",
    "with_friends",
    "with_coworkers",
    "public",
    "unknown"
  ]),
  purposeTags: z.array(z.enum(["productive", "fun", "recovery", "necessary", "growth"])).max(5),
  efficiencyPercent: z.number().int().min(0).max(100).nullable(),
  energyLevel: z.number().int().min(1).max(5).nullable(),
  mood: z.number().int().min(1).max(5).nullable(),
  confidence: z.number().min(0).max(1),
  sourceTranscriptSegment: z.string().max(2000).nullable(),
  needsReview: z.boolean()
});

export const extractionResultSchema = z.object({
  activities: z.array(activitySchema).max(40),
  unresolvedIssues: z.array(z.string().max(500)).max(40)
});

export function parseExtractionResult(content: string) {
  const parsed = JSON.parse(content);
  return extractionResultSchema.parse(parsed);
}
