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

const PENDING_KEY = "waPendingAlertsV2";
const ACK_KEY = "waAcknowledgedAlertsV2";
const NOTIFICATION_MAP_KEY = "waDesktopNotificationMapV2";
const ACK_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PENDING = 200;
const MAX_ACKS = 300;
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

async function getSettings() {
  const data = await chrome.storage.sync.get(DEFAULTS);
  return {
    ...DEFAULTS,
    ...data,
    checkIntervalSeconds: clampNumber(data.checkIntervalSeconds, 5, 300, DEFAULTS.checkIntervalSeconds),
    repeatReminderMinutes: clampNumber(data.repeatReminderMinutes, 1, 1440, DEFAULTS.repeatReminderMinutes),
    snoozeMinutes: clampNumber(data.snoozeMinutes, 1, 1440, DEFAULTS.snoozeMinutes)
  };
}

async function ensureAlarms(settings = null) {
  const current = settings || await getSettings();
  try {
    await chrome.alarms.create(REMINDER_ALARM, { periodInMinutes: 0.5 });
  } catch (_) {}

  try {
    const archivePeriod = Math.max(0.5, current.checkIntervalSeconds / 60);
    await chrome.alarms.create(ARCHIVE_ALARM, { periodInMinutes: archivePeriod });
  } catch (_) {}
}

chrome.runtime.onInstalled.addListener(async () => {
  try { await chrome.alarms.clear(LEGACY_ARCHIVE_ALARM); } catch (_) {}
  const current = await chrome.storage.sync.get(DEFAULTS);
  await chrome.storage.sync.set({ ...DEFAULTS, ...current });
  // A v1.2.x persistia fingerprints contendo trechos de mensagem. A v1.3.x
  // não precisa mais desse histórico e o remove durante a atualização.
  try { await chrome.storage.local.remove("waRecentMessageFingerprints"); } catch (_) {}
  await ensureAlarms();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.clear(LEGACY_ARCHIVE_ALARM).catch(() => {});
  ensureAlarms().catch(() => {});
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") return;
  if (changes.checkIntervalSeconds) ensureAlarms().catch(() => {});
  if (changes.repeatReminders || changes.repeatReminderMinutes) {
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
  const trimmed = entries.slice(-MAX_PENDING);
  await chrome.storage.local.set({ [PENDING_KEY]: Object.fromEntries(trimmed) });
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
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: "OPEN_CHAT_BY_TITLE",
        title: chatTitle
      });
    } catch (_) {}
  }
}

async function rememberDesktopNotification(notificationId, payload) {
  try {
    const stored = await chrome.storage.local.get(NOTIFICATION_MAP_KEY);
    const map = stored[NOTIFICATION_MAP_KEY] && typeof stored[NOTIFICATION_MAP_KEY] === "object"
      ? stored[NOTIFICATION_MAP_KEY]
      : {};
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
  const map = stored[NOTIFICATION_MAP_KEY] && typeof stored[NOTIFICATION_MAP_KEY] === "object"
    ? stored[NOTIFICATION_MAP_KEY]
    : {};
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
  try {
    await chrome.scripting.insertCSS({ target: { tabId }, files: ["content-ui.css"] });
  } catch (_) {}

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

  const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  let delivered = false;

  const payload = {
    ...data,
    receivedAt: data.receivedAt || Date.now(),
    preview: current.showPreview ? data.preview : "",
    sound: current.sound,
    duration: current.duration,
    snoozeMinutes: current.snoozeMinutes,
    repeatReminderMinutes: current.repeatReminderMinutes
  };

  if (active?.id && canInjectIntoUrl(active.url || "")) {
    delivered = await sendToastToTab(active.id, payload);
  }

  if (!delivered) delivered = await showDesktopFallback(payload, current);
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

  if (acks[alertKey]?.signature === signature) {
    return { ok: true, duplicate: true, acknowledged: true };
  }

  const existing = pending[alertKey];
  if (existing?.signature === signature) {
    return { ok: true, duplicate: true, pending: true };
  }

  // Persistimos apenas metadados necessários ao lembrete. O corpo/prévia da
  // mensagem não é salvo em chrome.storage e existe somente durante o evento.
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
    lastNotifiedAt: now,
    nextReminderAt: settings.repeatReminders ? now + settings.repeatReminderMinutes * 60 * 1000 : null,
    muted: false
  };
  pending[alertKey] = record;
  await setPendingMap(pending);

  await dispatchCentralPopup({
    ...data,
    ...record,
    preview: data.preview || "",
    alertSignature: signature,
    isReminder: false
  }, settings);

  return { ok: true, duplicate: false };
}

