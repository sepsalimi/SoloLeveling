// Authenticated conversational setup that saves goals, projects, and tasks without a review queue.
import { useRef, useState } from "react";
import { TextInput, useColorScheme, View } from "react-native";
import { router } from "expo-router";
import { useAppState } from "@/context/AppState";
import { systemTimeZone } from "@/lib/dates";
import { organizeLife } from "@/services/reasoning";
import { saveLifePlan } from "@/services/taskStore";
import { LifePlan } from "@/types/life";
import { palette } from "@/theme/colors";
import { Button } from "./Button";
import { Card } from "./Card";
import { TaskVoice } from "./TaskVoice";
import { Text } from "./Text";

export function LifeCapture({ plan, onPlan }: { plan: LifePlan; onPlan: (plan: LifePlan) => void }) {
  const { user } = useAppState();
  const [text, setText] = useState("");
  const [question, setQuestion] = useState<string>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId] = useState(() => `life-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const textRef = useRef("");
  const dark = useColorScheme() === "dark";

  function changeText(value: string) {
    textRef.current = value;
    setText(value);
  }

  async function submit() {
    const words = textRef.current.trim();
    if (!words || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const transcript = question ? `Assistant asked: ${question}\nUser answered: ${words}` : words;
      const result = await organizeLife({
        conversationId,
        transcript,
        timezone: systemTimeZone(),
        plan,
      });
      const sync = await saveLifePlan(result.plan);
      onPlan(result.plan);
      setQuestion(result.clarificationQuestion ?? undefined);
      changeText("");
      setMessage(sync === "synced"
        ? "Saved and synced to your account."
        : sync === "pending"
          ? "Saved on this device. Account sync is pending."
          : "Saved on this device.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not organize this update. Your words are still here.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card variant="ink">
      <View style={{ gap: 8 }}>
        <Text variant="eyebrow" style={{ color: palette.mint }}>Talk it through</Text>
        <Text variant="heading" style={{ color: "#FFFFFF" }}>
          {question ?? "What are you working toward?"}
        </Text>
        <Text style={{ color: "#B9CCC5" }}>
          Tell me what you are working toward and what needs doing. Mention urgency, roughly how long something takes, or a deadline if you know. It is okay to leave details out.
        </Text>
      </View>
      {user ? (
        <>
          <TaskVoice
            startLabel={question ? "Answer by voice" : "Tell me what is on your mind"}
            listeningHint="Speak naturally. Tap Finish when you are done."
            onTranscript={(part) => changeText(`${textRef.current} ${part}`.trim())}
            onComplete={() => void submit()}
          />
          <TextInput
            accessibilityLabel="Life update"
            multiline
            editable={!busy}
            value={text}
            onChangeText={changeText}
            placeholder={question ? "Answer the question, or add a correction..." : "Type instead..."}
            placeholderTextColor="#8FA29C"
            style={{
              minHeight: 92,
              borderWidth: 1,
              borderColor: dark ? palette.darkLine : "#49665F",
              borderRadius: 16,
              padding: 14,
              color: "#FFFFFF",
              textAlignVertical: "top",
            }}
          />
          <Button label={busy ? "Organizing..." : "Organize and save"} disabled={busy || !text.trim()} onPress={() => void submit()} />
        </>
      ) : (
        <View style={{ gap: 10 }}>
          <Text style={{ color: "#D7E4DF" }}>Sign in before speaking so private reasoning can organize and save your plan.</Text>
          <Button label="Sign in to plan" icon="log-in-outline" variant="secondary" onPress={() => router.push("/auth")} />
        </View>
      )}
      {!!message && <Text accessibilityRole="alert" style={{ color: message.startsWith("Saved") ? palette.mint : "#FFB5C4" }}>{message}</Text>}
    </Card>
  );
}
