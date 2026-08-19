# UptimeWatch

Dashboard de monitoring de sites web, 100% automatisé, hébergé gratuitement sur GitHub (Actions + Pages, zéro serveur).

**Démo :** une fois déployé, ton dashboard vit à `https://<ton-user>.github.io/uptimewatch/`

## Ce que ça fait

- Un script Node.js (`scripts/check.mjs`) vérifie une liste de sites (`data/sites.json`) :
  - statut HTTP (en ligne / hors ligne)
  - temps de réponse
  - jours restants avant expiration du certificat SSL
- Un workflow GitHub Actions (`.github/workflows/monitor.yml`) lance ce script **toutes les 30 minutes** et commit automatiquement les résultats dans `data/history.json` et `data/latest.json`.
- Un dashboard statique (`index.html` / `style.css` / `app.js`) lit ces fichiers JSON et affiche l'état de chaque site avec :
  - un indicateur de disponibilité en temps réel
  - une "sparkline" des 30 derniers checks
  - la latence moyenne et l'expiration SSL

Aucune dépendance npm, aucun backend à héberger, aucune base de données : GitHub est à la fois le CRON, la base de données (via git) et l'hébergeur (via Pages).

## Stack

- Node.js 20 (fetch + tls natifs)
- GitHub Actions (automatisation / cron)
- HTML / CSS / JS vanilla (dashboard)
- GitHub Pages (hébergement)

## Installation

```bash
git clone https://github.com/<ton-user>/uptimewatch.git
cd uptimewatch
node scripts/check.mjs   # lance un check manuel en local
```

## Déploiement

1. Push ce repo sur GitHub.
2. Dans **Settings → Pages**, choisis la branche `main` et le dossier `/ (root)`.
3. Dans **Settings → Actions → General**, vérifie que "Read and write permissions" est activé pour le `GITHUB_TOKEN` (nécessaire pour que le workflow puisse commit les résultats).
4. Va dans l'onglet **Actions** et lance le workflow "Monitor sites" manuellement une première fois (`Run workflow`) pour générer les premières données.
5. Attends ~30 min ou relance manuellement, puis va sur ton dashboard.

## Personnaliser

Édite `data/sites.json` pour surveiller tes propres sites (ex. ta boutique Shopify, ton portfolio, etc.) :

```json
[
  { "id": "boutique", "name": "Heaven of Comfort", "url": "https://heavenofcomfort.com" }
]
```

Change la fréquence dans `.github/workflows/monitor.yml` en modifiant la ligne `cron`.

## Pourquoi ce projet

Construit pour illustrer trois choses en même temps : dev web (dashboard), automatisation (checks planifiés sans serveur), et une base de sécurité réseau (vérification des certificats SSL, détection de panne).
