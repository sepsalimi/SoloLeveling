import { ActivityEntry, CheckInSession, UserPreferences } from "@/types/activity";
import { isoDate } from "@/lib/dates";

const today = isoDate();

export const defaultPreferences: UserPreferences = {
  afternoonReminderTime: "14:00",
  eveningReminderTime: "20:30",
  reminderDays: [1, 2, 3, 4, 5, 6, 0],
  efficiencyEnabled: true,
  moodEnabled: true,
  retainAudio: false,
  notificationsEnabled: false
};

export const sampleActivities: ActivityEntry[] = [
  {
    id: "sample-work",
    title: "Client presentation",
    activityDate: today,
    startTime: "09:00",
    endTime: "11:00",
    durationMinutes: 120,
    primaryCategory: "work",
    socialContext: "solo",
    purposeTags: ["productive"],
    efficiencyPercent: 80,
    mood: 3,
    energyLevel: 4,
    confidence: 0.94,
    sourceTranscriptSegment: "I worked on the client presentation from 9 until 11 and was around 80 percent focused.",
    needsReview: false
  },
  {
    id: "sample-lunch",
    title: "Lunch with Aya",
    activityDate: today,
    durationMinutes: 45,
    primaryCategory: "food",
    socialContext: "with_friends",
    purposeTags: ["fun", "necessary"],
    confidence: 0.88,
    needsReview: false
  },
  {
    id: "sample-gym",
    title: "Gym",
    activityDate: today,
    durationMinutes: 50,
    primaryCategory: "exercise",
    socialContext: "public",
    purposeTags: ["growth", "recovery"],
    confidence: 0.9,
    needsReview: false
  }
];

export const sampleSessions: CheckInSession[] = [
  {
    id: "demo-session",
    sessionDate: today,
    sessionType: "afternoon",
    status: "completed",
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    transcripts: [
      "I worked on the client presentation from 9 until 11 at 80 percent focus, had lunch with Aya, then went to the gym."
    ],
    entries: sampleActivities,
    unresolvedIssues: []
  }
];

