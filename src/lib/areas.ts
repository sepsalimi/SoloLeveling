// Canonical area mapping keeps legacy task and activity categories readable during migration.
import { LifeArea, lifeAreas } from "@/types/life";
import { PurposeTag } from "@/types/activity";

const legacyAreas: Record<string, LifeArea> = {
  Finance: "Finances",
  work: "Career",
  learning: "Learning",
  health: "Health",
  exercise: "Health",
  food: "Health",
  chores: "Life Admin",
  social: "Relationships",
  entertainment: "Leisure",
  rest: "Leisure",
  travel: "Life Admin",
  personal_care: "Health",
  other: "Life Admin",
};

export function normalizeArea(value: unknown): LifeArea {
  if (typeof value === "string" && lifeAreas.includes(value as LifeArea)) return value as LifeArea;
  return typeof value === "string" && legacyAreas[value] ? legacyAreas[value] : "Life Admin";
}

export function defaultPurpose(area: LifeArea): PurposeTag[] {
  if (area === "Career") return ["productive"];
  if (area === "Learning" || area === "Creative" || area === "Health") return ["growth"];
  if (area === "Leisure") return ["fun", "recovery"];
  if (area === "Relationships") return ["fun"];
  return ["necessary"];
}
