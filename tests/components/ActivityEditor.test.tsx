// Verifies that review fields emit complete activity edits.
import { fireEvent, render } from "@testing-library/react-native";
import { ActivityEditor } from "@/components/ActivityEditor";
import { defaultPreferences, sampleActivities } from "@/data/sample";

describe("ActivityEditor", () => {
  it("updates text and structured category fields", () => {
    const onChange = jest.fn();
    const { getByLabelText, getByText } = render(
      <ActivityEditor
        entry={sampleActivities[0]}
        preferences={defaultPreferences}
        onChange={onChange}
      />
    );

    fireEvent.changeText(getByLabelText("Activity title"), "Planning");
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ title: "Planning", needsReview: true }));

    fireEvent.press(getByText("exercise"));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ primaryCategory: "exercise", needsReview: true }));
  });
});
