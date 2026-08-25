const $ = (selector) => document.querySelector(selector);
const DEFAULT_API = "https://learnwithpet.onrender.com";
const DEFAULT_WEB = "https://learn-with-pet.vercel.app";

function send(message) {
  return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
}

function status(message, isError = false) {
  const target = $("#status");
  target.textContent = message;
  target.classList.toggle("error", isError);
}

function show(view) {
  $("#login-view").hidden = view !== "login";
  $("#companion-view").hidden = view !== "companion";
}

async function refreshPlan() {
  status("Burumaru is checking today’s plan…");
  const result = await send({ type: "CHECK_PLAN" });
  if (!result.ok) throw new Error(result.error);
  const { plan } = result;
  $("#plan-title").textContent = plan.dueCards
    ? `${plan.dueCards} word${plan.dueCards === 1 ? "" : "s"} are ready.`
    : "Your queue is all clear.";
  $("#plan-detail").textContent = plan.dueCards
    ? `A calm ${plan.estimatedMinutes ?? 5}-minute review is ready when you are.`
    : "Burumaru will bring words back when they are due.";
  status("");
}

async function initialize() {
  const result = await send({ type: "GET_STATE" });
  const { settings, authenticated, user } = result;
  $("#api-url").value = settings.apiUrl || DEFAULT_API;
  $("#web-url").value = settings.webUrl || DEFAULT_WEB;
  $("#reminders-enabled").checked = settings.remindersEnabled;
  $("#reminder-minutes").value = String(settings.reminderMinutes);
  if (!authenticated) { show("login"); status("Connect your VocaPet account to enable reminders."); return; }
  show("companion");
  $("#user-name").textContent = user?.name ? `Connected as ${user.name}` : "Connected";
  try { await refreshPlan(); } catch (error) { status(error.message, true); }
}

$("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  status("Connecting your companion…");
  const result = await send({ type: "LOGIN", email: $("#email").value, password: $("#password").value, apiUrl: $("#api-url").value, webUrl: $("#web-url").value });
  if (!result.ok) { status(result.error, true); return; }
  await initialize();
});

$("#start-plan").addEventListener("click", () => send({ type: "OPEN_PLAN" }));
$("#logout").addEventListener("click", async () => { await send({ type: "LOGOUT" }); await initialize(); });

for (const input of [$("#reminders-enabled"), $("#reminder-minutes")]) {
  input.addEventListener("change", async () => {
    const result = await send({ type: "SAVE_SETTINGS", settings: { remindersEnabled: $("#reminders-enabled").checked, reminderMinutes: Number($("#reminder-minutes").value) } });
    status(result.ok ? "Reminder settings saved." : result.error, !result.ok);
  });
}

initialize();
