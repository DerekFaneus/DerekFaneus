async function loadData() {
  const res = await fetch("data/latest.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Impossible de charger data/latest.json");
  return res.json();
}

function formatDate(iso) {
  if (!iso) return "jamais";
  const d = new Date(iso);
  return d.toLocaleString("fr-CA", { dateStyle: "medium", timeStyle: "short" });
}

function renderSparkline(bits) {
  const bars = bits.length ? bits : Array(30).fill(null);
  return `<div class="sparkline">${bars
    .map((b) => `<span class="sparkline__bar ${b === 1 ? "up" : b === 0 ? "down" : ""}"></span>`)
    .join("")}</div>`;
}

function renderCard(site) {
  const statusClass = site.ok ? "up" : "down";
  const sslWarn = site.sslDaysRemaining !== null && site.sslDaysRemaining < 14;
  return `
    <article class="card">
      <div class="card__top">
        <div>
          <div class="card__name">${site.name}</div>
          <a class="card__url" href="${site.url}" target="_blank" rel="noopener">${site.url}</a>
        </div>
        <span class="pill ${statusClass}">${site.ok ? "EN LIGNE" : "HORS LIGNE"}</span>
      </div>

      ${renderSparkline(site.sparkline)}

      <div class="card__stats">
        <div>
          <div class="stat-label">DISPONIBILITÉ</div>
          <div class="stat-value">${site.uptimePercent ?? "—"}%</div>
        </div>
        <div>
          <div class="stat-label">LATENCE MOY.</div>
          <div class="stat-value">${site.avgResponseMs ?? "—"} ms</div>
        </div>
        <div>
          <div class="stat-label">SSL EXPIRE</div>
          <div class="stat-value ${sslWarn ? "warn" : ""}">${
    site.sslDaysRemaining !== null ? site.sslDaysRemaining + " j" : "n/a"
  }</div>
        </div>
      </div>
    </article>
  `;
}

async function main() {
  const grid = document.getElementById("site-grid");
  const overallDot = document.getElementById("overall-dot");
  const overallLabel = document.getElementById("overall-label");
  const lastSync = document.getElementById("last-sync");

  try {
    const data = await loadData();

    if (!data.sites.length) {
      grid.innerHTML = `<div class="empty">Aucune donnée pour l'instant — le premier run GitHub Actions n'a pas encore eu lieu.<br/>Lance-le manuellement depuis l'onglet Actions du repo.</div>`;
      overallLabel.textContent = "En attente";
      lastSync.textContent = "dernière synchro : —";
      return;
    }

    const allUp = data.sites.every((s) => s.ok);
    overallDot.classList.add(allUp ? "up" : "down");
    overallLabel.textContent = allUp ? "Tous les systèmes fonctionnent" : "Incident détecté";
    lastSync.textContent = `dernière synchro : ${formatDate(data.lastRun)}`;

    grid.innerHTML = data.sites.map(renderCard).join("");
  } catch (err) {
    grid.innerHTML = `<div class="empty">Erreur de chargement des données : ${err.message}</div>`;
  }
}

main();
