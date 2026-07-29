// Busca a configuração salva pelo painel admin (/api/config) e mescla com
// os valores padrão de data.js. Se a API não responder (ex: ainda rodando
// local sem Functions), cai nos valores padrão sem quebrar o site.

function getSiteId() {
  if (window.SITE_ID) return window.SITE_ID;
  const m = location.pathname.match(/^\/([^\/]+)\//);
  return m ? m[1] : null;
}

async function loadSiteConfig() {
  const siteId = getSiteId();
  const url = siteId ? `/api/config?site=${encodeURIComponent(siteId)}` : "/api/config";
  const timeout = new Promise(resolve => setTimeout(() => resolve(null), 2000));
  try {
    const res = await Promise.race([fetch(url), timeout]);
    if (!res || !res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

// personasList (array, CRUD completo pelo admin) tem prioridade; se não
// existir ainda, cai no formato antigo (overrides por id fixo) ou nos
// padrões de data.js.
function mergedPersonas(config) {
  if (config && Array.isArray(config.personasList) && config.personasList.length > 0) {
    return config.personasList;
  }
  const overrides = (config && config.personas) || {};
  return PERSONAS.map(p => ({ ...p, ...(overrides[p.id] || {}) }));
}

function findFlowForPersona(config, personaId) {
  const flows = (config && config.flows) || {};
  return Object.values(flows).find(f => Array.isArray(f.personaIds) && f.personaIds.includes(personaId)) || null;
}

function applyLogo(config) {
  const el = document.getElementById("logoSlot");
  if (!el) return;
  const logo = config && config.logo;
  if (logo && logo.type === "image" && logo.value) {
    el.innerHTML = `<img src="${logo.value}" alt="logo" class="brand-logo-img" />`;
  } else {
    el.textContent = (logo && logo.value) || "chats";
  }
}

function applyColors(config) {
  const c = (config && config.colors) || {};
  const root = document.documentElement;
  const map = {
    "--bg":             c.bg,
    "--bg-alt":         c.bgAlt,
    "--blue":           c.blue,
    "--text":           c.text,
    "--bubble-them":    c.bubbleThem,
    "--bubble-me-from": c.bubbleMeFrom,
    "--bubble-me-to":   c.bubbleMeTo,
  };
  for (const [prop, val] of Object.entries(map)) {
    if (val) root.style.setProperty(prop, val);
    else root.style.removeProperty(prop);
  }
}

function applyBackground(config) {
  const el = document.getElementById("messages");
  if (!el) return;
  if (config && config.background) {
    el.style.backgroundImage = `url("${config.background}")`;
    el.style.backgroundSize = "cover";
    el.style.backgroundPosition = "center";
  }
}
