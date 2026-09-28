const DEFAULTS = {
  enabled: true,
  archived: true,
  sound: true,
  showPreview: true,
  duration: 10,
  desktopFallback: false,
  checkIntervalSeconds: 8,
  repeatReminders: true,
  repeatReminderMinutes: 5,
  snoozeMinutes: 15
};

const EDITABLE_IDS = [
  "enabled",
  "archived",
  "sound",
  "showPreview",
  "desktopFallback",
  "checkIntervalSeconds",
  "repeatReminders",
  "repeatReminderMinutes",
  "snoozeMinutes"
];

let saveTimer;

function clamp(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function refreshReminderState() {
  const enabled = Boolean(document.getElementById("repeatReminders")?.checked);
  for (const row of document.querySelectorAll(".reminder-dependent")) {
    row.classList.toggle("field-disabled", !enabled);
    for (const input of row.querySelectorAll("input")) input.disabled = !enabled;
  }
}

async function load() {
  const data = await chrome.storage.sync.get(DEFAULTS);
  for (const id of EDITABLE_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (el.type === "checkbox") el.checked = Boolean(data[id]);
    else el.value = data[id];
  }
  refreshReminderState();
}

async function save() {
  const data = {};
  for (const id of EDITABLE_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    data[id] = el.type === "checkbox" ? el.checked : Number(el.value);
  }

  data.duration = 10;
  data.checkIntervalSeconds = clamp(data.checkIntervalSeconds, 5, 300, DEFAULTS.checkIntervalSeconds);
  data.repeatReminderMinutes = clamp(data.repeatReminderMinutes, 1, 1440, DEFAULTS.repeatReminderMinutes);
  data.snoozeMinutes = clamp(data.snoozeMinutes, 1, 1440, DEFAULTS.snoozeMinutes);

  document.getElementById("checkIntervalSeconds").value = data.checkIntervalSeconds;
  document.getElementById("repeatReminderMinutes").value = data.repeatReminderMinutes;
  document.getElementById("snoozeMinutes").value = data.snoozeMinutes;

  await chrome.storage.sync.set(data);
  refreshReminderState();

  const savedEl = document.getElementById("saved");
  if (!savedEl) return;
  savedEl.classList.add("show");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => savedEl.classList.remove("show"), 1000);
}

document.addEventListener("change", save);
document.getElementById("repeatReminders")?.addEventListener("change", refreshReminderState);
load();
