export const defaultSessionTimeoutMinutes = 30;

const controlCharacters = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const repeatedWhitespace = /\s+/g;

export function sanitizeText(value, options = {}) {
  const {
    maxLength = 250,
    uppercase = false,
  } = options;

  const text = String(value ?? "")
    .replace(controlCharacters, "")
    .replace(repeatedWhitespace, " ")
    .trim();
  const clippedText = text.slice(0, maxLength);

  return uppercase ? clippedText.toUpperCase() : clippedText;
}

export function normalizeEmail(value) {
  return sanitizeText(value, { maxLength: 254 }).toLowerCase();
}

export function isStrongPassword(value) {
  const password = String(value || "");

  return (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password)
  );
}

export function sanitizeRecordPayload(record, schema = {}) {
  return Object.entries(record || {}).reduce((payload, [key, value]) => {
    if (typeof value !== "string") {
      payload[key] = value;
      return payload;
    }

    payload[key] = sanitizeText(value, schema[key]);
    return payload;
  }, {});
}
