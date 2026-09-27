const DEFAULTS = {
  enabled: true,
  archived: true,
  sound: true,
  showPreview: true,
  duration: 10,
  desktopFallback: false
};

const ids = Object.keys(DEFAULTS);
let saveTimer;

async function load() {
  const data = await chrome.storage.sync.get(DEFAULTS);
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (el.type === "checkbox") el.checked = Boolean(data[id]);
    else el.value = data[id];
  }
}

async function save() {
  const data = {};

  for (const id of ids) {
    const el = document.getElementById(id);

    // Alguns valores persistidos podem não ter um campo editável na tela.
    // Ex.: duration é fixa em 10 segundos desde a v1.2.0.
    if (!el) continue;

    data[id] = el.type === "checkbox" ? el.checked : Number(el.value);
  }

  // A duração do toast é fixa e não depende de um elemento no options.html.
  data.duration = 10;

  await chrome.storage.sync.set(data);

  const savedEl = document.getElementById("saved");
  if (!savedEl) return;

  savedEl.classList.add("show");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => savedEl.classList.remove("show"), 1000);
}

document.addEventListener("change", save);
load();
