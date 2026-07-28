import { z } from "zod";
import { activityCategories, purposeTags, socialContexts } from "@/types/activity";

export const activityEntrySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullish().transform((value) => value ?? undefined),
  activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().nullish().transform((value) => value ?? undefined),
  endTime: z.string().nullish().transform((value) => value ?? undefined),
  durationMinutes: z.number().int().positive().max(24 * 60),
  primaryCategory: z.enum(activityCategories),
  socialContext: z.enum(socialContexts),
  purposeTags: z.array(z.enum(purposeTags)).max(5),
  efficiencyPercent: z.number().int().min(0).max(100).nullish().transform((value) => value ?? undefined),
  energyLevel: z.number().int().min(1).max(5).nullish().transform((value) => value ?? undefined),
  mood: z.number().int().min(1).max(5).nullish().transform((value) => value ?? undefined),
  confidence: z.number().min(0).max(1),
  sourceTranscriptSegment: z.string().nullish().transform((value) => value ?? undefined),
  needsReview: z.boolean()
});

export const extractionResponseSchema = z.object({
  activities: z.array(activityEntrySchema).max(20),
  unresolvedIssues: z.array(z.string()).max(8)
});

export function validateExtractionResponse(value: unknown) {
  return extractionResponseSchema.safeParse(value);
}

