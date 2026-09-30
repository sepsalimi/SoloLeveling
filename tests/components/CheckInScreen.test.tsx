// Verifies the text check-in path reaches extraction and preserves the review draft.
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import CheckInScreen from "../../app/(tabs)/check-in";

const mockReplaceDraft = jest.fn();
const mockProcessTextCheckIn = jest.fn();
const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  router: { push: mockPush }
}));

jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native");
  const chain = () => ({
    duration() { return this; },
    delay() { return this; },
    springify() { return this; },
    damping() { return this; }
  });
  return {
    __esModule: true,
    default: { View },
    FadeInUp: chain(),
    FadeInDown: chain()
  };
});

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light" }
}));

jest.mock("expo-audio", () => ({
  AudioModule: { requestRecordingPermissionsAsync: jest.fn() },
  RecordingPresets: { HIGH_QUALITY: {} },
  setAudioModeAsync: jest.fn(),
  useAudioRecorder: () => ({
    prepareToRecordAsync: jest.fn(),
    record: jest.fn(),
    pause: jest.fn(),
    stop: jest.fn(),
    uri: null
  }),
  useAudioRecorderState: () => ({ durationMillis: 0, isRecording: false, url: null })
}));

jest.mock("@/context/AppState", () => ({
  useAppState: () => ({
    user: { id: "user-1" },
    localMode: true,
    preferences: {
      afternoonReminderTime: "14:00",
      eveningReminderTime: "20:30",
      reminderDays: [1, 2, 3, 4, 5],
      efficiencyEnabled: true,
      moodEnabled: true,
      retainAudio: false,
      notificationsEnabled: false,
      onboardingCompleted: true
    }
  })
}));

jest.mock("@/context/CheckInDraft", () => ({
  useCheckInDraft: () => ({
    draft: {
      userId: "user-1",
      sessionId: "session-1",
      transcripts: [],
      entries: [],
      unresolvedIssues: [],
      transcriptRetentionNotices: []
    },
    replaceDraft: mockReplaceDraft
  })
}));

jest.mock("@/services/checkInService", () => ({
  ensureDraft: jest.fn(async (_userId: string, draft: unknown) => draft),
  processTextCheckIn: (...args: unknown[]) => mockProcessTextCheckIn(...args),
  processVoiceCheckIn: jest.fn()
}));

describe("CheckInScreen", () => {
  it("processes typed text and opens review", async () => {
    mockProcessTextCheckIn.mockResolvedValue({
      userId: "user-1",
      sessionId: "session-1",
      transcripts: ["Worked for one hour"],
      entries: [],
      unresolvedIssues: [],
      transcriptRetentionNotices: []
    });

    const { getByLabelText, getByText } = render(<CheckInScreen />);
    fireEvent.changeText(getByLabelText("Check-in text"), "Worked for one hour");
    fireEvent.press(getByText("Shape my timeline"));

    await waitFor(() => expect(mockProcessTextCheckIn).toHaveBeenCalledWith(expect.anything(), "Worked for one hour"));
    await waitFor(() =>
      expect(mockReplaceDraft).toHaveBeenCalledWith(expect.objectContaining({ transcripts: ["Worked for one hour"] }))
    );
  });
});
