import { readFileSync } from "node:fs";

describe("Supabase RLS policies", () => {
  const migration = readFileSync("supabase/migrations/202607200001_initial_schema.sql", "utf8");
  const functionalMigration = readFileSync("supabase/migrations/202607280001_functional_mvp.sql", "utf8");
  const hardeningMigration = readFileSync("supabase/migrations/202608010001_check_in_hardening.sql", "utf8");

  it("enables RLS on personal tables", () => {
    for (const table of ["profiles", "user_preferences", "check_in_sessions", "voice_notes", "activity_entries"]) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it("scopes policies to auth.uid", () => {
    expect(migration).toContain("auth.uid() = user_id");
    expect(migration).toContain("auth.uid() = id");
  });

  it("protects private recordings and transactional check-in completion", () => {
    expect(functionalMigration).toContain("voice_notes_storage_select_own");
    expect(functionalMigration).toContain("storage.foldername(name))[1] = auth.uid()::text");
    expect(functionalMigration).toContain("function public.complete_check_in");
    expect(functionalMigration).toContain("grant execute on function public.complete_check_in");
  });

  it("rejects completed check-in double submits", () => {
    expect(hardeningMigration).toContain("This check-in was already saved.");
    expect(hardeningMigration).toContain("activity_entries_user_session_idx");
  });
});

