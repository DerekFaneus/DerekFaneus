// scripts/check.mjs
// Vérifie chaque site (statut HTTP, temps de réponse, expiration du certificat SSL)
// puis met à jour data/history.json et data/latest.json.
// Aucune dépendance externe : fetch + tls + fs natifs de Node 20+.

import { readFile, writeFile } from "node:fs/promises";
import { connect } from "node:tls";
import { URL } from "node:url";

const SITES_PATH = new URL("../data/sites.json", import.meta.url);
const HISTORY_PATH = new URL("../data/history.json", import.meta.url);
const LATEST_PATH = new URL("../data/latest.json", import.meta.url);

const TIMEOUT_MS = 10_000;
const MAX_HISTORY_PER_SITE = 200;

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf-8"));
  } catch {
    return fallback;
  }
}

function getSslExpiry(hostname) {
  return new Promise((resolve) => {
    const socket = connect(
      { host: hostname, port: 443, servername: hostname, timeout: TIMEOUT_MS, rejectUnauthorized: false },
      () => {
        const cert = socket.getPeerCertificate();
        socket.end();
        if (!cert || !cert.valid_to) return resolve(null);
        const daysLeft = Math.round((new Date(cert.valid_to).getTime() - Date.now()) / 86_400_000);
        resolve(daysLeft);
      }
    );
    socket.on("timeout", () => { socket.destroy(); resolve(null); });
    socket.on("error", () => resolve(null));
  });
}

async function checkSite(site) {
  const start = performance.now();
  let status = null;
  let ok = false;
  let error = null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(site.url, { method: "GET", redirect: "follow", signal: controller.signal });
    clearTimeout(timer);
    status = res.status;
    ok = res.ok;
  } catch (e) {
    error = e.message;
  }

  const responseTimeMs = Math.round(performance.now() - start);
  let sslDaysRemaining = null;
  if (site.url.startsWith("https://")) {
    sslDaysRemaining = await getSslExpiry(new URL(site.url).hostname);
  }

  return {
    timestamp: new Date().toISOString(),
    ok,
    status,
    error,
    responseTimeMs,
    sslDaysRemaining,
  };
}

function computeUptime(entries) {
  if (!entries.length) return null;
  const upCount = entries.filter((e) => e.ok).length;
  return Math.round((upCount / entries.length) * 1000) / 10; // % avec 1 décimale
}

async function main() {
  const sites = await readJson(SITES_PATH, []);
  const history = await readJson(HISTORY_PATH, {});
  const latestSites = [];

  for (const site of sites) {
    const result = await checkSite(site);
    const entries = history[site.id] || [];
    entries.push(result);
    if (entries.length > MAX_HISTORY_PER_SITE) entries.splice(0, entries.length - MAX_HISTORY_PER_SITE);
    history[site.id] = entries;

    latestSites.push({
      id: site.id,
      name: site.name,
      url: site.url,
      ...result,
      uptimePercent: computeUptime(entries),
      avgResponseMs: Math.round(
        entries.reduce((sum, e) => sum + (e.responseTimeMs || 0), 0) / entries.length
      ),
      sparkline: entries.slice(-30).map((e) => (e.ok ? 1 : 0)),
    });

    console.log(`[${site.name}] ${result.ok ? "UP" : "DOWN"} — ${result.status ?? "n/a"} — ${result.responseTimeMs}ms`);
  }

  await writeFile(HISTORY_PATH, JSON.stringify(history, null, 2));
  await writeFile(LATEST_PATH, JSON.stringify({ lastRun: new Date().toISOString(), sites: latestSites }, null, 2));
}

main().catch((err) => {
  console.error("Erreur fatale dans check.mjs :", err);
  process.exit(1);
});