function resolvePendingTarget(pending, target = {}) {
  if (target.alertKey && pending[target.alertKey]) return [target.alertKey, pending[target.alertKey]];
  for (const [key, item] of Object.entries(pending)) {
    if (target.signature && item.signature === target.signature) return [key, item];
    if (target.fingerprint && item.fingerprint === target.fingerprint) return [key, item];
  }
  return [null, null];
}

async function handleAlertAction(action, target = {}) {
  const settings = await getSettings();
  const pending = await getPendingMap();
  const [key, item] = resolvePendingTarget(pending, target);
  if (!key || !item) return { ok: true, missing: true };

  if (action === "snooze") {
    item.muted = false;
    item.nextReminderAt = Date.now() + settings.snoozeMinutes * 60 * 1000;
    pending[key] = item;
    await setPendingMap(pending);
    return { ok: true, action, until: item.nextReminderAt };
  }

  if (action === "mute") {
    item.muted = true;
    item.nextReminderAt = null;
    pending[key] = item;
    await setPendingMap(pending);
    return { ok: true, action };
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
    item.nextReminderAt = settings.repeatReminders
      ? now + settings.repeatReminderMinutes * 60 * 1000
      : null;
    changed = true;
  }

  if (changed) await setPendingMap(pending);
}

async function processDueReminders() {
  const settings = await getSettings();
  if (!settings.enabled || !settings.repeatReminders) return;

  const now = Date.now();
  const pending = await getPendingMap();
  const due = Object.entries(pending)
    .filter(([, item]) => item && !item.muted && Number(item.nextReminderAt || 0) > 0 && Number(item.nextReminderAt) <= now)
    .sort((a, b) => Number(a[1].nextReminderAt || 0) - Number(b[1].nextReminderAt || 0));

  if (!due.length) return;

  // Exibe um pendente por ciclo para evitar que vários toasts se substituam na mesma aba.
  const [key, item] = due[0];
  const delivered = await dispatchCentralPopup({
    ...item,
    notifyReason: "reminder",
    isReminder: true,
    alertSignature: item.signature
  }, settings);

  item.lastNotifiedAt = now;
  item.nextReminderAt = now + settings.repeatReminderMinutes * 60 * 1000;
  if (!delivered) {
    // Se a aba atual não puder receber o toast e o fallback estiver desligado,
    // tenta novamente no próximo ciclo em vez de esperar todo o intervalo.
    item.nextReminderAt = now + 30 * 1000;
  }
  pending[key] = item;
  await setPendingMap(pending);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== "object") return false;

  if (message.type === "WHATSAPP_NEW_MESSAGE") {
    serial(() => registerIncomingAlert(message.payload || {}))
      .then(sendResponse)
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === "ALERT_ACTION") {
    serial(() => handleAlertAction(message.action, message))
      .then(async result => {
        if (message.action === "open" && result?.item) {
          await focusWhatsApp(result.item.chatTitle || result.item.title || "");
        }
        sendResponse(result);
      })
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === "WHATSAPP_CHAT_OPENED" || message.type === "WHATSAPP_CHAT_READ") {
    serial(() => acknowledgeByTitle(message.title || ""))
      .then(count => sendResponse({ ok: true, count }))
      .catch(() => sendResponse({ ok: false, count: 0 }));
    return true;
  }

  if (message.type === "OPEN_WHATSAPP") {
    (async () => {
      if (message.alertKey || message.fingerprint || message.signature) {
        await serial(() => handleAlertAction("open", message));
      }
      await focusWhatsApp(message.title || "");
      sendResponse({ ok: true });
    })().catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === "GET_STATUS") {
    (async () => {
      const [tab, pending] = await Promise.all([findWhatsAppTab(), getPendingMap()]);
      const values = Object.values(pending);
      sendResponse({
        connected: Boolean(tab),
        tabId: tab?.id || null,
        pendingCount: values.length,
        mutedCount: values.filter(item => item?.muted).length
      });
    })();
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
    try {
      await chrome.tabs.sendMessage(tab.id, { type: "PASSIVE_BACKGROUND_SCAN" });
    } catch (_) {}
  })();
});

ensureAlarms().catch(() => {});
