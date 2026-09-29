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
  snoozeMinutes: 15,
  quietHoursEnabled: false,
  quietStart: "22:00",
  quietEnd: "07:00",
  conversationRules: []
};

const PENDING_KEY = "waPendingAlertsV2";
const ACK_KEY = "waAcknowledgedAlertsV2";
const NOTIFICATION_MAP_KEY = "waDesktopNotificationMapV2";
const DIAG_KEY = "waDiagnosticsV1";
const ACK_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PENDING = 200;
const MAX_ACKS = 300;
const MAX_RULES = 30;
const REMINDER_ALARM = "wa-reminder-tick";
const ARCHIVE_ALARM = "wa-passive-scan";
const LEGACY_ARCHIVE_ALARM = "wa-archive-poll";
let stateQueue = Promise.resolve();

function serial(task) {
  const run = stateQueue.then(task, task);
  stateQueue = run.catch(() => {});
  return run;
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function normalize(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function lower(value = "") {
  return normalize(value).toLocaleLowerCase("pt-BR");
}

function hashText(value = "") {
  let hash = 2166136261;
  const text = String(value);
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function normalizeTime(value, fallback) {
  const text = String(value || "");
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text) ? text : fallback;
}

function normalizeRules(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of value) {
    const title = normalize(raw?.title || "").slice(0, 120);
    const key = lower(title);
    if (!key || seen.has(key)) continue;
    const repeatRaw = raw?.repeatMinutes;
    const repeatMinutes = repeatRaw === null || repeatRaw === undefined || repeatRaw === ""
      ? null
      : clampNumber(repeatRaw, 0, 1440, null);
    out.push({
      id: normalize(raw?.id || hashText(`${key}-${out.length}`)).slice(0, 40),
      title,
      repeatMinutes,
      allowDuringQuiet: Boolean(raw?.allowDuringQuiet)
    });
    seen.add(key);
    if (out.length >= MAX_RULES) break;
  }
  return out;
}

async function getSettings() {
  const data = await chrome.storage.sync.get(DEFAULTS);
  return {
    ...DEFAULTS,
    ...data,
    checkIntervalSeconds: clampNumber(data.checkIntervalSeconds, 5, 300, DEFAULTS.checkIntervalSeconds),
    repeatReminderMinutes: clampNumber(data.repeatReminderMinutes, 1, 1440, DEFAULTS.repeatReminderMinutes),
    snoozeMinutes: clampNumber(data.snoozeMinutes, 1, 1440, DEFAULTS.snoozeMinutes),
    quietStart: normalizeTime(data.quietStart, DEFAULTS.quietStart),
    quietEnd: normalizeTime(data.quietEnd, DEFAULTS.quietEnd),
    conversationRules: normalizeRules(data.conversationRules)
  };
}

function minutesOfDay(value) {
  const [h, m] = normalizeTime(value, "00:00").split(":").map(Number);
  return h * 60 + m;
}

function quietState(settings, now = new Date()) {
  if (!settings.quietHoursEnabled) return { active: false, endAt: null };
  const start = minutesOfDay(settings.quietStart);
  const end = minutesOfDay(settings.quietEnd);
  const current = now.getHours() * 60 + now.getMinutes();
  if (start === end) return { active: false, endAt: null };

  const crossesMidnight = start > end;
  const active = crossesMidnight ? (current >= start || current < end) : (current >= start && current < end);
  if (!active) return { active: false, endAt: null };

  const endDate = new Date(now);
  endDate.setSeconds(0, 0);
  endDate.setHours(Math.floor(end / 60), end % 60, 0, 0);
  if (crossesMidnight && current >= start) endDate.setDate(endDate.getDate() + 1);
  if (!crossesMidnight && endDate.getTime() <= now.getTime()) endDate.setDate(endDate.getDate() + 1);
  return { active: true, endAt: endDate.getTime() };
}

function matchingRule(settings, data = {}) {
  const title = lower(data.chatTitle || data.title || "");
  if (!title) return null;
  return settings.conversationRules.find(rule => lower(rule.title) === title) || null;
}

function reminderPolicy(settings, data = {}) {
  const rule = matchingRule(settings, data);
  if (rule && rule.repeatMinutes !== null) {
    return {
      repeatEnabled: Number(rule.repeatMinutes) > 0,
      repeatMinutes: Math.max(1, Number(rule.repeatMinutes) || 1),
      allowDuringQuiet: Boolean(rule.allowDuringQuiet),
      ruleTitle: rule.title
    };
  }
  return {
    repeatEnabled: Boolean(settings.repeatReminders),
    repeatMinutes: Math.max(1, Number(settings.repeatReminderMinutes) || DEFAULTS.repeatReminderMinutes),
    allowDuringQuiet: Boolean(rule?.allowDuringQuiet),
    ruleTitle: rule?.title || ""
  };
}

function shouldSuppressForQuiet(settings, data = {}) {
  const policy = reminderPolicy(settings, data);
  const quiet = quietState(settings);
  return { suppress: quiet.active && !policy.allowDuringQuiet, quiet, policy };
}

async function updateDiagnostics(patch = {}) {
  try {
    const stored = await chrome.storage.local.get(DIAG_KEY);
    const current = stored[DIAG_KEY] && typeof stored[DIAG_KEY] === "object" ? stored[DIAG_KEY] : {};
    await chrome.storage.local.set({ [DIAG_KEY]: { ...current, ...patch } });
  } catch (_) {}
}

async function getDiagnostics() {
  const stored = await chrome.storage.local.get(DIAG_KEY);
  return stored[DIAG_KEY] && typeof stored[DIAG_KEY] === "object" ? stored[DIAG_KEY] : {};
}

async function updateBadge(map = null) {
  try {
    const pending = map || await getPendingMap();
    const count = Object.keys(pending).length;
    await chrome.action.setBadgeText({ text: count ? (count > 99 ? "99+" : String(count)) : "" });
    await chrome.action.setBadgeBackgroundColor({ color: "#25D366" });
    await chrome.action.setBadgeTextColor?.({ color: "#062713" });
  } catch (_) {}
}

async function ensureAlarms(settings = null) {
  const current = settings || await getSettings();
  try { await chrome.alarms.create(REMINDER_ALARM, { periodInMinutes: 0.5 }); } catch (_) {}
  try {
    const archivePeriod = Math.max(0.5, current.checkIntervalSeconds / 60);
    await chrome.alarms.create(ARCHIVE_ALARM, { periodInMinutes: archivePeriod });
  } catch (_) {}
}

chrome.runtime.onInstalled.addListener(async () => {
  try { await chrome.alarms.clear(LEGACY_ARCHIVE_ALARM); } catch (_) {}
  const current = await chrome.storage.sync.get(DEFAULTS);
  const merged = { ...DEFAULTS, ...current, conversationRules: normalizeRules(current.conversationRules) };
  await chrome.storage.sync.set(merged);
  try { await chrome.storage.local.remove("waRecentMessageFingerprints"); } catch (_) {}
  await ensureAlarms(merged);
  await updateBadge();
  await updateDiagnostics({ extensionStartedAt: Date.now(), extensionVersion: chrome.runtime.getManifest().version });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.clear(LEGACY_ARCHIVE_ALARM).catch(() => {});
  ensureAlarms().catch(() => {});
  updateBadge().catch(() => {});
  updateDiagnostics({ extensionStartedAt: Date.now(), extensionVersion: chrome.runtime.getManifest().version }).catch(() => {});
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") return;
  if (changes.checkIntervalSeconds) ensureAlarms().catch(() => {});
  if (changes.repeatReminders || changes.repeatReminderMinutes || changes.quietHoursEnabled || changes.quietStart || changes.quietEnd || changes.conversationRules) {
    serial(reschedulePendingReminders).catch(() => {});
  }
});

function buildConversationKey(data = {}) {
  const title = lower(data.chatTitle || data.title || "");
  const prefix = data.archived ? "A" : "N";
  if (title) return `${prefix}:${title}`;
  const fallback = normalize(data.fingerprint || data.messageTime || data.receivedAt || "generic");
  return `${prefix}:__generic__:${fallback.slice(0, 180)}`;
}

function buildStableSignature(data = {}) {
  const reasonClass = data.notifyReason === "state-became-unread" ? "manual-unread" : "message";
  const material = [
    data.archived ? "A" : "N",
    lower(data.chatTitle || data.title || ""),
    lower(data.preview || ""),
    normalize(data.messageTime || ""),
    String(Number(data.unreadCount || 0)),
    reasonClass
  ].join("|");
  return hashText(material);
}

async function getPendingMap() {
  const stored = await chrome.storage.local.get(PENDING_KEY);
  const value = stored[PENDING_KEY];
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

async function setPendingMap(map) {
  const entries = Object.entries(map)
    .filter(([, item]) => item && typeof item === "object")
    .sort((a, b) => Number(a[1].firstSeenAt || 0) - Number(b[1].firstSeenAt || 0));
  const trimmedMap = Object.fromEntries(entries.slice(-MAX_PENDING));
  await chrome.storage.local.set({ [PENDING_KEY]: trimmedMap });
  await updateBadge(trimmedMap);
}

async function getAckMap() {
  const now = Date.now();
  const stored = await chrome.storage.local.get(ACK_KEY);
  const raw = stored[ACK_KEY];
  const map = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  let changed = false;
  for (const [key, item] of Object.entries(map)) {
    if (!item || !Number.isFinite(Number(item.at)) || now - Number(item.at) > ACK_TTL_MS) {
      delete map[key];
      changed = true;
    }
  }
  if (changed) await chrome.storage.local.set({ [ACK_KEY]: map });
  return map;
}

async function setAck(map, key, signature) {
  const now = Date.now();
  map[key] = { signature, at: now };
  const trimmed = Object.entries(map)
    .sort((a, b) => Number(a[1]?.at || 0) - Number(b[1]?.at || 0))
    .slice(-MAX_ACKS);
  await chrome.storage.local.set({ [ACK_KEY]: Object.fromEntries(trimmed) });
}

async function findWhatsAppTab() {
  const tabs = await chrome.tabs.query({ url: "https://web.whatsapp.com/*" });
  return tabs[0] || null;
}

async function focusWhatsApp(chatTitle) {
  const tab = await findWhatsAppTab();
  if (!tab) {
    await chrome.tabs.create({ url: "https://web.whatsapp.com/" });
    return;
  }
  await chrome.tabs.update(tab.id, { active: true });
  if (tab.windowId) await chrome.windows.update(tab.windowId, { focused: true });
  if (chatTitle) {
    try { await chrome.tabs.sendMessage(tab.id, { type: "OPEN_CHAT_BY_TITLE", title: chatTitle }); } catch (_) {}
  }
}

async function rememberDesktopNotification(notificationId, payload) {
  try {
    const stored = await chrome.storage.local.get(NOTIFICATION_MAP_KEY);
    const map = stored[NOTIFICATION_MAP_KEY] && typeof stored[NOTIFICATION_MAP_KEY] === "object" ? stored[NOTIFICATION_MAP_KEY] : {};
    map[notificationId] = {
      alertKey: payload.alertKey || "",
      signature: payload.alertSignature || "",
      chatTitle: payload.chatTitle || payload.title || "",
      createdAt: Date.now()
    };
    for (const [id, item] of Object.entries(map)) {
      if (!item || Date.now() - Number(item.createdAt || 0) > 24 * 60 * 60 * 1000) delete map[id];
    }
    await chrome.storage.local.set({ [NOTIFICATION_MAP_KEY]: map });
  } catch (_) {}
}

async function getDesktopNotificationTarget(notificationId, remove = false) {
  const stored = await chrome.storage.local.get(NOTIFICATION_MAP_KEY);
  const map = stored[NOTIFICATION_MAP_KEY] && typeof stored[NOTIFICATION_MAP_KEY] === "object" ? stored[NOTIFICATION_MAP_KEY] : {};
  const target = map[notificationId] || null;
  if (remove && target) {
    delete map[notificationId];
    await chrome.storage.local.set({ [NOTIFICATION_MAP_KEY]: map });
  }
  return target;
}

async function showDesktopFallback(data, settings) {
  if (!settings.desktopFallback) return false;
  const message = data.archived
    ? "Chegou uma nova mensagem em uma conversa arquivada."
    : (settings.showPreview && data.preview ? data.preview : "Você recebeu uma nova mensagem.");
  try {
    const notificationId = `wa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await chrome.notifications.create(notificationId, {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: data.isReminder ? `Lembrete — ${data.title || "WhatsApp"}` : (data.title || "Nova mensagem no WhatsApp"),
      message,
      priority: 2,
      requireInteraction: false,
      buttons: [
        { title: `Adiar ${settings.snoozeMinutes} min` },
        { title: "Marcar como lida" }
      ]
    });
    await rememberDesktopNotification(notificationId, data);
    return true;
  } catch (_) {
    return false;
  }
}

function canInjectIntoUrl(url = "") {
  return /^https?:\/\//i.test(url);
}

async function ensureUiInTab(tabId) {
  try { await chrome.scripting.insertCSS({ target: { tabId }, files: ["content-ui.css"] }); } catch (_) {}
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content-ui.js"] });
    return true;
  } catch (_) {
    return false;
  }
}

async function sendToastToTab(tabId, payload) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "SHOW_WHATSAPP_TOAST", payload });
    return true;
  } catch (_) {}
  const injected = await ensureUiInTab(tabId);
  if (!injected) return false;
  try {
    await chrome.tabs.sendMessage(tabId, { type: "SHOW_WHATSAPP_TOAST", payload });
    return true;
  } catch (_) {
    return false;
  }
}

async function dispatchCentralPopup(data, settings = null) {
  const current = settings || await getSettings();
  if (!current.enabled) return false;
  if (data.archived && !current.archived) return false;

  const quietInfo = shouldSuppressForQuiet(current, data);
  if (quietInfo.suppress) return false;

  const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  let delivered = false;
  let method = "none";
  const payload = {
    ...data,
    receivedAt: data.receivedAt || Date.now(),
    preview: current.showPreview ? data.preview : "",
    sound: current.sound,
    duration: current.duration,
    snoozeMinutes: current.snoozeMinutes,
    repeatReminderMinutes: current.repeatReminderMinutes,
    quickSnoozeMinutes: [5, 15, 30, 60]
  };

  if (active?.id && canInjectIntoUrl(active.url || "")) {
    delivered = await sendToastToTab(active.id, payload);
    if (delivered) method = "toast";
  }
  if (!delivered) {
    delivered = await showDesktopFallback(payload, current);
    if (delivered) method = "desktop";
  }
  await updateDiagnostics({ lastDispatchAt: Date.now(), lastDispatchDelivered: delivered, lastDispatchMethod: method });
  return delivered;
}

async function registerIncomingAlert(data) {
  const settings = await getSettings();
  if (!settings.enabled) return { ok: true, duplicate: false, ignored: true };
  if (data.archived && !settings.archived) return { ok: true, duplicate: false, ignored: true };

  const now = Date.now();
  const alertKey = buildConversationKey(data);
  const signature = buildStableSignature(data);
  const pending = await getPendingMap();
  const acks = await getAckMap();
  if (acks[alertKey]?.signature === signature) return { ok: true, duplicate: true, acknowledged: true };
  const existing = pending[alertKey];
  if (existing?.signature === signature) return { ok: true, duplicate: true, pending: true };

  const quietInfo = shouldSuppressForQuiet(settings, data);
  const record = {
    title: normalize(data.title || data.chatTitle || "Nova mensagem"),
    chatTitle: normalize(data.chatTitle || data.title || ""),
    archived: Boolean(data.archived),
    unreadCount: Number(data.unreadCount || 0),
    messageTime: normalize(data.messageTime || ""),
    notifyReason: data.notifyReason || "new-message",
    receivedAt: Number(data.receivedAt || now),
    alertKey,
    signature,
    firstSeenAt: now,
    lastNotifiedAt: quietInfo.suppress ? null : now,
    nextReminderAt: quietInfo.suppress
      ? quietInfo.quiet.endAt
      : (quietInfo.policy.repeatEnabled ? now + quietInfo.policy.repeatMinutes * 60 * 1000 : null),
    repeatEnabled: quietInfo.policy.repeatEnabled,
    repeatMinutes: quietInfo.policy.repeatMinutes,
    ruleTitle: quietInfo.policy.ruleTitle || "",
    allowDuringQuiet: quietInfo.policy.allowDuringQuiet,
    suppressedInitial: quietInfo.suppress,
    muted: false
  };
  pending[alertKey] = record;
  await setPendingMap(pending);
  await updateDiagnostics({ lastIncomingAt: now, lastIncomingArchived: Boolean(data.archived) });

  if (!quietInfo.suppress) {
    await dispatchCentralPopup({
      ...data,
      ...record,
      preview: data.preview || "",
      alertSignature: signature,
      isReminder: false
    }, settings);
  }
  return { ok: true, duplicate: false, quietSuppressed: quietInfo.suppress };
}

function resolvePendingTarget(pending, target = {}) {
  if (target.alertKey && pending[target.alertKey]) return [target.alertKey, pending[target.alertKey]];
  for (const [key, item] of Object.entries(pending)) {
    if (target.signature && item.signature === target.signature) return [key, item];
    if (target.fingerprint && item.fingerprint === target.fingerprint) return [key, item];
  }
  return [null, null];
}

async function scheduleItemFromPolicy(item, settings, fromNow = Date.now()) {
  const policy = reminderPolicy(settings, item);
  item.repeatEnabled = policy.repeatEnabled;
  item.repeatMinutes = policy.repeatMinutes;
  item.ruleTitle = policy.ruleTitle || "";
  item.allowDuringQuiet = policy.allowDuringQuiet;
  const quiet = quietState(settings);
  if (item.suppressedInitial && quiet.active && !policy.allowDuringQuiet) item.nextReminderAt = quiet.endAt;
  else if (item.suppressedInitial) item.nextReminderAt = fromNow;
  else if (policy.repeatEnabled) item.nextReminderAt = fromNow + policy.repeatMinutes * 60 * 1000;
  else item.nextReminderAt = null;
  return item;
}

async function handleAlertAction(action, target = {}) {
  const settings = await getSettings();
  const pending = await getPendingMap();
  const [key, item] = resolvePendingTarget(pending, target);
  if (!key || !item) return { ok: true, missing: true };

  if (action === "snooze") {
    const minutes = clampNumber(target.minutes, 1, 1440, settings.snoozeMinutes);
    item.muted = false;
    item.suppressedInitial = false;
    item.nextReminderAt = Date.now() + minutes * 60 * 1000;
    pending[key] = item;
    await setPendingMap(pending);
    return { ok: true, action, until: item.nextReminderAt, minutes };
  }

  if (action === "mute") {
    item.muted = true;
    item.nextReminderAt = null;
    pending[key] = item;
    await setPendingMap(pending);
    return { ok: true, action };
  }

  if (action === "unmute") {
    item.muted = false;
    await scheduleItemFromPolicy(item, settings);
    pending[key] = item;
    await setPendingMap(pending);
    return { ok: true, action, nextReminderAt: item.nextReminderAt };
  }

  if (action === "read" || action === "open") {
    delete pending[key];
    await setPendingMap(pending);
    const acks = await getAckMap();
    await setAck(acks, key, item.signature);
    return { ok: true, action, item };
  }
  return { ok: false, error: "unknown-action" };
}

async function acknowledgeByTitle(title) {
  const needle = lower(title);
  if (!needle) return 0;
  const pending = await getPendingMap();
  const acks = await getAckMap();
  let count = 0;
  for (const [key, item] of Object.entries(pending)) {
    const itemTitle = lower(item.chatTitle || item.title || "");
    if (itemTitle !== needle) continue;
    delete pending[key];
    acks[key] = { signature: item.signature, at: Date.now() };
    count += 1;
  }
  if (count) {
    await setPendingMap(pending);
    const trimmed = Object.entries(acks)
      .sort((a, b) => Number(a[1]?.at || 0) - Number(b[1]?.at || 0))
      .slice(-MAX_ACKS);
    await chrome.storage.local.set({ [ACK_KEY]: Object.fromEntries(trimmed) });
  }
  return count;
}

async function reschedulePendingReminders() {
  const settings = await getSettings();
  const pending = await getPendingMap();
  const now = Date.now();
  let changed = false;
  for (const item of Object.values(pending)) {
    if (!item || item.muted) continue;
    await scheduleItemFromPolicy(item, settings, now);
    changed = true;
  }
  if (changed) await setPendingMap(pending);
}

async function processDueReminders() {
  const settings = await getSettings();
  if (!settings.enabled) return;
  const now = Date.now();
  const pending = await getPendingMap();
  const due = Object.entries(pending)
    .filter(([, item]) => item && !item.muted && Number(item.nextReminderAt || 0) > 0 && Number(item.nextReminderAt) <= now)
    .sort((a, b) => Number(a[1].nextReminderAt || 0) - Number(b[1].nextReminderAt || 0));
  if (!due.length) return;

  const [key, item] = due[0];
  const policy = reminderPolicy(settings, item);
  const quiet = quietState(settings);
  if (quiet.active && !policy.allowDuringQuiet) {
    item.nextReminderAt = quiet.endAt;
    pending[key] = item;
    await setPendingMap(pending);
    return;
  }

  const delivered = await dispatchCentralPopup({
    ...item,
    notifyReason: item.suppressedInitial ? item.notifyReason : "reminder",
    isReminder: !item.suppressedInitial,
    alertSignature: item.signature
  }, settings);

  if (delivered) {
    item.lastNotifiedAt = now;
    item.suppressedInitial = false;
    item.repeatEnabled = policy.repeatEnabled;
    item.repeatMinutes = policy.repeatMinutes;
    item.allowDuringQuiet = policy.allowDuringQuiet;
    item.ruleTitle = policy.ruleTitle || "";
    item.nextReminderAt = policy.repeatEnabled ? now + policy.repeatMinutes * 60 * 1000 : null;
  } else {
    item.nextReminderAt = now + 30 * 1000;
  }
  pending[key] = item;
  await setPendingMap(pending);
}

function pendingForUi(map) {
  return Object.values(map)
    .filter(Boolean)
    .sort((a, b) => Number(b.firstSeenAt || 0) - Number(a.firstSeenAt || 0))
    .map(item => ({
      alertKey: item.alertKey,
      signature: item.signature,
      title: item.title,
      chatTitle: item.chatTitle,
      archived: Boolean(item.archived),
      unreadCount: Number(item.unreadCount || 0),
      messageTime: item.messageTime || "",
      firstSeenAt: Number(item.firstSeenAt || 0),
      lastNotifiedAt: Number(item.lastNotifiedAt || 0) || null,
      nextReminderAt: Number(item.nextReminderAt || 0) || null,
      muted: Boolean(item.muted),
      suppressedInitial: Boolean(item.suppressedInitial),
      repeatEnabled: Boolean(item.repeatEnabled),
      repeatMinutes: Number(item.repeatMinutes || 0),
      ruleTitle: item.ruleTitle || ""
    }));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== "object") return false;

  if (message.type === "WHATSAPP_NEW_MESSAGE") {
    serial(() => registerIncomingAlert(message.payload || {})).then(sendResponse).catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === "ALERT_ACTION") {
    serial(() => handleAlertAction(message.action, message))
      .then(async result => {
        if (message.action === "open" && result?.item) await focusWhatsApp(result.item.chatTitle || result.item.title || "");
        sendResponse(result);
      })
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === "WHATSAPP_CHAT_OPENED" || message.type === "WHATSAPP_CHAT_READ") {
    serial(() => acknowledgeByTitle(message.title || "")).then(count => sendResponse({ ok: true, count })).catch(() => sendResponse({ ok: false, count: 0 }));
    return true;
  }

  if (message.type === "OPEN_WHATSAPP") {
    (async () => {
      if (message.alertKey || message.fingerprint || message.signature) await serial(() => handleAlertAction("open", message));
      await focusWhatsApp(message.title || "");
      sendResponse({ ok: true });
    })().catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === "OPEN_PENDING_CENTER") {
    chrome.tabs.create({ url: chrome.runtime.getURL("pending.html") }).then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === "GET_PENDING") {
    getPendingMap().then(map => sendResponse({ ok: true, items: pendingForUi(map) })).catch(() => sendResponse({ ok: false, items: [] }));
    return true;
  }

  if (message.type === "GET_STATUS") {
    (async () => {
      const [tab, pending, settings] = await Promise.all([findWhatsAppTab(), getPendingMap(), getSettings()]);
      const values = Object.values(pending);
      const quiet = quietState(settings);
      sendResponse({
        connected: Boolean(tab),
        tabId: tab?.id || null,
        pendingCount: values.length,
        mutedCount: values.filter(item => item?.muted).length,
        quietNow: quiet.active,
        quietEndAt: quiet.endAt,
        ruleCount: settings.conversationRules.length
      });
    })();
    return true;
  }

  if (message.type === "GET_DIAGNOSTICS") {
    (async () => {
      const [tab, pending, settings, diag] = await Promise.all([findWhatsAppTab(), getPendingMap(), getSettings(), getDiagnostics()]);
      const values = Object.values(pending);
      const quiet = quietState(settings);
      const nextReminderAt = values
        .filter(item => !item?.muted && Number(item?.nextReminderAt || 0) > 0)
        .map(item => Number(item.nextReminderAt))
        .sort((a, b) => a - b)[0] || null;
      sendResponse({
        ok: true,
        version: chrome.runtime.getManifest().version,
        connected: Boolean(tab),
        pendingCount: values.length,
        mutedCount: values.filter(item => item?.muted).length,
        nextReminderAt,
        checkIntervalSeconds: settings.checkIntervalSeconds,
        quietHoursEnabled: settings.quietHoursEnabled,
        quietNow: quiet.active,
        quietEndAt: quiet.endAt,
        ruleCount: settings.conversationRules.length,
        ...diag
      });
    })().catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === "MONITOR_HEARTBEAT") {
    updateDiagnostics({
      monitorStartedAt: Number(message.monitorStartedAt || Date.now()),
      lastScanAt: Number(message.lastScanAt || Date.now()),
      lastMonitorHeartbeatAt: Date.now()
    }).then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }));
    return true;
  }
});

chrome.notifications.onClicked.addListener((notificationId) => {
  serial(async () => {
    const target = await getDesktopNotificationTarget(notificationId, true);
    if (target) await handleAlertAction("open", target);
    await focusWhatsApp(target?.chatTitle || "");
  }).catch(() => {});
});

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  serial(async () => {
    const target = await getDesktopNotificationTarget(notificationId, true);
    if (!target) return;
    if (buttonIndex === 0) await handleAlertAction("snooze", target);
    if (buttonIndex === 1) await handleAlertAction("read", target);
    try { await chrome.notifications.clear(notificationId); } catch (_) {}
  }).catch(() => {});
});

chrome.notifications.onClosed.addListener((notificationId) => {
  getDesktopNotificationTarget(notificationId, true).catch(() => {});
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm?.name === REMINDER_ALARM) {
    serial(processDueReminders).catch(() => {});
    return;
  }
  if (alarm?.name !== ARCHIVE_ALARM) return;
  (async () => {
    const settings = await getSettings();
    if (!settings.enabled || !settings.archived) return;
    const tab = await findWhatsAppTab();
    if (!tab?.id) return;
    await updateDiagnostics({ lastPassiveScanRequestAt: Date.now() });
    try { await chrome.tabs.sendMessage(tab.id, { type: "PASSIVE_BACKGROUND_SCAN" }); } catch (_) {}
  })();
});

ensureAlarms().catch(() => {});
updateBadge().catch(() => {});
updateDiagnostics({ extensionStartedAt: Date.now(), extensionVersion: chrome.runtime.getManifest().version }).catch(() => {});
