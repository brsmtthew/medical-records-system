export const settingsStorageKey = "mrs-settings";

export const defaultSystemSettings = {
  defaultReportFilter: "all",
  reportExportFileName: "chart-activity-report",
  appearanceMode: "dark",
  lightComfortMode: "normal",
  sessionTimeoutMinutes: 10,
  themeDefaultVersion: "dark-default-2026-05-03",
};

// Reads saved workstation settings and refreshes theme defaults when the version changes.
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

// Saves only supported workstation setting keys into local storage.
export function saveSystemSettings(settings) {
  const cleanedSettings = Object.keys(defaultSystemSettings).reduce((values, key) => ({
    ...values,
    [key]: settings[key] ?? defaultSystemSettings[key],
  }), {});

  localStorage.setItem(settingsStorageKey, JSON.stringify(cleanedSettings));
}

// Applies workstation theme classes consistently across app startup, navbar, and settings.
export function applySystemTheme(settings = readSystemSettings()) {
  const isDarkMode = settings.appearanceMode === "dark";
  const isComfortMode = settings.lightComfortMode === "soft";

  document.documentElement.classList.toggle("dark", isDarkMode);
  document.documentElement.classList.toggle("soft-light", isComfortMode);
}
