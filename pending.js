const EXT = typeof globalThis.browser?.runtime?.getBrowserInfo === "function" ? globalThis.browser : globalThis.chrome;

let items = [];

const listEl = document.getElementById("pendingList");
const searchEl = document.getElementById("search");
const filterEl = document.getElementById("filter");

function normalize(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function formatDateTime(value, fallback = "—") {
  const n = Number(value || 0);
  if (!n) return fallback;
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
    }).format(new Date(n));
  } catch (_) { return fallback; }
}

function formatNext(value) {
  const n = Number(value || 0);
  if (!n) return "Sem reaviso agendado";
  const diff = n - Date.now();
  if (diff <= 0) return "Aguardando próximo ciclo";
  const minutes = Math.max(1, Math.ceil(diff / 60000));
  if (minutes < 60) return `em ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `em ${hours}h ${rest}min` : `em ${hours}h`;
}

function itemStatus(item) {
  if (item.muted) return "muted";
  if (item.nextReminderAt && Number(item.nextReminderAt) > Date.now() + 60000) return "snoozed";
  return "active";
}

function updateSummary() {
  const active = items.filter(item => !item.muted).length;
  const muted = items.filter(item => item.muted).length;
  const next = items.filter(item => !item.muted && item.nextReminderAt)
    .map(item => Number(item.nextReminderAt))
    .filter(Boolean)
    .sort((a, b) => a - b)[0] || null;
  document.getElementById("sumTotal").textContent = items.length;
  document.getElementById("sumActive").textContent = active;
  document.getElementById("sumMuted").textContent = muted;
  document.getElementById("sumNext").textContent = next ? formatNext(next) : "Nenhum";
}

function actionButton(text, className, handler, title = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = text;
  if (title) button.title = title;
  button.addEventListener("click", handler);
  return button;
}

async function sendAction(action, item, extra = {}) {
  try {
    return await EXT.runtime.sendMessage({
      type: "ALERT_ACTION",
      action,
      alertKey: item.alertKey,
      signature: item.signature,
      ...extra
    }) || { ok: false };
  } catch (_) {
    return { ok: false };
  }
}

async function runAction(action, item, extra = {}) {
  await sendAction(action, item, extra);
  await refresh();
}

function render() {
  updateSummary();
  listEl.textContent = "";
  const needle = normalize(searchEl.value).toLocaleLowerCase("pt-BR");
  const filter = filterEl.value;
  const filtered = items.filter(item => {
    const title = normalize(item.chatTitle || item.title || "Conversa arquivada").toLocaleLowerCase("pt-BR");
    if (needle && !title.includes(needle)) return false;
    if (filter !== "all" && itemStatus(item) !== filter) return false;
    return true;
  });

  if (!filtered.length) {
    const empty = document.createElement("section");
    empty.className = "panel empty-state";
    empty.innerHTML = `<strong>${items.length ? "Nenhuma pendência corresponde ao filtro." : "Nenhuma pendência no momento."}</strong><span>${items.length ? "Altere a pesquisa ou o filtro acima." : "Novas mensagens não confirmadas aparecerão aqui."}</span>`;
    listEl.appendChild(empty);
    return;
  }

  for (const item of filtered) {
    const title = normalize(item.chatTitle || item.title || "Conversa arquivada");
    const card = document.createElement("section");
    card.className = `panel pending-card ${item.muted ? "is-muted" : ""}`;

    const header = document.createElement("div");
    header.className = "pending-card-header";
    const main = document.createElement("div");
    const kicker = document.createElement("div");
    kicker.className = "pending-kicker";
    kicker.textContent = item.archived ? "CONVERSA ARQUIVADA" : "WHATSAPP";
    const name = document.createElement("h2");
    name.textContent = title;
    const meta = document.createElement("div");
    meta.className = "pending-meta";
    meta.textContent = `Detectada em ${formatDateTime(item.firstSeenAt)}${item.unreadCount > 0 ? ` · ${item.unreadCount} não lida(s)` : ""}`;
    main.append(kicker, name, meta);

    const status = document.createElement("span");
    status.className = `status-chip ${item.muted ? "muted" : (item.suppressedInitial ? "quiet" : "active")}`;
    status.textContent = item.muted ? "Silenciada" : (item.suppressedInitial ? "Aguardando fim do silêncio" : "Pendente");
    header.append(main, status);

    const detail = document.createElement("div");
    detail.className = "pending-detail-grid";
    const next = document.createElement("div");
    next.innerHTML = `<span>Próximo reaviso</span><strong>${item.muted ? "Silenciado" : formatNext(item.nextReminderAt)}</strong>`;
    const policy = document.createElement("div");
    const policyText = item.ruleTitle
      ? (item.repeatEnabled ? `Regra: ${item.repeatMinutes} min` : "Regra: sem reaviso")
      : (item.repeatEnabled ? `Padrão: ${item.repeatMinutes} min` : "Sem reaviso");
    policy.innerHTML = `<span>Política</span><strong>${policyText}</strong>`;
    detail.append(next, policy);

    const actions = document.createElement("div");
    actions.className = "pending-card-actions";
    const snooze = document.createElement("div");
    snooze.className = "snooze-group";
    for (const minutes of [5, 15, 30, 60]) {
      snooze.appendChild(actionButton(minutes === 60 ? "1h" : `${minutes}m`, "secondary mini-button", () => runAction("snooze", item, { minutes }), `Adiar ${minutes} minutos`));
    }
    actions.appendChild(snooze);
    actions.appendChild(actionButton(item.muted ? "Reativar" : "Silenciar", "secondary", () => runAction(item.muted ? "unmute" : "mute", item)));
    actions.appendChild(actionButton("Marcar como lida", "secondary", () => runAction("read", item), "Encerra somente na extensão"));
    actions.appendChild(actionButton("Abrir conversa", "primary", () => {
      EXT.runtime.sendMessage({
        type: "OPEN_WHATSAPP",
        title,
        alertKey: item.alertKey,
        signature: item.signature
      });
    }));

    card.append(header, detail, actions);
    listEl.appendChild(card);
  }
}

async function refresh() {
  try {
    const response = await EXT.runtime.sendMessage({ type: "GET_PENDING" });
    if (!response?.ok) throw new Error("pending-unavailable");
    items = Array.isArray(response.items) ? response.items : [];
    render();
  } catch (_) {
    items = [];
    listEl.textContent = "";
    const error = document.createElement("section");
    error.className = "panel empty-state";
    error.innerHTML = "<strong>Não foi possível carregar as pendências.</strong><span>Reabra esta página ou recarregue a extensão.</span>";
    listEl.appendChild(error);
    updateSummary();
  }
}
searchEl.addEventListener("input", render);
filterEl.addEventListener("change", render);
document.getElementById("refresh").addEventListener("click", refresh);
document.getElementById("openOptions").addEventListener("click", () => EXT.runtime.openOptionsPage());
document.getElementById("openWa").addEventListener("click", () => EXT.runtime.sendMessage({ type: "OPEN_WHATSAPP" }));

refresh();
setInterval(() => {
  if (!document.hidden) refresh();
}, 5000);
