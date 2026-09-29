import { LifeTask, TaskCategory } from "../types/task";

export function taskType(priority: string, hours: number | null | undefined): string {
  if (hours == null || !Number.isFinite(hours) || hours <= 0) return "⚠️ No Hours Set";
  if (priority === "high" || priority === "medium") return hours <= 1 ? "🍒 Low Hanging" : "🪨 Big Rock";
  if (priority === "low") return hours <= 1 ? "☕️ Nice to Do" : "🐌 Time Sink";
  return "⚠️ Unknown Priority";
}

export function categorizeTask(title: string): TaskCategory {
  const rules: [TaskCategory, RegExp][] = [
    ["Finance", /\b(budget|tax|taxes|invoice|bank|invest|investment|savings|debt|pay|payment|rent|bill|bills|finance)\b/i],
    ["Health", /\b(doctor|dentist|exercise|gym|workout|therapy|health|medication|run|fitness)\b/i],
    ["Career", /\b(job|resume|cv|client|work|career|interview|business|meeting|proposal)\b/i],
    ["Learning", /\b(study|course|exam|learn|class|assignment|university|academia)\b/i],
    ["Creative", /\b(photo|photography|photos|design|paint|drawing|write|writing|edit|video|music)\b/i],
    ["Relationships", /\b(friend|friends|family|partner|birthday|visit|call|dinner)\b/i],
    ["Leisure", /\b(game|games|gaming|steam|movie|movies|relax|leisure|holiday|vacation|read|book)\b/i],
  ];
  return rules.find(([, pattern]) => pattern.test(title))?.[0] ?? "Life Admin";
}

function spokenNumbers(text: string): string {
  const numbers: Record<string, string> = { a: "1", an: "1", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10", fifteen: "15", twenty: "20", thirty: "30", forty: "40", fortyfive: "45", sixty: "60", ninety: "90" };
  return text.toLowerCase().replace(/half an? hour/g, "0.5 hours").replace(/(one|two|three|four) and a half hours?/g, (_, n: string) => String(Number(numbers[n]) + 0.5) + " hours")
    .replace(/\b(a|an|one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty|forty|sixty|ninety)\b(?=\s+(?:hours?|hrs?|minutes?|mins?)\b)/g, (n) => numbers[n]);
}

/** Offline suggestions are always reviewed before saving. Missing hours stay missing. */
export function draftTasks(transcript: string): LifeTask[] {
  const parts = transcript.split(/\n+|;|[.!?](?:\s+|$)|\b(?:and then|next task|also I need to)\b|\s+and\s+(?=(?:I (?:need|want|have) to|pay|book|clean|buy|renew|finish|study|call|read|play|submit|organize)\b)/i)
    .map((part) => part.trim()).filter(Boolean);
  return parts.map((title, index) => {
    const normalized = spokenNumbers(title);
    const hours = [...normalized.matchAll(/\b(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)\b/g)]
      .reduce((sum, match) => sum + Number(match[1]) / (/^m/.test(match[2]) ? 60 : 1), 0);
    const low = /\b(low priority|not urgent|no rush|whenever|someday)\b/i.test(title);
    const high = /\b(high priority|urgent|asap|critical|today|overdue)\b/i.test(title);
    return {
      id: "task-" + Date.now() + "-" + index + "-" + Math.random().toString(36).slice(2, 8),
      title: title.replace(/^(?:I (?:need|want|have) to|I should)\s+/i, ""),
      category: categorizeTask(title),
      priority: low ? "low" : high ? "high" : "medium",
      estimatedHours: hours > 0 ? Math.round(hours * 100) / 100 : null,
      status: "To Do",
      createdAt: new Date().toISOString(),
    };
  });
}

export function plannedHours(tasks: LifeTask[]) {
  const totals: Partial<Record<TaskCategory, number>> = {};
  for (const task of tasks) if (task.status !== "Done" && task.estimatedHours != null && Number.isFinite(task.estimatedHours) && task.estimatedHours > 0) {
    totals[task.category] = (totals[task.category] ?? 0) + task.estimatedHours;
  }
  return totals;
}
