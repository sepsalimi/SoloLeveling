// Authenticated reasoning clients for conversational life setup and dated activity extraction.
import { supabase } from "./supabase";
import { automaticSession, validateExtraction } from "@/lib/automaticCheckIn";
import { mergeOrganization } from "@/lib/lifePlan";
import { completeTaskOccurrence } from "@/lib/recurrence";
import { validateOrganization } from "@/lib/reasoningContracts";
import { CheckInSession } from "@/types/activity";
import { LifePlan } from "@/types/life";

function planContext(plan: LifePlan) {
  return {
    goals: plan.goals.filter((goal) => goal.status === "active").slice(0, 50).map(({ id, title, area }) => ({ id, title, area })),
    projects: plan.projects.filter((project) => project.status === "active").slice(0, 50).map(({ id, title, area }) => ({ id, title, area })),
    tasks: plan.tasks.filter((task) => task.status !== "Done").slice(0, 100).map(({ id, title, category, projectId, recurrence }) => ({ id, title, area: category, projectId, recurrence })),
  };
}

export async function processEvening(input: {
  id: string;
  captureDate: string;
  capturedAt: string;
  timezone: string;
  transcript: string;
  plan: LifePlan;
}) {
  if (!supabase) throw new Error("Automatic processing is not connected yet. Your transcript is kept on this device.");
  const { data: auth, error: authError } = await supabase.auth.getSession();
  if (authError || !auth.session) throw new Error("Sign in to process your check-in. Your transcript is kept.");
  const context = planContext(input.plan);
  const { data, error } = await supabase.functions.invoke("reason-check-in", {
    body: {
      transcript: input.transcript,
      captureDate: input.captureDate,
      capturedAt: input.capturedAt,
      timezone: input.timezone,
      context,
    },
    timeout: 120000,
  });
  if (error || !data) throw new Error("Could not process your check-in. Your transcript is kept; tap Retry when the connection is ready.");
  if (data.error) throw new Error(data.error);
  const result = validateExtraction(
    { activities: data.activities, clarificationQuestion: data.clarificationQuestion },
    input.captureDate,
    new Set(input.plan.tasks.map((task) => task.id)),
    new Set(input.plan.projects.map((project) => project.id)),
  );
  if (result.clarificationQuestion) return { clarificationQuestion: result.clarificationQuestion, session: undefined };
  return {
    clarificationQuestion: null,
    session: automaticSession(
      input.id,
      input.captureDate,
      input.capturedAt,
      input.transcript,
      result.activities,
      typeof data.model === "string" ? data.model : "deepseek-v4-flash",
    ),
  };
}

export async function organizeLife(input: {
  conversationId: string;
  transcript: string;
  timezone: string;
  plan: LifePlan;
}) {
  if (!supabase) throw new Error("Life organization needs the connected reasoning service. Your words are still here.");
  const { data: auth, error: authError } = await supabase.auth.getSession();
  if (authError || !auth.session) throw new Error("Sign in to organize your goals and tasks. Your words are still here.");
  const { data, error } = await supabase.functions.invoke("reason-life", {
    body: {
      conversationId: input.conversationId,
      transcript: input.transcript,
      timezone: input.timezone,
      current: planContext(input.plan),
    },
    timeout: 120000,
  });
  if (error || !data) throw new Error("Could not organize this update. Your words are still here; retry when the connection is ready.");
  if (data.error) throw new Error(data.error);
  const result = validateOrganization({
    goals: data.goals,
    projects: data.projects,
    tasks: data.tasks,
    contextNotes: data.contextNotes,
    clarificationQuestion: data.clarificationQuestion,
  });
  return { plan: mergeOrganization(input.plan, result), clarificationQuestion: result.clarificationQuestion };
}

export function applyCheckInToPlan(plan: LifePlan, session: CheckInSession) {
  const updates = [
    ...session.entries.map((entry) => ({ taskId: entry.taskId, date: entry.activityDate, outcome: entry.outcome, minutes: entry.durationMinutes })),
    ...(session.untimedActivities ?? []).map((entry) => ({ taskId: entry.taskId, date: entry.occurredOn, outcome: entry.outcome, minutes: undefined })),
  ];
  let next = plan;
  for (const update of updates) {
    if (!update.taskId) continue;
    if (update.outcome === "completed") {
      next = completeTaskOccurrence(next, update.taskId, update.date, session.completedAt, update.minutes);
    } else {
      next = {
        ...next,
        tasks: next.tasks.map((task) => task.id === update.taskId && task.status === "To Do" ? { ...task, status: "In Progress" } : task),
      };
    }
  }
  return next;
}
