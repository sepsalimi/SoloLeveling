import { useEffect, useState } from "react";
import { router } from "expo-router";
import { useAppState } from "@/context/AppState";
import { isoDate } from "@/lib/dates";
import { Card } from "./Card";
import { Text } from "./Text";
import { Button } from "./Button";
import { MorningPlan } from "./MorningPlan";
export function DailyRhythm() {
  const { preferences, sessions } = useAppState();
  const [now, setNow] = useState(new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(timer); }, []);
  const minutes = now.getHours() * 60 + now.getMinutes();
  const time = (value: string) => { const [h,m] = value.split(":").map(Number); return h * 60 + m; };
  const completed = sessions.some(s => s.sessionType === "evening" && s.sessionDate === isoDate(now) && s.status === "completed");
  const scheduledDay = preferences?.reminderDays.includes(now.getDay()) ?? true;
  const eveningDue = scheduledDay && minutes >= time(preferences?.eveningReminderTime ?? "20:30") && !completed;
  const morningDue = scheduledDay && minutes >= time(preferences?.morningReminderTime ?? "08:00") && minutes < time(preferences?.eveningReminderTime ?? "20:30");
  return <>
    {morningDue && <MorningPlan />}
    <Card style={{ borderColor: "#A998FF", borderWidth: 2, borderRadius: 22 }}>
      <Text variant="heading">{completed ? "🌙 Your day is recorded" : eveningDue ? "🌙 Time to tell your day" : "🌙 Your evening check-in"}</Text>
      <Text>{completed ? "Your actual activities are ready in Analytics." : "What did you do today? Talk it through while colourful tiles help you remember."}</Text>
      <Button label={completed ? "See today’s analytics" : "Tell me about today"} onPress={() => router.push(completed ? "/(tabs)/analytics" : { pathname: "/(tabs)/check-in", params: { mode: "evening" } })} />
    </Card>
  </>;
}
