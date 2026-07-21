import { ActivityEntry } from "@/types/activity";

export const transcriptFixtures: Array<{ transcript: string; expected: Partial<ActivityEntry> }> = [
  {
    transcript: "I worked from nine to eleven at around 80 percent efficiency.",
    expected: { primaryCategory: "work", durationMinutes: 120, efficiencyPercent: 80 }
  },
  {
    transcript: "I went to the gym for an hour and then had dinner with friends for about two hours.",
    expected: { primaryCategory: "exercise", durationMinutes: 60 }
  },
  {
    transcript: "I watched a movie alone, probably around two and a half hours.",
    expected: { primaryCategory: "entertainment", durationMinutes: 150, socialContext: "solo" }
  },
  {
    transcript: "I forgot to mention that I also cleaned the apartment for 40 minutes.",
    expected: { primaryCategory: "chores", durationMinutes: 40 }
  }
];

