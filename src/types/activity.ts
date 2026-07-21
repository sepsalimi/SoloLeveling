export const activityCategories = [
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
] as const;

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

export type ActivityCategory = (typeof activityCategories)[number];
export type SocialContext = (typeof socialContexts)[number];
export type PurposeTag = (typeof purposeTags)[number];

export type ActivityEntry = {
  id: string;
  title: string;
  description?: string;
  activityDate: string;
  startTime?: string;
  endTime?: string;
  durationMinutes: number;
  primaryCategory: ActivityCategory;
  socialContext: SocialContext;
  purposeTags: PurposeTag[];
  efficiencyPercent?: number;
  energyLevel?: number;
  mood?: number;
  confidence: number;
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
};

export type UserPreferences = {
  afternoonReminderTime: string;
  eveningReminderTime: string;
  reminderDays: number[];
  efficiencyEnabled: boolean;
  moodEnabled: boolean;
  retainAudio: boolean;
  notificationsEnabled: boolean;
};

export type AnalyticsPeriod = "today" | "week" | "month" | "ytd";

