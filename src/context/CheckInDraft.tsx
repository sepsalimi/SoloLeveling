// Keeps one recoverable check-in session available across recording and review screens.
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { File } from "expo-file-system";
import { useAppState } from "@/context/AppState";
import { clearCheckInDraft, loadCheckInDraft, saveCheckInDraft } from "@/services/localStore";
import { CheckInDraft } from "@/types/activity";

type CheckInDraftValue = {
  draft: CheckInDraft | null;
  ready: boolean;
  error?: string;
  replaceDraft: (draft: CheckInDraft) => Promise<void>;
  clearDraft: () => Promise<void>;
};

const CheckInDraftContext = createContext<CheckInDraftValue | undefined>(undefined);

export function CheckInDraftProvider({ children }: PropsWithChildren) {
  const { authReady, user } = useAppState();
  const [draft, setDraft] = useState<CheckInDraft | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!authReady) return;
    loadCheckInDraft()
      .then(async (stored) => {
        if (stored && stored.userId !== user?.id) {
          if (stored.pendingAudioUri) {
            const file = new File(stored.pendingAudioUri);
            if (file.exists) file.delete();
          }
          await clearCheckInDraft();
          setDraft(null);
        } else {
          setDraft(stored);
        }
        setReady(true);
      })
      .catch(async () => {
        await clearCheckInDraft();
        setDraft(null);
        setError("A damaged pending check-in was removed from this device.");
        setReady(true);
      });
  }, [authReady, user?.id]);

  const value = useMemo<CheckInDraftValue>(
    () => ({
      draft,
      ready,
      error,
      async replaceDraft(nextDraft) {
        setError(undefined);
        setDraft(nextDraft);
        await saveCheckInDraft(nextDraft);
      },
      async clearDraft() {
        if (draft?.pendingAudioUri) {
          const file = new File(draft.pendingAudioUri);
          if (file.exists) file.delete();
        }
        setDraft(null);
        await clearCheckInDraft();
      }
    }),
    [draft, error, ready]
  );

  return <CheckInDraftContext.Provider value={value}>{children}</CheckInDraftContext.Provider>;
}

export function useCheckInDraft() {
  const value = useContext(CheckInDraftContext);
  if (!value) throw new Error("useCheckInDraft must be used inside CheckInDraftProvider");
  return value;
}
