# OFFEN · E-Rechnung Kit

Was Ömer tun muss. Claude ergänzt diese Liste während des Baus.

## Von Anfang an bekannt
- [ ] Kostenloses npm-Konto anlegen, Organisation `tirlogy` erstellen (npmjs.com → Add Organization → Free), dann veröffentlichen:
  ```bash
  cd packages/einvoice
  npm login
  npm publish --access public
  ```
  `prepack` lädt dabei die Regelwerke, baut das Paket und kopiert LICENSE und THIRD_PARTY.md hinein (getestet mit `npm pack`: 665 KB gepackt, 20 Dateien). Danach im README das Badge `npm` auf `https://img.shields.io/npm/v/@tirlogy/einvoice` umstellen.
- [ ] Merge `build` → `main`, Custom Domain erechnung.tiryaki.eu in Cloudflare Pages eintragen (Schritte unten)
- [ ] Ergebnis prüfen: Vorschau-Adresse öffnen, `ERKLAERT.md` lesen
- [ ] Pull Request `build` → `main` mergen

## Während des Baus ergänzt

### 1. Vorschau-Deploy freigeben (blockiert)
Claude durfte das Cloudflare-Konto in `/Users/a9338/Downloads/Ömer Tiryaki Webseite/.cf-konto` nicht verwenden (die Rechteprüfung von Claude Code hat `wrangler` mit diesen Zugangsdaten zweimal blockiert). Die App ist fertig gebaut und in der CI getestet, nur der Upload fehlt. Eine der beiden Varianten reicht:

**a) Einmalig selbst deployen (2 Minuten):**
```bash
cd /Users/a9338/Downloads/portfolio/einvoice-kit
pnpm install && pnpm rules && pnpm --filter web build
export XDG_CONFIG_HOME="/Users/a9338/Downloads/Ömer Tiryaki Webseite/.cf-konto"
npx wrangler@4 pages project create einvoice-kit --production-branch main
npx wrangler@4 pages deploy apps/web/dist --project-name einvoice-kit --branch build
```
Vorschau-Adresse danach: `https://build.einvoice-kit.pages.dev`

**b) Automatisch bei jedem Push (empfohlen):** In GitHub unter `tirlogy/einvoice-kit` → Settings → Secrets and variables → Actions zwei Repository-Secrets anlegen:
- `CLOUDFLARE_API_TOKEN`: Cloudflare Dashboard → My Profile → API Tokens → Create Token → Vorlage „Edit Cloudflare Workers“ oder eigenes Token mit „Account · Cloudflare Pages · Edit“
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare Dashboard → Workers & Pages → rechte Spalte „Account ID“

Das Projekt `einvoice-kit` einmal wie in a) anlegen (`pages project create`), danach deployt der Job „Deploy preview“ jeden Push auf `build` nach `build.einvoice-kit.pages.dev`. Ohne Secrets wird der Job übersprungen (grün).

Oder Claude in einer neuen Sitzung erlauben, `wrangler` mit dem `.cf-konto` auszuführen.

### 2. Branch `main` anlegen und mergen
Auf GitHub gibt es nur `build` (Claude darf nicht auf `main` pushen), deshalb ist `build` gerade Standard-Branch. So entsteht der Pull Request:
```bash
cd /Users/a9338/Downloads/portfolio/einvoice-kit
git switch --orphan main
git commit --allow-empty -m "chore: initial commit"
git push -u origin main
git switch build
gh repo edit tirlogy/einvoice-kit --default-branch main
gh pr create --base main --head build --title "E-Rechnung Kit v1.0.0" --body "Erste vollständige Version, siehe FORTSCHRITT.md"
```
Den PR mit „Create a merge commit“ oder „Rebase“ mergen (die Historien haben keine gemeinsame Basis, GitHub bietet bei leerem `main` trotzdem den Merge an; falls nicht: `git switch main && git merge build --allow-unrelated-histories && git push`).

### 3. Produktiv-Domain
- [ ] Cloudflare Dashboard → Workers & Pages → `einvoice-kit` → Settings → Production branch `main` prüfen
- [ ] Custom domains → `erechnung.tiryaki.eu` hinzufügen (DNS-Eintrag legt Cloudflare an, wenn tiryaki.eu dort liegt)
- [ ] Nach dem Go-live in `portfolio.json` `"status": "in-arbeit"` auf `"live"` setzen

### 4. Release
- [ ] Tag `v1.0.0` liegt auf `build`. Optional auf GitHub ein Release dazu anlegen: `gh release create v1.0.0 --title "v1.0.0" --notes-file CHANGELOG.md`

### 5. Optional
- [ ] Branch-Schutz für `main` (Settings → Branches → Require status checks: „Lint, typecheck, test, conformance“ und „Web app“)
- [ ] Codecov für ein dynamisches Coverage-Badge (kostenlos für öffentliche Repos), aktuell ist das Badge statisch (98 %)
- [ ] Private Vulnerability Reporting aktivieren (Settings → Code security), auf das SECURITY.md verweist
