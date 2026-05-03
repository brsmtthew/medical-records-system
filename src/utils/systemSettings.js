export const settingsStorageKey = "mrs-settings";

export const defaultSystemSettings = {
  defaultReportFilter: "all",
  reportExportFileName: "chart-activity-report",
  appearanceMode: "dark",
  lightComfortMode: "normal",
  sessionTimeoutMinutes: 30,
  themeDefaultVersion: "dark-default-2026-05-03",
};

export function readSystemSettings() {
  try {
    const storedSettings = localStorage.getItem(settingsStorageKey);
    if (!storedSettings) return defaultSystemSettings;
    const parsedSettings = JSON.parse(storedSettings);
    const mergedSettings = Object.keys(defaultSystemSettings).reduce((settings, key) => ({
      ...settings,
      [key]: parsedSettings[key] ?? defaultSystemSettings[key],
    }), {});

    if (parsedSettings.themeDefaultVersion !== defaultSystemSettings.themeDefaultVersion) {
      return {
        ...mergedSettings,
        appearanceMode: defaultSystemSettings.appearanceMode,
        lightComfortMode: defaultSystemSettings.lightComfortMode,
        themeDefaultVersion: defaultSystemSettings.themeDefaultVersion,
      };
    }

    return mergedSettings;
  } catch {
    return defaultSystemSettings;
  }
}

export function saveSystemSettings(settings) {
  const cleanedSettings = Object.keys(defaultSystemSettings).reduce((values, key) => ({
    ...values,
    [key]: settings[key] ?? defaultSystemSettings[key],
  }), {});

  localStorage.setItem(settingsStorageKey, JSON.stringify(cleanedSettings));
}
