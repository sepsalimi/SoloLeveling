// Keeps one recoverable check-in session available across recording and review screens.
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { useAppState } from "@/context/AppState";
import { clearCheckInDraft, loadCheckInDraft, saveCheckInDraft } from "@/services/localStore";
import { CheckInDraft } from "@/types/activity";

type CheckInDraftValue = {
  draft: CheckInDraft | null;
  ready: boolean;
  replaceDraft: (draft: CheckInDraft) => Promise<void>;
  clearDraft: () => Promise<void>;
};

const CheckInDraftContext = createContext<CheckInDraftValue | undefined>(undefined);

export function CheckInDraftProvider({ children }: PropsWithChildren) {
  const { authReady, user } = useAppState();
  const [draft, setDraft] = useState<CheckInDraft | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    loadCheckInDraft().then(async (stored) => {
      if (stored && stored.userId !== user?.id) {
        await clearCheckInDraft();
        setDraft(null);
      } else {
        setDraft(stored);
      }
      setReady(true);
    });
  }, [authReady, user?.id]);

  const value = useMemo<CheckInDraftValue>(
    () => ({
      draft,
      ready,
      async replaceDraft(nextDraft) {
        setDraft(nextDraft);
        await saveCheckInDraft(nextDraft);
      },
      async clearDraft() {
        setDraft(null);
        await clearCheckInDraft();
      }
    }),
    [draft, ready]
  );

  return <CheckInDraftContext.Provider value={value}>{children}</CheckInDraftContext.Provider>;
}

export function useCheckInDraft() {
  const value = useContext(CheckInDraftContext);
  if (!value) throw new Error("useCheckInDraft must be used inside CheckInDraftProvider");
  return value;
}
