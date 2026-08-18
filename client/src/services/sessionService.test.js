import assert from "node:assert/strict";
import test from "node:test";

import {
  clearSession,
  getAccessToken,
  getSessionUser,
  saveSession,
} from "./sessionService.js";

function withStorage(storage, callback) {
  const previousStorage = globalThis.sessionStorage;
  const previousWindow = globalThis.window;
  globalThis.sessionStorage = storage;
  globalThis.window = { atob: () => "{}" };

  try {
    return callback();
  } finally {
    clearSession();
    globalThis.sessionStorage = previousStorage;
    globalThis.window = previousWindow;
  }
}

test("backend sessions remain usable when sessionStorage is blocked", () => {
  const blockedStorage = {
    getItem() { throw new Error("storage blocked"); },
    setItem() { throw new Error("storage blocked"); },
    removeItem() { throw new Error("storage blocked"); },
  };

  withStorage(blockedStorage, () => {
    saveSession({ accessToken: "access-token", user: { id: "user-1" } });

    assert.equal(getAccessToken(), "access-token");
    assert.deepEqual(getSessionUser(), { id: "user-1" });

    clearSession();
    assert.equal(getAccessToken(), null);
    assert.equal(getSessionUser(), null);
  });
});

test("backend sessions use browser storage when it is available", () => {
  const values = new Map();
  const storage = {
    getItem(key) { return values.get(key) || null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };

  withStorage(storage, () => {
    saveSession({ accessToken: "stored-token", user: { id: "user-2" } });

    assert.equal(values.get("mrs-access-token"), "stored-token");
    assert.deepEqual(getSessionUser(), { id: "user-2" });
  });
});
