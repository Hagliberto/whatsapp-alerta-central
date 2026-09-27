const DEFAULTS = {
  enabled: true,
  archived: true,
  sound: true,
  showPreview: true,
  duration: 10,
  desktopFallback: false
};

chrome.runtime.onInstalled.addListener(async (details) => {
  const current = await chrome.storage.sync.get(DEFAULTS);
  const next = { ...DEFAULTS, ...current };

  // Migração 1.2.0: padroniza o alerta em TOAST por 10 s e evita
  // uma segunda notificação nativa do Chrome concorrendo com o toast.
  if (details?.reason === "install" || details?.reason === "update") {
    next.duration = 10;
    next.desktopFallback = false;
  }

  await chrome.storage.sync.set(next);

  // Redundância para o polling das arquivadas quando o Chrome reduz timers
  // de abas em segundo plano. O mínimo confiável do chrome.alarms é 30 s.
  try {
    await chrome.alarms.create("wa-archive-poll", { periodInMinutes: 0.5 });
  } catch (_) {}
});

async function getSettings() {
  return chrome.storage.sync.get(DEFAULTS);
}

const DEDUPE_STORAGE_KEY = "waRecentMessageFingerprints";
const DEDUPE_TTL_MS = 24 * 60 * 60 * 1000;
const DEDUPE_MAX_ITEMS = 500;

async function isDuplicateMessage(data) {
  const fingerprint = String(data?.fingerprint || "").trim();
  if (!fingerprint) return false;

  const now = Date.now();
  const stored = await chrome.storage.local.get(DEDUPE_STORAGE_KEY);
  const items = Array.isArray(stored[DEDUPE_STORAGE_KEY])
    ? stored[DEDUPE_STORAGE_KEY]
    : [];

  const fresh = items.filter(item =>
    item && typeof item.fingerprint === "string" &&
    Number.isFinite(item.seenAt) &&
    now - item.seenAt < DEDUPE_TTL_MS
  );

  if (fresh.some(item => item.fingerprint === fingerprint)) {
    if (fresh.length !== items.length) {
      await chrome.storage.local.set({ [DEDUPE_STORAGE_KEY]: fresh.slice(-DEDUPE_MAX_ITEMS) });
    }
    return true;
  }

  fresh.push({ fingerprint, seenAt: now });
  await chrome.storage.local.set({
    [DEDUPE_STORAGE_KEY]: fresh.slice(-DEDUPE_MAX_ITEMS)
  });
  return false;
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

async function showDesktopFallback(data) {
  const settings = await getSettings();
  if (!settings.desktopFallback) return;

  const message = data.archived
    ? "Chegou uma nova mensagem em uma conversa arquivada."
    : (settings.showPreview && data.preview ? data.preview : "Você recebeu uma nova mensagem.");

  try {
    await chrome.notifications.create(`wa-${Date.now()}`, {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: data.title || "Nova mensagem no WhatsApp",
      message,
      priority: 2,
      requireInteraction: false
    });
  } catch (_) {}
}

function canInjectIntoUrl(url = "") {
  return /^https?:\/\//i.test(url);
}

async function ensureUiInTab(tabId) {
  try {
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ["content-ui.css"]
    });
  } catch (_) {
    // O CSS pode já estar presente; isso não impede a injeção do JS.
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content-ui.js"]
    });
    return true;
  } catch (_) {
    return false;
  }
}

async function sendToastToTab(tabId, payload) {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: "SHOW_WHATSAPP_TOAST",
      payload
    });
    return true;
  } catch (_) {
    // A aba pode ter sido aberta antes da instalação/reload da extensão.
    // Injeta o módulo visual sob demanda e tenta novamente.
  }

  const injected = await ensureUiInTab(tabId);
  if (!injected) return false;

  try {
    await chrome.tabs.sendMessage(tabId, {
      type: "SHOW_WHATSAPP_TOAST",
      payload
    });
    return true;
  } catch (_) {
    return false;
  }
}

async function dispatchCentralPopup(data) {
  const settings = await getSettings();
  if (!settings.enabled) return;
  if (data.archived && !settings.archived) return;

  const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  let delivered = false;

  const payload = {
    ...data,
    receivedAt: data.receivedAt || Date.now(),
    preview: settings.showPreview ? data.preview : "",
    sound: settings.sound,
    duration: settings.duration
  };

  if (active?.id && canInjectIntoUrl(active.url || "")) {
    delivered = await sendToastToTab(active.id, payload);
  }

  if (!delivered) await showDesktopFallback(data);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== "object") return false;

  if (message.type === "WHATSAPP_NEW_MESSAGE") {
    (async () => {
      const payload = message.payload || {};
      if (await isDuplicateMessage(payload)) {
        sendResponse({ ok: true, duplicate: true });
        return;
      }
      await dispatchCentralPopup(payload);
      sendResponse({ ok: true, duplicate: false });
    })();
    return true;
  }

  if (message.type === "OPEN_WHATSAPP") {
    focusWhatsApp(message.title || "");
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "GET_STATUS") {
    (async () => {
      const tab = await findWhatsAppTab();
      sendResponse({ connected: Boolean(tab), tabId: tab?.id || null });
    })();
    return true;
  }
});

chrome.notifications.onClicked.addListener(() => {
  focusWhatsApp("");
});


chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm?.name !== "wa-archive-poll") return;
  const settings = await getSettings();
  if (!settings.enabled || !settings.archived) return;

  const tab = await findWhatsAppTab();
  if (!tab?.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "ARCHIVE_BACKGROUND_POLL" });
  } catch (_) {}
});
