const DEFAULTS = { enabled: true, archived: true, repeatReminders: true };

const enabledEl = document.getElementById("enabled");
const archivedEl = document.getElementById("archived");
const repeatEl = document.getElementById("repeatReminders");
const statusEl = document.getElementById("status");
const pendingEl = document.getElementById("pending");
const openWaEl = document.getElementById("openWa");
const optionsEl = document.getElementById("options");

async function load() {
  const settings = await chrome.storage.sync.get(DEFAULTS);

  if (enabledEl) enabledEl.checked = Boolean(settings.enabled);
  if (archivedEl) archivedEl.checked = Boolean(settings.archived);
  if (repeatEl) repeatEl.checked = Boolean(settings.repeatReminders);

  chrome.runtime.sendMessage({ type: "GET_STATUS" }, response => {
    if (chrome.runtime.lastError) {
      if (statusEl) {
        statusEl.textContent = "○ Não foi possível verificar o WhatsApp Web";
        statusEl.classList.remove("ok");
      }
      if (pendingEl) pendingEl.textContent = "Pendências indisponíveis";
      return;
    }

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
  });
}

if (enabledEl) enabledEl.addEventListener("change", () => chrome.storage.sync.set({ enabled: enabledEl.checked }));
if (archivedEl) archivedEl.addEventListener("change", () => chrome.storage.sync.set({ archived: archivedEl.checked }));
if (repeatEl) repeatEl.addEventListener("change", () => chrome.storage.sync.set({ repeatReminders: repeatEl.checked }));

if (openWaEl) {
  openWaEl.addEventListener("click", () => chrome.runtime.sendMessage({ type: "OPEN_WHATSAPP" }));
}
if (optionsEl) optionsEl.addEventListener("click", () => chrome.runtime.openOptionsPage());

load().catch(() => {
  if (statusEl) {
    statusEl.textContent = "○ Não foi possível carregar o status";
    statusEl.classList.remove("ok");
  }
});
