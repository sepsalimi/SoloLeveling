// Creates explicit JSON or CSV exports in the device cache and opens the system share sheet.
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { ActivityEntry } from "@/types/activity";

function csvCell(value: unknown) {
  const text = Array.isArray(value) ? value.join("|") : String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export async function shareJsonExport(data: unknown) {
  const file = new File(Paths.cache, `life-analytics-${new Date().toISOString().slice(0, 10)}.json`);
  file.create({ overwrite: true });
  file.write(JSON.stringify(data, null, 2));
  await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: "Export Life Analytics data" });
}

export async function shareCsvExport(activities: ActivityEntry[]) {
  const columns: (keyof ActivityEntry)[] = [
    "activityDate",
    "title",
    "description",
    "startTime",
    "endTime",
    "durationMinutes",
    "primaryCategory",
    "socialContext",
    "purposeTags",
    "efficiencyPercent",
    "energyLevel",
    "mood"
  ];
  const csv = [
    columns.map(csvCell).join(","),
    ...activities.map((activity) => columns.map((column) => csvCell(activity[column])).join(","))
  ].join("\n");

  const file = new File(Paths.cache, `life-analytics-${new Date().toISOString().slice(0, 10)}.csv`);
  file.create({ overwrite: true });
  file.write(csv);
  await Sharing.shareAsync(file.uri, { mimeType: "text/csv", dialogTitle: "Export Life Analytics activities" });
}
