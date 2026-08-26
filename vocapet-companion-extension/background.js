const DEFAULT_SETTINGS = {
  apiUrl: "https://learnwithpet.onrender.com",
  webUrl: "https://learn-with-pet.vercel.app",
  reminderMinutes: 30,
  remindersEnabled: true,
};

const REMINDER_ALARM = "vocapet-study-reminder";
const INTERACTION_COOLDOWNS = {
  greeting: 1000 * 60 * 60 * 2,
  focusBreak: 1000 * 60 * 25,
};

async function readState() {
  const stored = await chrome.storage.local.get(["token", "refreshToken", "user", "settings"]);
  return { ...stored, settings: { ...DEFAULT_SETTINGS, ...stored.settings } };
}

async function saveSettings(settings) {
  const next = { ...DEFAULT_SETTINGS, ...settings };
  await chrome.storage.local.set({ settings: next });
  await scheduleReminder(next);
  return next;
}

async function scheduleReminder(settings) {
  await chrome.alarms.clear(REMINDER_ALARM);
  if (!settings.remindersEnabled) return;
  chrome.alarms.create(REMINDER_ALARM, {
    delayInMinutes: Math.max(1, settings.reminderMinutes),
    periodInMinutes: Math.max(1, settings.reminderMinutes),
  });
}

async function refreshAccessToken(settings, refreshToken) {
  if (!refreshToken) return null;
  const response = await fetch(`${settings.apiUrl.replace(/\/$/, "")}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) return null;
  const auth = await response.json();
  await chrome.storage.local.set({
    token: auth.token,
    refreshToken: auth.refreshToken ?? refreshToken,
    user: { name: auth.name, email: auth.email },
  });
  return auth.token;
}

async function api(path, options = {}, retried = false) {
  const { token, refreshToken, settings } = await readState();
  if (!token) throw new Error("Please sign in to VocaPet first.");

  const response = await fetch(`${settings.apiUrl.replace(/\/$/, "")}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  if (response.status === 401 && !retried) {
    const refreshedToken = await refreshAccessToken(settings, refreshToken);
    if (refreshedToken) return api(path, options, true);
    await chrome.storage.local.remove(["token", "refreshToken", "user"]);
    await broadcastPetAuthState(false);
    throw new Error("Your VocaPet session expired. Please sign in again.");
  }
  if (!response.ok) throw new Error(`VocaPet could not check your plan (${response.status}).`);
  return response.status === 204 ? null : response.json();
}

async function checkStudyPlan({ notify = false } = {}) {
  const plan = await api("/api/study-sessions/plan");
  if (notify && plan.dueCards > 0) {
    const deliveredInTab = await deliverReminderToActiveTab(plan);
    if (deliveredInTab) return plan;
    const wordHint = plan.dueReasons?.flatMap((reason) => reason.words ?? []).slice(0, 2).join(", ");
    await chrome.notifications.create("vocapet-due", {
      type: "basic",
      iconUrl: "icon.svg",
      title: `${plan.dueCards} word${plan.dueCards === 1 ? "" : "s"} are ready`,
      message: wordHint
        ? `Burumaru kept ${wordHint} ready for a calm ${plan.estimatedMinutes ?? 5}-minute review.`
        : `Burumaru prepared a calm ${plan.estimatedMinutes ?? 5}-minute review for you.`,
      buttons: [{ title: "Start today's plan" }],
      priority: 1,
    });
  }
  return plan;
}

async function deliverReminderToActiveTab(plan) {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id || !/^https?:/.test(tab.url ?? "")) return false;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "SHOW_REMINDER", plan });
    return true;
  } catch {
    // Restricted pages do not allow content scripts, so use a native fallback.
    return false;
  }
}

async function openPlan() {
  const { settings } = await readState();
  await chrome.tabs.create({ url: `${settings.webUrl.replace(/\/$/, "")}/app/plan` });
}

