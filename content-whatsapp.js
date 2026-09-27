(() => {
  if (window.__WA_CENTRAL_MONITOR__) return;
  window.__WA_CENTRAL_MONITOR__ = true;

  const state = {
    initialized: false,
    rows: new Map(),
    archiveUnread: null,
    globalUnread: null,
    debounce: null,
    lastEvents: new Map(),
    notifiedFingerprints: new Set(),
    notifiedOrder: [],
    archiveFolderRows: new Map(),
    archiveFolderInitialized: false,
    archivePollRunning: false,
    lastArchivePollAt: 0,
    initialArchiveToastSent: false,
    initialArchiveProbeDone: false,
    initialArchiveProbeRunning: false,
    initialNormalScanDone: false,
    sessionToken: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  };

  const normalize = (s = "") => s.replace(/\s+/g, " ").trim();
  const lower = (s = "") => normalize(s).toLocaleLowerCase("pt-BR");

  function dedupe(key, ms = 3500) {
    const now = Date.now();
    const last = state.lastEvents.get(key) || 0;
    state.lastEvents.set(key, now);
    return now - last < ms;
  }

  function rememberFingerprint(fingerprint) {
    if (!fingerprint) return false;
    if (state.notifiedFingerprints.has(fingerprint)) return false;

    state.notifiedFingerprints.add(fingerprint);
    state.notifiedOrder.push(fingerprint);

    // Mantém a memória limitada sem permitir que uma mesma mensagem seja
    // reavisada durante a sessão atual do WhatsApp Web.
    while (state.notifiedOrder.length > 500) {
      const oldest = state.notifiedOrder.shift();
      state.notifiedFingerprints.delete(oldest);
    }
    return true;
  }

  function getRowTime(row) {
    const text = normalize(row.innerText || "");
    const matches = text.match(/\b(?:[01]?\d|2[0-3]):[0-5]\d\b/g);
    return matches?.[matches.length - 1] || "";
  }

  function isTimeLike(text = "") {
    const value = normalize(text);
    return /^(?:[01]?\d|2[0-3]):[0-5]\d(?:\s?[AP]M)?$/i.test(value) ||
           /^(?:1[0-2]|0?\d):[0-5]\d\s?[AP]M$/i.test(value);
  }

  function isDateLike(text = "") {
    const value = normalize(text);
    return /^(?:\d{1,2}[\/-]){1,2}\d{2,4}$/.test(value) ||
           /^(?:hoje|ontem|today|yesterday)$/i.test(value);
  }

  function parseExplicitUnreadCount(value = "") {
    const text = normalize(value);
    if (!text || isTimeLike(text) || isDateLike(text)) return 0;

    // Prioridade máxima: nomes acessíveis observados no WhatsApp Web, por exemplo
    // "1 mensagem não lida" e "Não lidas". Nunca extraímos dígitos soltos.
    const patterns = [
      /(?:^|\D)(\d{1,3})\s+(?:mensagem|mensagens)\s+(?:não\s+lida|não\s+lidas)(?:\D|$)/i,
      /(?:^|\D)(\d{1,3})\s+(?:unread\s+message|unread\s+messages)(?:\D|$)/i,
      /(?:não\s+lida|não\s+lidas|unread)(?:\D){0,20}(\d{1,3})(?:\D|$)/i
    ];
    for (const pattern of patterns) {
      const m = text.match(pattern);
      if (m) return Number(m[1]);
    }

    // "Não lidas" / "Unread" sem número significa estado não lido conhecido,
    // porém sem quantidade confiável.
    return /^(?:não\s+lidas?|unread(?:\s+messages?)?|marcar\s+como\s+lida|mark\s+as\s+read)$/i.test(text) ? 1 : 0;
  }

  function isPlausibleBadge(node) {
    if (!node) return false;
    const text = normalize(node.textContent || "");
    if (!/^\d{1,3}$/.test(text) || isTimeLike(text) || isDateLike(text)) return false;
    try {
      const r = node.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      // Badges reais observados no WhatsApp ficam em torno de 20x20. Mantemos
      // pequena tolerância para zoom/escala, mas rejeitamos números de conteúdo.
      return r.width >= 10 && r.height >= 10 && r.width <= 52 && r.height <= 52;
    } catch (_) {
      return true;
    }
  }

  function unreadSemanticFromNode(node) {
    if (!node) return { unread: false, count: null, source: "none", confidence: 0 };
    const values = [
      node.getAttribute?.("aria-label") || "",
      node.getAttribute?.("title") || ""
    ].map(normalize).filter(Boolean);

    for (const value of values) {
      const count = parseExplicitUnreadCount(value);
      if (count > 0) {
        const explicitCount = /\d/.test(value) ? count : null;
        return { unread: true, count: explicitCount, source: "accessibility", confidence: 3 };
      }
    }
    return { unread: false, count: null, source: "none", confidence: 0 };
  }

  function hasUnreadSemantic(row) {
    if (unreadSemanticFromNode(row).unread) return true;
    const semanticNodes = row.querySelectorAll('[aria-label], [title], [data-testid]');
    for (const node of semanticNodes) {
      if (unreadSemanticFromNode(node).unread) return true;
      const testid = node.getAttribute("data-testid") || "";
      if (/(?:unread-count|unread-dot|unread)/i.test(testid)) return true;
    }
    return false;
  }

  function hasUnreadVisualDot(row) {
    // Fallback para o ponto verde mostrado no print do usuário. Só é usado
    // dentro da própria linha e à direita, para não confundir avatares/ícones.
    let rr;
    try { rr = row.getBoundingClientRect(); } catch (_) { return false; }
    if (!rr?.width || !rr?.height) return false;

    const nodes = [...row.querySelectorAll('span, div')];
    for (const node of nodes) {
      let r, style;
      try {
        r = node.getBoundingClientRect();
        if (!r.width || !r.height || r.width > 26 || r.height > 26 || r.width < 8 || r.height < 8) continue;
        if (r.left < rr.left + rr.width * 0.68) continue;
        const ratio = r.width / r.height;
        if (ratio < 0.72 || ratio > 1.38) continue;
        style = getComputedStyle(node);
      } catch (_) { continue; }

      const radius = parseFloat(style.borderRadius || '0');
      const circular = radius >= Math.min(r.width, r.height) * 0.35 || /50%/.test(style.borderRadius || '');
      if (!circular) continue;

      const bg = style.backgroundColor || '';
      const color = style.color || '';
      const looksGreen = /rgb\(\s*(?:0|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9]|6[0-9])\s*,\s*(?:1[2-9][0-9]|2[0-5][0-9])\s*,\s*(?:[0-9]|[1-9][0-9]|1[0-7][0-9])\s*\)/i.test(bg) ||
                         /rgb\(\s*(?:0|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9]|6[0-9])\s*,\s*(?:1[2-9][0-9]|2[0-5][0-9])\s*,\s*(?:[0-9]|[1-9][0-9]|1[0-7][0-9])\s*\)/i.test(color);
      if (looksGreen) return true;
    }
    return false;
  }

  function getUnreadSignal(row) {
    // 1) Acessibilidade: fonte de maior confiança.
    for (const node of [row, ...row.querySelectorAll('[aria-label], [title]')]) {
      const signal = unreadSemanticFromNode(node);
      if (signal.unread) return signal;
    }

    // 2) Badge numérico compacto. Só aceitamos quando ele aparece na região
    // direita da linha; números no corpo da conversa ficam de fora.
    let rr = null;
    try { rr = row.getBoundingClientRect(); } catch (_) {}
    if (rr?.width && rr?.height) {
      const badges = [...row.querySelectorAll('span, div')]
        .filter(isPlausibleBadge)
        .filter(node => {
          try {
            const r = node.getBoundingClientRect();
            return r.left >= rr.left + rr.width * 0.62;
          } catch (_) { return false; }
        });
      if (badges.length) {
        const count = Math.max(...badges.map(n => Number(normalize(n.textContent || "0"))));
        if (count > 0) return { unread: true, count, source: "badge", confidence: 2 };
      }
    }

    // 3) Ponto verde sem quantidade explícita.
    if (hasUnreadVisualDot(row)) return { unread: true, count: null, source: "dot", confidence: 1 };

    return { unread: false, count: null, source: "none", confidence: 0 };
  }

  function isRowUnread(row) {
    return getUnreadSignal(row).unread;
  }

  function getUnreadCount(row) {
    const signal = getUnreadSignal(row);
    return signal.unread ? (signal.count || 1) : 0;
  }

  function isTechnicalUiLabel(value = "") {
    const text = normalize(value);
    const v = lower(text);
    if (!text) return true;
    if (/^(?:ic|icon)[-_][a-z0-9_-]+$/i.test(text)) return true;
    if (/^(?:archive|archived|arquivadas|não lidas?|unread)$/i.test(v)) return true;
    if (/^(?:svg|path|button|menu|status|badge)$/i.test(v)) return true;
    if (/^[a-z0-9_-]{18,}$/i.test(text) && /[-_]/.test(text)) return true;
    return false;
  }

  function getRowTitle(row) {
    // O WhatsApp usa atributos title também em ícones internos (ex.: ic-archive).
    // Só aceitamos um title que pareça texto humano.
    const titled = [...row.querySelectorAll("[title]")];
    for (const node of titled) {
      const title = normalize(node.getAttribute("title") || "");
      if (!title || title.length > 120 || isTimeLike(title) || isDateLike(title)) continue;
      if (isTechnicalUiLabel(title)) continue;
      if (/^\d{1,3}$/.test(title)) continue;
      return title;
    }

    const spans = [...row.querySelectorAll("span")]
      .map(n => normalize(n.textContent || ""))
      .filter(Boolean)
      .filter(t => !isTimeLike(t) && !isDateLike(t) && !/^\d{1,3}$/.test(t))
      .filter(t => !isTechnicalUiLabel(t))
      .filter(t => !/(?:mensagens? não lidas?|unread messages?)/i.test(t));
    return spans[0] || "Conversa não lida";
  }

  function getPreview(row, title) {
    const lines = (row.innerText || "").split(/\n+/).map(normalize).filter(Boolean);
    return lines.find(line => {
      if (line === title || /^\d{1,2}:\d{2}$/.test(line) || /^\d{1,3}$/.test(line)) return false;
      const value = lower(line);
      if (/^(unread message|unread messages|new message|new messages|mensagem não lida|mensagens não lidas|nova mensagem|novas mensagens)$/.test(value)) return false;
      return true;
    }) || "";
  }

  function rowKey(row, title) {
    const stable = row.getAttribute("data-id") || row.getAttribute("aria-rowindex") || "";
    return `${title}::${stable}`;
  }

  function getConversationRows() {
    const candidates = [
      ...document.querySelectorAll('[data-testid="cell-frame-container"]'),
      ...document.querySelectorAll('div[role="row"]')
    ];
    const seen = new Set();
    return candidates.filter(row => {
      if (!row.isConnected || seen.has(row)) return false;
      seen.add(row);
      const text = normalize(row.innerText || "");
      return text.length > 0 && text.length < 2000;
    });
  }

  function extractArchiveNumber(root, labelRect = null) {
    if (!root) return null;

    // Atributos acessíveis explícitos têm prioridade.
    for (const node of [root, ...root.querySelectorAll?.("[aria-label], [title]") || []]) {
      const accessible = `${node.getAttribute?.("aria-label") || ""} ${node.getAttribute?.("title") || ""}`;
      const explicit = parseExplicitUnreadCount(accessible);
      if (explicit > 0 && /\d/.test(accessible)) return explicit;
    }

    // No item Arquivadas, o badge é um número puro e compacto alinhado à direita
    // do rótulo. Nunca lemos dígitos do texto agregado do container.
    const candidates = [root, ...root.querySelectorAll?.("span, div") || []]
      .filter(isPlausibleBadge)
      .map(node => {
        try {
          const r = node.getBoundingClientRect();
          return { node, r, value: Number(normalize(node.textContent || "0")) };
        } catch (_) { return null; }
      })
      .filter(Boolean)
      .filter(x => Number.isInteger(x.value) && x.value > 0 && x.value <= 999);

    if (!candidates.length) return null;

    if (labelRect?.width && labelRect?.height) {
      const labelY = labelRect.top + labelRect.height / 2;
      const aligned = candidates
        .filter(x => Math.abs((x.r.top + x.r.height / 2) - labelY) <= 18)
        .filter(x => x.r.left >= labelRect.right - 8)
        .sort((a, b) => (a.r.left - labelRect.right) - (b.r.left - labelRect.right));
      if (aligned.length) return aligned[0].value;
    }

    // Sem geometria do rótulo, só aceitamos um único badge inequívoco.
    return candidates.length === 1 ? candidates[0].value : null;
  }

  function findArchiveUnreadCount() {
    const seeds = new Set();

    const selector = [
      '[data-testid*="archiv" i]',
      '[aria-label*="arquiv" i]',
      '[aria-label*="archiv" i]',
      '[title*="arquiv" i]',
      '[title*="archiv" i]'
    ].join(',');
    document.querySelectorAll(selector).forEach(el => seeds.add(el));

    document.querySelectorAll("div, span, button").forEach(el => {
      const t = lower(el.textContent || "");
      if (t === "arquivadas" || t === "archived") seeds.add(el);
    });

    for (const seed of seeds) {
      let labelRect = null;
      try { labelRect = seed.getBoundingClientRect(); } catch (_) {}

      // Procura primeiro em containers pequenos que realmente compõem a linha
      // "Arquivadas". Limita a altura para não capturar horários/conteúdo abaixo.
      let box = seed;
      for (let depth = 0; depth < 7 && box; depth++, box = box.parentElement) {
        let rect = null;
        try { rect = box.getBoundingClientRect(); } catch (_) {}
        const text = lower(box.innerText || box.textContent || "");
        if (text.length > 220) break;
        if (rect && rect.height > 90) break;

        const n = extractArchiveNumber(box, labelRect);
        if (n !== null) return n;
      }

      // Fallback visual global: badge compacto na mesma faixa horizontal do rótulo.
      if (labelRect?.width && labelRect?.height) {
        const labelY = labelRect.top + labelRect.height / 2;
        const nearby = [...document.querySelectorAll("span, div")]
          .filter(isPlausibleBadge)
          .map(node => {
            try { return { node, r: node.getBoundingClientRect() }; } catch (_) { return null; }
          })
          .filter(Boolean)
          .filter(x => Math.abs((x.r.top + x.r.height / 2) - labelY) <= 18)
          .filter(x => x.r.left >= labelRect.right - 8 && x.r.left - labelRect.right < 700)
          .sort((a, b) => (a.r.left - labelRect.right) - (b.r.left - labelRect.right));
        if (nearby.length) return Number(normalize(nearby[0].node.textContent || "0"));
      }

      return 0;
    }
    return null;
  }

  function findGlobalUnreadCount() {
    const title = normalize(document.title || "");
    const titleMatch = title.match(/^\((\d{1,4})\)/);
    if (titleMatch) return Number(titleMatch[1]);

    const candidates = [...document.querySelectorAll('[aria-label*="não lida" i], [aria-label*="unread" i]')];
    let best = 0;
    for (const node of candidates) {
      const label = normalize(node.getAttribute("aria-label") || "");
      const m = label.match(/\b(\d{1,4})\b/);
      if (m) best = Math.max(best, Number(m[1]));
    }
    return best || null;
  }

  function findArchivedEntry() {
    const selectors = [
      '[data-testid*="archiv" i]',
      '[aria-label*="arquiv" i]',
      '[aria-label*="archiv" i]',
      '[title*="arquiv" i]',
      '[title*="archiv" i]'
    ];

    for (const selector of selectors) {
      const nodes = [...document.querySelectorAll(selector)];
      const hit = nodes.find(el => /arquivadas|archived/i.test(normalize(el.textContent || el.getAttribute("aria-label") || el.getAttribute("title") || "")));
      if (hit) return hit.closest('[role="button"], button, [tabindex="0"]') || hit;
    }

    const textual = [...document.querySelectorAll('div, span, button')].find(el => {
      const t = lower(el.textContent || "");
      return t === "arquivadas" || t === "archived";
    });
    return textual ? (textual.closest('[role="button"], button, [tabindex="0"]') || textual) : null;
  }

  function isArchivedFolderOpen() {
    const headerTexts = [...document.querySelectorAll('header, [role="banner"], h1, h2, div, span')]
      .slice(0, 1200)
      .map(el => lower(el.textContent || ""));
    return headerTexts.some(t => t === "arquivadas" || t === "archived");
  }

  function findBackButton() {
    const selectors = [
      '[aria-label="Voltar"]',
      '[aria-label="Back"]',
      '[title="Voltar"]',
      '[title="Back"]',
      '[data-testid*="back" i]'
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) return el.closest('button, [role="button"], [tabindex="0"]') || el;
    }
    return null;
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function waitUntil(predicate, timeout = 2500, step = 100) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      try {
        if (predicate()) return true;
      } catch (_) {}
      await wait(step);
    }
    return false;
  }

  function scanArchivedFolderRows({ allowNotify }) {
    const rows = getConversationRows();
    const next = new Map();
    let unreadChats = 0;
    let totalUnread = 0;

    for (const row of rows) {
      const title = getRowTitle(row);
      if (!title || lower(title) === "arquivadas" || lower(title) === "archived") continue;
      const unread = getUnreadCount(row);
      const preview = getPreview(row, title);
      const messageTime = getRowTime(row);
      const key = rowKey(row, title);
      const prev = state.archiveFolderRows.get(key);
      next.set(key, { unread, preview, title, messageTime });

      if (unread > 0) {
        unreadChats += 1;
        totalUnread += unread;
      }

      if (allowNotify && unread > 0 && (!prev || unread > prev.unread || (messageTime && messageTime !== prev.messageTime))) {
        send({
          title,
          chatTitle: title,
          preview: preview || "Conversa arquivada não lida.",
          messageTime,
          archived: true,
          unreadCount: unread,
          archiveToken: `${lower(title)}-${messageTime || "sem-hora"}-${unread}`,
          notifyReason: !prev ? "startup-unread" : "state-became-unread",
          sessionToken: !prev ? state.sessionToken : ""
        });
      }
    }

    state.archiveFolderRows = next;
    if (!state.archiveFolderInitialized) state.archiveFolderInitialized = true;
    return { unreadChats, totalUnread };
  }

  function sendInitialArchiveSummary(count) {
    if (state.initialArchiveToastSent || !Number.isFinite(count) || count <= 0) return;
    state.initialArchiveToastSent = true;
    const plural = count === 1 ? "conversa arquivada não lida" : "conversas arquivadas não lidas";
    send({
      title: "Mensagens arquivadas",
      chatTitle: "",
      preview: `Você já possui ${count} ${plural}.`,
      messageTime: "",
      archived: true,
      unreadCount: count,
      archiveToken: `startup-${state.sessionToken}-${count}`,
      notifyReason: "startup-unread",
      sessionToken: state.sessionToken
    });
  }

  async function runInitialArchiveProbe() {
    if (state.initialArchiveProbeDone || state.initialArchiveProbeRunning) return;
    state.initialArchiveProbeRunning = true;

    try {
      // O shell do WhatsApp é montado em etapas. Por até 20 s, aguardamos o
      // item Arquivadas e tentamos ler seu contador sem alterar a interface.
      const deadline = Date.now() + 20000;
      while (Date.now() < deadline) {
        const entry = findArchivedEntry();
        const count = findArchiveUnreadCount();

        if (count !== null && count > 0) {
          state.archiveUnread = count;
          // Há pendência. Não finalizamos aqui: abrimos a pasta silenciosamente
          // para gerar toast por conversa não lida quando possível.
          break;
        }

        // Se o item já existe mas o contador continua inacessível/zero, damos
        // alguns ciclos extras antes do fallback que abre a pasta.
        if (entry && Date.now() > deadline - 12000) break;
        await wait(500);
      }

      // Fallback robusto: abre Arquivadas silenciosamente, conta as conversas
      // não lidas que o WhatsApp materializa nessa tela e retorna. Isso cobre
      // versões em que o contador da tela principal só aparece tardiamente ou
      // não expõe atributos acessíveis.
      const wasAlreadyOpen = isArchivedFolderOpen();
      let openedByExtension = false;

      if (!wasAlreadyOpen) {
        const archivedEntry = findArchivedEntry();
        if (!archivedEntry) {
          state.initialArchiveProbeDone = true;
          return;
        }
        archivedEntry.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        openedByExtension = await waitUntil(isArchivedFolderOpen, 3500, 120);
        if (!openedByExtension) {
          state.initialArchiveProbeDone = true;
          return;
        }
      }

      await wait(850);
      const stats = scanArchivedFolderRows({ allowNotify: true });
      const count = stats.unreadChats || findArchiveUnreadCount() || state.archiveUnread || 0;
      if (count > 0) {
        state.archiveUnread = count;
        // Se as linhas não puderam ser materializadas, ainda garantimos um toast
        // genérico para a pendência detectada no carregamento.
        if (stats.unreadChats === 0) sendInitialArchiveSummary(count);
      }

      if (openedByExtension) {
        const back = findBackButton();
        if (back) {
          back.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          await wait(300);
        }
      }

      state.initialArchiveProbeDone = true;
    } finally {
      state.initialArchiveProbeRunning = false;
    }
  }

  async function silentArchivePoll(force = false) {
    if (state.archivePollRunning) return;
    if (!force && !document.hidden) return;
    if (Date.now() - state.lastArchivePollAt < 3500) return;

    state.archivePollRunning = true;
    state.lastArchivePollAt = Date.now();

    const wasAlreadyOpen = isArchivedFolderOpen();
    let openedByExtension = false;

    try {
      if (!wasAlreadyOpen) {
        const archivedEntry = findArchivedEntry();
        if (!archivedEntry) return;
        archivedEntry.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        openedByExtension = await waitUntil(isArchivedFolderOpen, 2600, 120);
        if (!openedByExtension) return;
      }

      // Aguarda a lista interna terminar de materializar as linhas da pasta.
      await wait(650);
      scanArchivedFolderRows({ allowNotify: state.archiveFolderInitialized });
    } finally {
      if (openedByExtension) {
        const back = findBackButton();
        if (back) {
          back.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          await wait(250);
        }
      }
      state.archivePollRunning = false;
    }
  }

  function send(payload) {
    const safeTitle = normalize(payload.chatTitle || payload.title || "Nova mensagem");
    const safePreview = normalize(payload.preview || "");
    const messageTime = normalize(payload.messageTime || "");

    // Bloqueio rápido contra múltiplas mutações do DOM da mesma conversa.
    const burstKey = `${payload.archived ? "A" : "N"}:${lower(safeTitle)}`;
    if (dedupe(burstKey, 10000)) return;

    // Identidade lógica da mensagem. Não usa o contador de não lidas porque o
    // WhatsApp pode recalculá-lo várias vezes para a MESMA mensagem.
    const fingerprint = [
      payload.archived ? "A" : "N",
      lower(safeTitle),
      lower(safePreview),
      messageTime,
      payload.archived ? String(payload.archiveToken || payload.unreadCount || "") : "",
      payload.notifyReason === "startup-unread" ? String(payload.sessionToken || state.sessionToken) : ""
    ].join("|");

    if (!rememberFingerprint(fingerprint)) return;

    // Uma extensão Manifest V3 pode ser recarregada enquanto esta aba ainda
    // mantém o content script antigo em memória. Nesse cenário o Chrome
    // invalida o contexto e qualquer chamada direta ao runtime pode lançar
    // "Extension context invalidated". A chamada abaixo é deliberadamente
    // protegida e usa callback para também consumir runtime.lastError.
    try {
      if (!globalThis.chrome?.runtime?.id) return;
      chrome.runtime.sendMessage({
        type: "WHATSAPP_NEW_MESSAGE",
        payload: {
          ...payload,
          title: safeTitle,
          preview: safePreview,
          messageTime,
          fingerprint,
          receivedAt: Date.now()
        }
      }, () => {
        // Ler lastError impede que falhas de contexto/conexão apareçam como
        // erros não tratados no painel de extensões.
        void chrome.runtime.lastError;
      });
    } catch (_) {
      // A aba será reconectada à extensão assim que for recarregada.
    }
  }

  function notifyInitialNormalUnread(rows) {
    if (state.initialNormalScanDone) return;
    let foundAny = false;

    for (const row of rows) {
      const title = getRowTitle(row);
      if (!title || lower(title) === "arquivadas" || lower(title) === "archived") continue;
      const unread = getUnreadCount(row);
      if (unread <= 0 && !isRowUnread(row)) continue;

      foundAny = true;
      const preview = getPreview(row, title);
      const messageTime = getRowTime(row);
      send({
        title,
        chatTitle: title,
        preview: preview || "Conversa marcada como não lida.",
        messageTime,
        archived: false,
        unreadCount: unread || 1,
        notifyReason: "startup-unread",
        sessionToken: state.sessionToken
      });
    }

    // Marcamos após a primeira lista útil ser observada. Se o WhatsApp ainda não
    // materializou nenhuma linha, permitimos que scans seguintes tentem novamente.
    if (rows.length > 0 || foundAny) state.initialNormalScanDone = true;
  }

  function scan() {
    const rows = getConversationRows();

    // Quando a pasta Arquivadas está aberta, as linhas visíveis pertencem a ela.
    // Tratamos esse estado separadamente para que marcações manuais como não lida
    // também gerem toast com archived=true e não sejam confundidas com a lista normal.
    if (isArchivedFolderOpen()) {
      scanArchivedFolderRows({ allowNotify: true });
      state.initialized = true;
      return;
    }

    notifyInitialNormalUnread(rows);
    const next = new Map();
    let normalTriggered = false;

    for (const row of rows) {
      const title = getRowTitle(row);
      if (!title || lower(title) === "arquivadas" || lower(title) === "archived") continue;
      const rawUnread = getUnreadCount(row);
      const unread = rawUnread > 0 || isRowUnread(row) ? Math.max(rawUnread, 1) : 0;
      const preview = getPreview(row, title);
      const messageTime = getRowTime(row);
      const key = rowKey(row, title);
      const prev = state.rows.get(key);
      next.set(key, { unread, preview, title, messageTime });

      const becameUnread = state.initialized && unread > 0 && (!prev || prev.unread === 0 || unread > prev.unread);
      const unreadGotNewContent = state.initialized && unread > 0 && prev && messageTime && prev.messageTime && messageTime !== prev.messageTime;
      if (becameUnread || unreadGotNewContent) {
        normalTriggered = true;
        send({
          title,
          chatTitle: title,
          preview: preview || (becameUnread ? "Conversa marcada como não lida." : "Nova mensagem."),
          messageTime,
          archived: false,
          unreadCount: unread,
          notifyReason: becameUnread ? "state-became-unread" : "new-message"
        });
      }
    }

    const archiveUnread = findArchiveUnreadCount();
    const globalUnread = findGlobalUnreadCount();
    let archiveTriggered = false;

    // Caso principal: o contador ao lado de "Arquivadas" aumentou.
    if (!document.hidden && state.initialized && archiveUnread !== null && state.archiveUnread !== null && archiveUnread > state.archiveUnread) {
      archiveTriggered = true;
      send({
        title: "Conversa arquivada",
        chatTitle: "",
        preview: "Chegou uma nova mensagem em uma conversa arquivada.",
        messageTime: "",
        archived: true,
        unreadCount: archiveUnread,
        archiveToken: `count-${archiveUnread}-${Date.now()}`
      });
    }

    // Fallback: se o total global de não lidas aumentou, nenhuma conversa
    // normal detectada justificou o aumento e há arquivadas não lidas,
    // tratamos o evento como possível chegada em arquivada.
    if (!document.hidden && !archiveTriggered && !normalTriggered && state.initialized &&
        globalUnread !== null && state.globalUnread !== null &&
        globalUnread > state.globalUnread && (archiveUnread || state.archiveUnread)) {
      send({
        title: "Conversa arquivada",
        chatTitle: "",
        preview: "Chegou uma nova mensagem que pode estar em uma conversa arquivada.",
        messageTime: "",
        archived: true,
        unreadCount: archiveUnread || state.archiveUnread || 1,
        archiveToken: `global-${globalUnread}-${Date.now()}`
      });
    }

    state.rows = next;
    if (archiveUnread !== null) state.archiveUnread = archiveUnread;
    if (globalUnread !== null) state.globalUnread = globalUnread;
    state.initialized = true;
  }

  function scheduleScan() {
    clearTimeout(state.debounce);
    state.debounce = setTimeout(scan, 250);
  }

  function openChatByTitle(title) {
    if (!title) return;
    const needle = lower(title);
    const rows = getConversationRows();
    const row = rows.find(r => lower(getRowTitle(r)) === needle);
    if (row) {
      const clickable = row.querySelector('[role="button"]') || row;
      clickable.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    }
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || typeof message !== "object") return;
    if (message.type === "OPEN_CHAT_BY_TITLE") openChatByTitle(message.title || "");
    if (message.type === "ARCHIVE_BACKGROUND_POLL") silentArchivePoll(true);
  });

  const observer = new MutationObserver(scheduleScan);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["aria-label", "title", "data-testid"]
  });

  setTimeout(scan, 1200);
  setTimeout(runInitialArchiveProbe, 1600);
  setInterval(scan, 8000);

  // Conversas arquivadas podem não atualizar o contador no DOM principal
  // enquanto a aba está em segundo plano. Quando o WhatsApp estiver oculto,
  // a extensão abre a pasta Arquivadas de forma silenciosa, lê os não lidos e
  // retorna à tela anterior. O intervalo local dá resposta rápida; o alarme do
  // service worker funciona como redundância contra throttling de abas ocultas.
  setInterval(() => silentArchivePoll(false), 5000);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) setTimeout(() => silentArchivePoll(false), 1200);
  });
})();
