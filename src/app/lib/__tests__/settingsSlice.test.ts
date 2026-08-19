import settingsReducer, {
  changeSettings,
  DEFAULT_TEMPLATE,
  initialSettings,
  type TemplateType,
} from "lib/redux/settingsSlice";

describe("settingsSlice", () => {
  it("initializes with default template", () => {
    expect(initialSettings.template).toBe(DEFAULT_TEMPLATE);
    expect(initialSettings.template).toBe("modern");
  });

  it("updates template via changeSettings", () => {
    const templates: TemplateType[] = [
      "classic",
      "executive",
      "minimal",
      "compact",
      "modern",
    ];

    let state = initialSettings;
    for (const template of templates) {
      state = settingsReducer(
        state,
        changeSettings({ field: "template", value: template })
      );
      expect(state.template).toBe(template);
    }
  });
});
