// Serve páginas de campanha dinamicamente para qualquer rota /[site]/*
// Ex: /02/ → index.html com window.SITE_ID="02"
//     /02/chat.html → chat.html com window.SITE_ID="02"
//     /02/admin.html → admin.html com window.SITE_ID="02"

// Slugs que não são campanhas — deixa o Cloudflare servir o arquivo estático
const RESERVED = new Set([
  "api", "functions", "admin", "admin.html",
  "index", "index.html", "chat", "chat.html",
  "styles.css", "admin.css", "script.js", "chat.js", "admin.js",
  "config-store.js", "data.js", "flow-editor.js", "icons.js",
  "sound-effects.js", "viewport-fix.js",
]);

const PAGE_MAP = {
  "":           "index.html",
  "index.html": "index.html",
  "chat.html":  "chat.html",
  "admin.html": "admin.html",
};

export async function onRequest(context) {
  const site = context.params.site;

  // Passa para o handler estático se for caminho reservado ou extensão de arquivo
  if (RESERVED.has(site) || /\.[a-z0-9]+$/i.test(site)) {
    return context.next();
  }

  const catchall = context.params.catchall;
  const rawPath = Array.isArray(catchall) ? catchall.join("/") : (catchall || "");
  const page = PAGE_MAP[rawPath] || "index.html";

  const origin = new URL(context.request.url).origin;
  const search = new URL(context.request.url).search;

  const assetResp = await context.env.ASSETS.fetch(
    new Request(`${origin}/${page}${search}`)
  );

  if (!assetResp.ok) {
    return new Response("Not found", { status: 404 });
  }

  let html = await assetResp.text();

  // Injeta SITE_ID antes do primeiro <script>
  html = html.replace(
    /(<script\b)/,
    `<script>window.SITE_ID="${site}";</script>\n$1`
  );

  // Converte caminhos de assets relativos em absolutos (CSS, JS)
  html = html.replace(/\bsrc="(?!http|\/\/)([^"]+)"/g, 'src="/$1"');
  html = html.replace(/\bhref="(?!http|\/\/|#)([^"]+\.css[^"]*)"/g, 'href="/$1"');

  return new Response(html, {
    headers: {
      "content-type": "text/html;charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
