// Dated actual-activity records share the same broad area taxonomy as planning.
import { lifeAreas, LifeArea } from "./life";

export const activityCategories = lifeAreas;

export const socialContexts = [
  "solo",
  "with_partner",
  "with_family",
  "with_friends",
  "with_coworkers",
  "public",
  "unknown"
] as const;

export const purposeTags = ["productive", "fun", "recovery", "necessary", "growth"] as const;

export type ActivityCategory = LifeArea;
export type SocialContext = (typeof socialContexts)[number];
export type PurposeTag = (typeof purposeTags)[number];

export type ActivityEntry = {
  id: string;
  sessionId?: string;
  title: string;
  description?: string;
  activityDate: string;
  recordedAt?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes: number;
  primaryCategory: ActivityCategory;
  projectId?: string;
  taskId?: string;
  outcome?: "completed" | "partial";
  socialContext: SocialContext;
  purposeTags: PurposeTag[];
  efficiencyPercent?: number;
  energyLevel?: number;
  mood?: number;
  confidence?: number;
  sourceTranscriptSegment?: string;
  needsReview: boolean;
};

export type CheckInSession = {
  id: string;
  sessionDate: string;
  sessionType: "afternoon" | "evening" | "manual";
  status: "draft" | "processing" | "review" | "completed" | "failed";
  createdAt: string;
  completedAt?: string;
  transcripts: string[];
  entries: ActivityEntry[];
  unresolvedIssues: string[];
  untimedActivities?: {
    id: string;
    title: string;
    category: ActivityCategory;
    occurredOn: string;
    recordedAt: string;
    source: string;
    projectId?: string;
    taskId?: string;
    outcome: "completed" | "partial";
  }[];
  processingModel?: string;
};

export type UserPreferences = {
  steamProfileUrl?: string;
  morningPlanEnabled?: boolean;
  morningReminderTime?: string;
  activityCues?: import("../lib/checkIn").ActivityCue[];
  afternoonReminderTime: string;
  eveningReminderTime: string;
  reminderDays: number[];
  efficiencyEnabled: boolean;
  moodEnabled: boolean;
  retainAudio: boolean;
  notificationsEnabled: boolean;
  onboardingCompleted: boolean;
};

export type AnalyticsPeriod = "today" | "week" | "month" | "ytd";