async function broadcastPetAuthState(authenticated) {
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs
    .filter((tab) => tab.id && /^https?:/.test(tab.url ?? ""))
    .map((tab) => chrome.tabs.sendMessage(tab.id, { type: "AUTH_CHANGED", authenticated }).catch(() => undefined)));
}

chrome.runtime.onInstalled.addListener(async () => {
  const { settings } = await readState();
  await saveSettings(settings);
});

chrome.runtime.onStartup.addListener(async () => {
  const { settings } = await readState();
  await scheduleReminder(settings);
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== REMINDER_ALARM) return;
  try {
    await checkStudyPlan({ notify: true });
  } catch (error) {
    // A background reminder should fail quietly; the popup shows a clear error.
    console.warn("VocaPet reminder skipped", error);
  }
});

chrome.notifications.onButtonClicked.addListener(async (notificationId) => {
  if (notificationId === "vocapet-due") await openPlan();
});

chrome.notifications.onClicked.addListener(async (notificationId) => {
  if (notificationId === "vocapet-due") await openPlan();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message.type === "LOGIN") {
      const apiUrl = message.apiUrl.replace(/\/$/, "");
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: message.email, password: message.password }),
      });
      if (!response.ok) throw new Error("Email or password is incorrect.");
      const auth = await response.json();
      const settings = await saveSettings({ ...(await readState()).settings, apiUrl: message.apiUrl, webUrl: message.webUrl });
      await chrome.storage.local.set({ token: auth.token, refreshToken: auth.refreshToken, user: { name: auth.name, email: auth.email }, settings });
      await broadcastPetAuthState(true);
      sendResponse({ ok: true, user: auth });
      return;
    }
    if (message.type === "LOGOUT") {
      await chrome.storage.local.remove(["token", "refreshToken", "user"]);
      await broadcastPetAuthState(false);
      sendResponse({ ok: true });
      return;
    }
    if (message.type === "SAVE_SETTINGS") {
      const current = await readState();
      const settings = await saveSettings({ ...current.settings, ...message.settings });
      sendResponse({ ok: true, settings });
      return;
    }
    if (message.type === "GET_STATE") {
      const state = await readState();
      // Content scripts only need the account state, never the JWT itself.
      sendResponse({ ok: true, authenticated: Boolean(state.token), user: state.user, settings: state.settings });
      return;
    }
    if (message.type === "CLAIM_INTERACTION") {
      const cooldown = INTERACTION_COOLDOWNS[message.kind] ?? INTERACTION_COOLDOWNS.focusBreak;
      const state = await readState();
      const key = `lastInteraction:${message.kind}`;
      const stored = await chrome.storage.local.get(key);
      const now = Date.now();
      const allowed = Boolean(state.token) && now - (stored[key] ?? 0) >= cooldown;
      if (allowed) await chrome.storage.local.set({ [key]: now });
      sendResponse({ ok: true, allowed });
      return;
    }
    if (message.type === "CHECK_PLAN") {
      const plan = await checkStudyPlan();
      sendResponse({ ok: true, plan });
      return;
    }
    if (message.type === "GET_QUIZ") {
      const quiz = await api("/api/quiz/random");
      sendResponse({ ok: true, quiz });
      return;
    }
    if (message.type === "ANSWER_QUIZ") {
      const answer = await api("/api/quiz/answer", {
        method: "POST",
        body: JSON.stringify({ vocabularyId: message.vocabularyId, answer: message.answer }),
      });
      // The result is already persisted by the shared quiz endpoint. Refresh
      // the user-scoped plan here so the next popup and web dashboard reflect
      // the same FSRS schedule immediately.
      let plan = null;
      try { plan = await checkStudyPlan(); } catch { /* the answer remains valid */ }
      await chrome.storage.local.set({ lastQuizResult: { answer, at: Date.now() } });
      sendResponse({ ok: true, answer, plan });
      return;
    }
    if (message.type === "OPEN_PLAN") {
      await openPlan();
      sendResponse({ ok: true });
    }
  })().catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});
