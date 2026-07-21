import { readFileSync } from "node:fs";

describe("Supabase RLS policies", () => {
  const migration = readFileSync("supabase/migrations/202607200001_initial_schema.sql", "utf8");

  it("enables RLS on personal tables", () => {
    for (const table of ["profiles", "user_preferences", "check_in_sessions", "voice_notes", "activity_entries"]) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it("scopes policies to auth.uid", () => {
    expect(migration).toContain("auth.uid() = user_id");
    expect(migration).toContain("auth.uid() = id");
  });
});

