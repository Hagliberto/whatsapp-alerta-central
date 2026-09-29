const EXT = typeof globalThis.browser?.runtime?.getBrowserInfo === "function" ? globalThis.browser : globalThis.chrome;

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

const EDITABLE_IDS = [
  "enabled", "archived", "sound", "showPreview", "desktopFallback",
  "checkIntervalSeconds", "repeatReminders", "repeatReminderMinutes", "snoozeMinutes",
  "quietHoursEnabled", "quietStart", "quietEnd"
];

let saveTimer;
let conversationRules = [];
let editingRuleId = null;

function clamp(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function normalize(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function normalizeRules(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.map((raw, index) => ({
    id: normalize(raw?.id || `rule-${index}`),
    title: normalize(raw?.title || "").slice(0, 120),
    repeatMinutes: raw?.repeatMinutes === null || raw?.repeatMinutes === undefined || raw?.repeatMinutes === ""
      ? null
      : clamp(raw.repeatMinutes, 0, 1440, null),
    allowDuringQuiet: Boolean(raw?.allowDuringQuiet)
  })).filter(rule => {
    const key = rule.title.toLocaleLowerCase("pt-BR");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 30);
}

function showSaved(text = "Configurações salvas") {
  const savedEl = document.getElementById("saved");
  if (!savedEl) return;
  savedEl.textContent = text;
  savedEl.classList.add("show");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => savedEl.classList.remove("show"), 1300);
}

function refreshDependentStates() {
  const reminders = Boolean(document.getElementById("repeatReminders")?.checked);
  for (const row of document.querySelectorAll(".reminder-dependent")) {
    row.classList.toggle("field-disabled", !reminders);
    for (const input of row.querySelectorAll("input")) input.disabled = !reminders;
  }

  const quiet = Boolean(document.getElementById("quietHoursEnabled")?.checked);
  for (const row of document.querySelectorAll(".quiet-dependent")) {
    row.classList.toggle("field-disabled", !quiet);
    for (const input of row.querySelectorAll("input")) input.disabled = !quiet;
  }
}

async function load() {
  const data = await EXT.storage.sync.get(DEFAULTS);
  for (const id of EDITABLE_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (el.type === "checkbox") el.checked = Boolean(data[id]);
    else el.value = data[id];
  }
  conversationRules = normalizeRules(data.conversationRules);
  renderRules();
  refreshDependentStates();
  refreshRuleMode();
  await refreshDiagnostics();
}

async function saveGeneral() {
  const data = {};
  for (const id of EDITABLE_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (el.type === "checkbox") data[id] = el.checked;
    else if (el.type === "number") data[id] = Number(el.value);
    else data[id] = el.value;
  }
  data.duration = 10;
  data.checkIntervalSeconds = clamp(data.checkIntervalSeconds, 5, 300, DEFAULTS.checkIntervalSeconds);
  data.repeatReminderMinutes = clamp(data.repeatReminderMinutes, 1, 1440, DEFAULTS.repeatReminderMinutes);
  data.snoozeMinutes = clamp(data.snoozeMinutes, 1, 1440, DEFAULTS.snoozeMinutes);
  data.quietStart = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(data.quietStart) ? data.quietStart : DEFAULTS.quietStart;
  data.quietEnd = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(data.quietEnd) ? data.quietEnd : DEFAULTS.quietEnd;
  document.getElementById("quietStart").value = data.quietStart;
  document.getElementById("quietEnd").value = data.quietEnd;
  document.getElementById("checkIntervalSeconds").value = data.checkIntervalSeconds;
  document.getElementById("repeatReminderMinutes").value = data.repeatReminderMinutes;
  document.getElementById("snoozeMinutes").value = data.snoozeMinutes;
  await EXT.storage.sync.set(data);
  refreshDependentStates();
  showSaved();
}

function refreshRuleMode() {
  const mode = document.getElementById("ruleRepeatMode")?.value || "default";
  document.getElementById("ruleMinutesWrap")?.classList.toggle("hidden", mode !== "custom");
}

function resetRuleEditor() {
  editingRuleId = null;
  document.getElementById("ruleTitle").value = "";
  document.getElementById("ruleRepeatMode").value = "default";
  document.getElementById("ruleMinutes").value = 5;
  document.getElementById("ruleAllowQuiet").checked = false;
  document.getElementById("saveRule").textContent = "Adicionar regra";
  document.getElementById("cancelRule").classList.add("hidden");
  refreshRuleMode();
}

function repeatLabel(rule) {
  if (rule.repeatMinutes === null) return "Reaviso padrão";
  if (Number(rule.repeatMinutes) === 0) return "Sem reaviso";
  return `Reaviso a cada ${rule.repeatMinutes} min`;
}

function renderRules() {
  const list = document.getElementById("rulesList");
  const count = document.getElementById("rulesCount");
  if (count) count.textContent = `${conversationRules.length}/30`;
  if (!list) return;
  list.textContent = "";
  if (!conversationRules.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state compact-empty";
    empty.textContent = "Nenhuma regra individual cadastrada. Todas as conversas usam as configurações padrão.";
    list.appendChild(empty);
    return;
  }

  for (const rule of conversationRules) {
    const card = document.createElement("div");
    card.className = "rule-card";
    const info = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = rule.title;
    const meta = document.createElement("small");
    meta.textContent = `${repeatLabel(rule)}${rule.allowDuringQuiet ? " · permitido no silêncio" : ""}`;
    info.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "mini-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "secondary mini-button";
    edit.textContent = "Editar";
    edit.addEventListener("click", () => editRule(rule.id));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "danger-soft mini-button";
    remove.textContent = "Excluir";
    remove.addEventListener("click", () => deleteRule(rule.id));
    actions.append(edit, remove);
    card.append(info, actions);
    list.appendChild(card);
  }
}

function editRule(id) {
  const rule = conversationRules.find(item => item.id === id);
  if (!rule) return;
  editingRuleId = id;
  document.getElementById("ruleTitle").value = rule.title;
  document.getElementById("ruleAllowQuiet").checked = Boolean(rule.allowDuringQuiet);
  if (rule.repeatMinutes === null) document.getElementById("ruleRepeatMode").value = "default";
  else if (Number(rule.repeatMinutes) === 0) document.getElementById("ruleRepeatMode").value = "none";
  else {
    document.getElementById("ruleRepeatMode").value = "custom";
    document.getElementById("ruleMinutes").value = rule.repeatMinutes;
  }
  document.getElementById("saveRule").textContent = "Salvar regra";
  document.getElementById("cancelRule").classList.remove("hidden");
  refreshRuleMode();
  document.getElementById("ruleTitle").focus();
}

async function deleteRule(id) {
  conversationRules = conversationRules.filter(rule => rule.id !== id);
  await EXT.storage.sync.set({ conversationRules });
  if (editingRuleId === id) resetRuleEditor();
  renderRules();
  showSaved("Regra excluída");
  refreshDiagnostics();
}

async function saveRule() {
  const title = normalize(document.getElementById("ruleTitle").value).slice(0, 120);
  if (!title) {
    document.getElementById("ruleTitle").focus();
    showSaved("Informe o nome da conversa");
    return;
  }
  const mode = document.getElementById("ruleRepeatMode").value;
  const repeatMinutes = mode === "default" ? null : (mode === "none" ? 0 : clamp(document.getElementById("ruleMinutes").value, 1, 1440, 5));
  const allowDuringQuiet = document.getElementById("ruleAllowQuiet").checked;

  const duplicate = conversationRules.find(rule => rule.title.toLocaleLowerCase("pt-BR") === title.toLocaleLowerCase("pt-BR") && rule.id !== editingRuleId);
  if (duplicate) {
    showSaved("Já existe uma regra para essa conversa");
    return;
  }

  const rule = {
    id: editingRuleId || `r-${Date.now().toString(36)}`,
    title,
    repeatMinutes,
    allowDuringQuiet
  };
  const wasEditing = Boolean(editingRuleId);
  if (editingRuleId) conversationRules = conversationRules.map(item => item.id === editingRuleId ? rule : item);
  else {
    if (conversationRules.length >= 30) {
      showSaved("Limite de 30 regras atingido");
      return;
    }
    conversationRules.push(rule);
  }
  conversationRules = normalizeRules(conversationRules);
  await EXT.storage.sync.set({ conversationRules });
  renderRules();
  resetRuleEditor();
  showSaved(wasEditing ? "Regra atualizada" : "Regra adicionada");
  refreshDiagnostics();
}

function formatDateTime(value, fallback = "—") {
  const n = Number(value || 0);
  if (!n) return fallback;
  try {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(n));
  } catch (_) { return fallback; }
}

function setDiag(id, text, tone = "") {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.classList.remove("good", "warn");
  if (tone) el.classList.add(tone);
}

async function refreshDiagnostics() {
  try {
    const response = await EXT.runtime.sendMessage({ type: "GET_DIAGNOSTICS" });
    if (!response?.ok) throw new Error("diagnostics-unavailable");
    const heartbeatAge = response.lastMonitorHeartbeatAt ? Date.now() - Number(response.lastMonitorHeartbeatAt) : Infinity;
    const monitorOk = response.connected && heartbeatAge < Math.max(45000, Number(response.checkIntervalSeconds || 8) * 3000);
    setDiag("diagVersion", `v${response.version || "—"}`);
    setDiag("diagBrowser", response.browserFamily || "—");
    setDiag("diagConnection", response.connected ? "Detectado" : "Não aberto", response.connected ? "good" : "warn");
    setDiag("diagMonitor", monitorOk ? "Ativo" : (response.connected ? "Sem resposta recente" : "Aguardando WhatsApp"), monitorOk ? "good" : "warn");
    setDiag("diagLastScan", formatDateTime(response.lastScanAt, "Ainda não registrada"));
    setDiag("diagLastMessage", formatDateTime(response.lastIncomingAt, "Nenhuma nesta sessão"));
    setDiag("diagNextReminder", formatDateTime(response.nextReminderAt, "Nenhum agendado"));
    setDiag("diagPending", `${Number(response.pendingCount || 0)} pendente(s) · ${Number(response.mutedCount || 0)} silenciada(s)`);
    const quietText = !response.quietHoursEnabled ? "Desativado" : (response.quietNow ? `Ativo até ${formatDateTime(response.quietEndAt, "—")}` : "Fora do horário");
    setDiag("diagQuiet", quietText, response.quietNow ? "warn" : "");
  } catch (_) {
    setDiag("diagConnection", "Indisponível", "warn");
    setDiag("diagMonitor", "Indisponível", "warn");
  }
}
for (const id of EDITABLE_IDS) {
  document.getElementById(id)?.addEventListener("change", saveGeneral);
}
document.getElementById("repeatReminders")?.addEventListener("change", refreshDependentStates);
document.getElementById("quietHoursEnabled")?.addEventListener("change", refreshDependentStates);
document.getElementById("ruleRepeatMode")?.addEventListener("change", refreshRuleMode);
document.getElementById("saveRule")?.addEventListener("click", saveRule);
document.getElementById("cancelRule")?.addEventListener("click", resetRuleEditor);
document.getElementById("refreshDiagnostics")?.addEventListener("click", refreshDiagnostics);
document.getElementById("openPending")?.addEventListener("click", () => EXT.runtime.sendMessage({ type: "OPEN_PENDING_CENTER" }));

load().catch(() => showSaved("Não foi possível carregar as configurações"));
setInterval(refreshDiagnostics, 5000);
