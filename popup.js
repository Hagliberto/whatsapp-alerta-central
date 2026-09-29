const EXT = typeof globalThis.browser?.runtime?.getBrowserInfo === "function" ? globalThis.browser : globalThis.chrome;

const DEFAULTS = { enabled: true, archived: true, repeatReminders: true };

const enabledEl = document.getElementById("enabled");
const archivedEl = document.getElementById("archived");
const repeatEl = document.getElementById("repeatReminders");
const statusEl = document.getElementById("status");
const pendingEl = document.getElementById("pending");
const quietEl = document.getElementById("quiet");
const openWaEl = document.getElementById("openWa");
const optionsEl = document.getElementById("options");
const pendingCenterEl = document.getElementById("pendingCenter");

function formatTime(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch (_) { return ""; }
}

async function load() {
  const settings = await EXT.storage.sync.get(DEFAULTS);
  if (enabledEl) enabledEl.checked = Boolean(settings.enabled);
  if (archivedEl) archivedEl.checked = Boolean(settings.archived);
  if (repeatEl) repeatEl.checked = Boolean(settings.repeatReminders);

  const response = await EXT.runtime.sendMessage({ type: "GET_STATUS" });
  const connected = Boolean(response && response.connected);
  if (statusEl) {
    statusEl.textContent = connected
      ? "● WhatsApp Web detectado e sendo monitorado"
      : "○ Abra o WhatsApp Web para iniciar o monitoramento";
    statusEl.classList.toggle("ok", connected);
  }

  if (pendingEl) {
    const pending = Number(response?.pendingCount || 0);
    const muted = Number(response?.mutedCount || 0);
    pendingEl.textContent = pending === 0
      ? "Nenhum lembrete pendente"
      : `${pending} pendência${pending === 1 ? "" : "s"}${muted ? ` · ${muted} silenciada${muted === 1 ? "" : "s"}` : ""}`;
    pendingEl.classList.toggle("ok", pending === 0);
  }

  if (quietEl) {
    const active = Boolean(response?.quietNow);
    quietEl.classList.toggle("hidden", !active);
    quietEl.classList.toggle("warn", active);
    if (active) {
      const end = formatTime(response?.quietEndAt);
      quietEl.textContent = end ? `◷ Horário de silêncio ativo até ${end}` : "◷ Horário de silêncio ativo";
    }
  }
}

if (enabledEl) enabledEl.addEventListener("change", () => EXT.storage.sync.set({ enabled: enabledEl.checked }));
if (archivedEl) archivedEl.addEventListener("change", () => EXT.storage.sync.set({ archived: archivedEl.checked }));
if (repeatEl) repeatEl.addEventListener("change", () => EXT.storage.sync.set({ repeatReminders: repeatEl.checked }));
if (openWaEl) openWaEl.addEventListener("click", () => EXT.runtime.sendMessage({ type: "OPEN_WHATSAPP" }));
if (optionsEl) optionsEl.addEventListener("click", () => EXT.runtime.openOptionsPage());
if (pendingCenterEl) pendingCenterEl.addEventListener("click", () => EXT.runtime.sendMessage({ type: "OPEN_PENDING_CENTER" }));

load().catch(() => {
  if (statusEl) {
    statusEl.textContent = "○ Não foi possível carregar o status";
    statusEl.classList.remove("ok");
  }
});
