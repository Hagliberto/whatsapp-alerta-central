(() => {
  if (window.__WA_CENTRAL_UI__) return;
  window.__WA_CENTRAL_UI__ = true;

  let activeHost = null;
  let closeTimer = null;
  let audioCtx = null;
  let audioReady = false;
  let pendingSound = false;

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>'"]/g, ch => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[ch]);
  }

  function normalize(value = "") {
    return String(value).replace(/\s+/g, " ").trim();
  }

  function isTechnical(value = "") {
    const text = normalize(value);
    return !text ||
      /^(?:ic|icon)[-_][a-z0-9_-]+$/i.test(text) ||
      /^(?:svg|path|button|menu|status|badge)$/i.test(text) ||
      (/^[a-z0-9_-]{18,}$/i.test(text) && /[-_]/.test(text));
  }

  function cleanTitle(payload = {}) {
    const candidates = [payload.chatTitle, payload.title];
    for (const value of candidates) {
      const text = normalize(value);
      if (!isTechnical(text) && !/^(?:arquivadas|archived)$/i.test(text)) return text;
    }
    return payload.archived ? "Conversa arquivada" : "Conversa não lida";
  }

  function cleanPreview(payload = {}) {
    const text = normalize(payload.preview || "");
    if (text && !isTechnical(text) && !/^(?:arquivadas|archived)$/i.test(text)) return text;
    if (payload.archived) return "Há uma conversa arquivada aguardando sua atenção.";
    return "Há uma conversa não lida aguardando sua atenção.";
  }

  function reasonLabel(payload = {}) {
    if (payload.notifyReason === "reminder" || payload.isReminder) return "Lembrete de pendência";
    if (payload.notifyReason === "state-became-unread") return "Marcada como não lida";
    if (payload.notifyReason === "startup-unread") return "Pendente ao abrir";
    if (payload.archived) return "Conversa arquivada";
    return "Nova mensagem";
  }

  function unlockAudio() {
    try {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) return;
      audioCtx ||= new AudioContextCtor();

      if (audioCtx.state === "running") {
        audioReady = true;
        if (pendingSound) {
          pendingSound = false;
          playSound();
        }
        return;
      }

      audioCtx.resume().then(() => {
        audioReady = audioCtx?.state === "running";
        if (audioReady && pendingSound) {
          pendingSound = false;
          playSound();
        }
      }).catch(() => {});
    } catch (_) {}
  }

  for (const eventName of ["pointerdown", "keydown", "touchstart"]) {
    window.addEventListener(eventName, unlockAudio, { capture: true, passive: true });
  }

  function playSound() {
    if (!audioCtx || !audioReady || audioCtx.state !== "running") {
      pendingSound = true;
      return;
    }

    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + .12);
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(.10, now + .015);
      gain.gain.exponentialRampToValueAtTime(.0001, now + .28);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + .3);
    } catch (_) {}
  }

  function formatTime(value) {
    try {
      const date = value ? new Date(value) : new Date();
      return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
    } catch (_) {
      return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }
  }

  function removeAlert() {
    if (!activeHost) return;
    clearTimeout(closeTimer);
    const host = activeHost;
    activeHost = null;
    host.classList.add("wa-toast-leaving");
    setTimeout(() => host.remove(), 240);
  }

  function sendAction(action, payload) {
    try {
      if (!globalThis.chrome?.runtime?.id) return;
      chrome.runtime.sendMessage({
        type: "ALERT_ACTION",
        action,
        alertKey: payload.alertKey || "",
        signature: payload.alertSignature || payload.signature || "",
        fingerprint: payload.fingerprint || ""
      }, () => { void chrome.runtime.lastError; });
    } catch (_) {}
  }

  function showAlert(payload = {}) {
    removeAlert();

    const title = cleanTitle(payload);
    const preview = cleanPreview(payload);
    const time = formatTime(payload.receivedAt);
    const durationSeconds = Number(payload.duration) > 0 ? Number(payload.duration) : 10;
    const reason = reasonLabel(payload);
    const contextLabel = payload.archived ? "Arquivada" : "WhatsApp";
    const unread = Number(payload.unreadCount || 0);
    const unreadLabel = unread > 1 ? `${unread} mensagens não lidas` : (unread === 1 ? "1 mensagem não lida" : "");
    const snoozeMinutes = Math.max(1, Number(payload.snoozeMinutes || 15));
    const isReminder = Boolean(payload.isReminder || payload.notifyReason === "reminder");

    const host = document.createElement("div");
    host.id = "wa-central-alert-host";
    host.innerHTML = `
      <section class="wa-toast" role="status" aria-live="polite" aria-label="Aviso do WhatsApp">
        <div class="wa-toast-accent"></div>
        <div class="wa-toast-topbar">
          <div class="wa-toast-brand">
            <span class="wa-toast-brand-dot" aria-hidden="true"></span>
            <span>${isReminder ? "WhatsApp · lembrete" : "WhatsApp"}</span>
          </div>
          <span class="wa-toast-time">${escapeHtml(time)}</span>
          <button class="wa-toast-close" type="button" title="Fechar sem confirmar leitura" aria-label="Fechar aviso">×</button>
        </div>

        <div class="wa-toast-body">
          <div class="wa-toast-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="25" height="25" fill="none">
              <path d="M7.1 17.2 4 20l.9-4.1A7.8 7.8 0 1 1 7.1 17.2Z" fill="currentColor"/>
              <path d="M8 10.1h8M8 13.4h5.2" stroke="#0f6d49" stroke-width="1.7" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="wa-toast-main">
            <div class="wa-toast-kicker">${escapeHtml(contextLabel)}</div>
            <div class="wa-toast-title">${escapeHtml(title)}</div>
            <div class="wa-toast-preview">${escapeHtml(preview)}</div>
            <div class="wa-toast-meta">
              <span class="wa-toast-chip wa-toast-chip-primary">${escapeHtml(reason)}</span>
              ${unreadLabel ? `<span class="wa-toast-chip">${escapeHtml(unreadLabel)}</span>` : ""}
            </div>
          </div>
        </div>

        <div class="wa-toast-footer">
          <span class="wa-toast-hint">Fechar no × não encerra os lembretes.</span>
          <div class="wa-toast-actions">
            <button class="wa-toast-action wa-toast-snooze" type="button" title="Adiar este lembrete">Adiar ${escapeHtml(snoozeMinutes)} min</button>
            <button class="wa-toast-action wa-toast-mute" type="button" title="Silenciar esta pendência até chegar nova mensagem nesta conversa">Silenciar</button>
            <button class="wa-toast-action wa-toast-read" type="button" title="Marcar como lida somente na extensão, sem alterar o WhatsApp">Marcar como lida</button>
            <button class="wa-toast-action wa-toast-open" type="button" title="Abrir a conversa no WhatsApp">
              <span>Abrir</span><span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
        <div class="wa-toast-progress" style="--wa-toast-duration:${durationSeconds}s"></div>
      </section>`;

    document.documentElement.appendChild(host);
    activeHost = host;

    host.querySelector(".wa-toast-close").addEventListener("click", removeAlert);
    host.querySelector(".wa-toast-snooze").addEventListener("click", () => {
      sendAction("snooze", payload);
      removeAlert();
    });
    host.querySelector(".wa-toast-mute").addEventListener("click", () => {
      sendAction("mute", payload);
      removeAlert();
    });
    host.querySelector(".wa-toast-read").addEventListener("click", () => {
      sendAction("read", payload);
      removeAlert();
    });
    host.querySelector(".wa-toast-open").addEventListener("click", () => {
      try {
        if (globalThis.chrome?.runtime?.id) {
          chrome.runtime.sendMessage({
            type: "OPEN_WHATSAPP",
            title: payload.chatTitle || title || "",
            alertKey: payload.alertKey || "",
            signature: payload.alertSignature || payload.signature || "",
            fingerprint: payload.fingerprint || ""
          }, () => { void chrome.runtime.lastError; });
        }
      } catch (_) {}
      removeAlert();
    });

    if (payload.sound) playSound();
    closeTimer = setTimeout(removeAlert, durationSeconds * 1000);
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || typeof message !== "object") return;
    if (message.type === "SHOW_WHATSAPP_TOAST" || message.type === "SHOW_WHATSAPP_POPUP") {
      showAlert(message.payload || {});
    }
  });
})();
