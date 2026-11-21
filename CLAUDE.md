# CLAUDE.md · E-Rechnung Kit (`tirlogy/einvoice-kit`)

Lies zuerst `KONZEPT.md` und `PLAN.md`. Dort steht verbindlich, was gebaut wird.

## Projekt in einem Satz
ZUGFeRD- und XRechnung-Dateien im Browser anzeigen, prüfen, erstellen und konvertieren. Als npm-Paket und Web-App, ohne dass eine Rechnung das Gerät verlässt.

## Besonderheiten dieses Projekts
- Sichtbarkeit des Repos: öffentlich
- Lizenz: MIT (LICENSE-Datei anlegen, SPDX-Header in Quelldateien)
- Demo-Adresse (später): erechnung.tiryaki.eu
- Framework für die Web-App: Vite + React + TypeScript empfohlen, du darfst begründet abweichen (ADR)
- PDF/A-3: pdf-lib mit XMP-Metadaten, OutputIntent (sRGB-ICC) und eingebetteten Schriften, Factur-X-Anhang `factur-x.xml` bzw. `xrechnung.xml` mit AFRelationship
- Regelwerke: aktuelle Versionen von EN 16931 (CEN/TC 434) und XRechnung (KoSIT) gepinnt, Update-Skript dokumentiert
- Keine Netzwerkanfragen mit Rechnungsdaten (Test, der das prüft)

---

## Gemeinsame Regeln für alle Portfolio-Projekte von Ömer Tiryaki

Diese Regeln gelten zusätzlich zu den projektspezifischen Abschnitten oben. Bei Widerspruch gilt der projektspezifische Teil.

### 1. Autonomie: durcharbeiten ohne Rückfragen
Ömer möchte, dass du das Projekt **von Anfang bis Ende ohne Rückfragen** baust. Deshalb gilt:

**Ohne Rückfrage erlaubt:**
- Repo anlegen (öffentlich unter `tirlogy`, außer das Konzept sagt „privat“), Code, Tests, Doku, Konfiguration
- Commits und Pushes auf den Branch `build` (nie direkt auf `main`)
- Deploy auf eine **Vorschau-Adresse** (Cloudflare Preview / `*.pages.dev` / `*.workers.dev`)
- Kostenlose Abhängigkeiten und Gratis-Tarife nutzen (Cloudflare Free, GitHub Actions für öffentliche Repos usw.)
- Technische Entscheidungen innerhalb der Leitplanken des Konzepts treffen

**Nicht erlaubt (stattdessen in `OFFEN.md` eintragen und weiterarbeiten):**
- Merge nach `main`, Deploy auf die Produktiv-Domain, DNS-Änderungen
- Alles, was Geld kostet oder eine Zahlungsmethode braucht
- Veröffentlichung in Stores und Registries (npm, WordPress.org, Shopify App Store, MCP-Verzeichnis). Du bereitest alles vor, Ömer veröffentlicht.
- Zugriff auf echte Postfächer, echte Kundendaten oder echte Firmendaten
- Konten in Ömers Namen anlegen

**Wenn etwas unklar ist:**
1. Entscheide nach den Prinzipien in dieser Datei und im Konzept.
2. Dokumentiere die Entscheidung als ADR in `docs/adr/NNNN-titel.md` (Kontext, Entscheidung, Alternativen, Folgen).
3. Arbeite weiter. **Stelle keine Frage.**

**Wenn etwas blockiert** (fehlendes Konto, fehlender Schlüssel, fehlende Hardware):
- Baue gegen einen Mock oder Simulator weiter, damit alles testbar bleibt.
- Trage in `OFFEN.md` ein, was Ömer tun muss, mit genauen Schritten.

**Am Ende jedes Meilensteins** aus `PLAN.md`: Häkchen in `PLAN.md` setzen, kurzer Eintrag in `FORTSCHRITT.md` (was gebaut, was getestet, welche ADRs), dann direkt mit dem nächsten Meilenstein weitermachen.

**Fertig** ist das Projekt erst, wenn alle Akzeptanzkriterien in `PLAN.md` erfüllt sind, die CI grün ist und die Abschluss-Dateien (Abschnitt 6) existieren.

### 2. Kosten
Ziel: **0 € laufende Kosten.** Bevorzugt Cloudflare Free (Pages, Workers, D1, R2, KV, Durable Objects auf SQLite, Workers AI, Email Routing, Turnstile). Free-Tier-Limits im README dokumentieren. Bei drohender Überschreitung: Limitierung einbauen, nicht upgraden.

### 3. Sprache
- Code, Kommentare, Commits, Issues und ADRs auf **Englisch**
- `README.md` auf Englisch, dazu eine kürzere `README.de.md`
- Oberflächen für Endnutzer in **Deutsch, Englisch und Türkisch** (außer das Konzept sagt etwas anderes). Standard ist die Browsersprache, sonst Englisch.
- Deutsche Texte: „KI“ statt „AI“, keine Gedankenstriche als Satztrenner, sachlich, ohne Floskeln
- Türkische Texte mit korrekten Sonderzeichen, `toLocaleUpperCase('tr')` beachten

### 4. Design
Du entscheidest das Design pro App selbst, passend zum Zweck. Pflicht:
- WCAG 2.1 AA (Kontraste prüfen, Tastaturbedienung, Screenreader-Labels)
- Dunkel- und Hellmodus, Standard nach System
- Mobil zuerst, Lighthouse Mobile Performance ≥ 90, Accessibility = 100
- Dokumentiere Farben, Schrift und Komponenten in `docs/DESIGN.md`
- Keine Marken, Logos oder Namen echter Firmen in Demos (alles fiktiv)

### 5. Qualitätsstandard (voll)
- TypeScript `strict` bzw. C# mit `Nullable enable` bzw. PHP mit `declare(strict_types=1)` und PHPStan Level 8
- Unit-Tests für die Kernlogik, **Abdeckung ≥ 80 %** (in der CI erzwungen)
- Mindestens ein E2E-Test (Playwright) für den Hauptablauf
- GitHub Actions: Lint, Typecheck, Test, Build, Coverage, Lighthouse (bei Web-Apps), Dependabot
- Conventional Commits, `CHANGELOG.md` (Keep a Changelog), SemVer, Release-Tag `v1.0.0` am Ende
- README mit Badges (CI, Coverage, Lizenz, Version), Screenshot oder GIF, Architektur-Diagramm (Mermaid), Schnellstart, Konfiguration, Free-Tier-Limits, Lizenz
- `docs/adr/`: mindestens 3 ADRs zu den wichtigsten Entscheidungen
- `SECURITY.md`, `CONTRIBUTING.md`, Issue- und PR-Vorlagen
- Keine Secrets im Repo. `.env.example` mit allen Variablen.

### 6. Abschluss-Dateien (Pflicht)
1. **`portfolio.json`** im Repo-Root nach `_gemeinsam/portfolio.schema.json`. tiryaki.eu liest sie beim Build ein. Felder vollständig ausfüllen, Screenshots unter `docs/screenshots/` ablegen.
2. **Fallstudie** (nur bei Flaggschiffen): `docs/fallstudie.de.mdx` mit Problem, Lösung, Architektur, Stack, Learnings und Kennzahlen (Tests, Performance, Bundle-Größe). Ömer übernimmt sie nach tiryaki.eu.
3. **`ERKLAERT.md`** (privat, steht in `.gitignore`, wird **nie** committet), auf Deutsch für Ömer:
   - Architektur in einfachen Worten (für ein Gespräch mit Personalern und mit Entwicklern)
   - Die 5 wichtigsten Code-Stellen: Datei, Zeilen, was passiert, warum so gelöst
   - Jede ADR in zwei Sätzen
   - 10 typische Interviewfragen zu diesem Projekt mit guten Antworten
   - „Was ich als Nächstes verbessern würde“ (3 Punkte)
4. **`OFFEN.md`**: alles, was Ömer noch tun muss (Konten, Veröffentlichung, Merge, DNS), als Checkliste mit genauen Schritten.

### 7. Sicherheit und Datenschutz
- Eingaben validieren (zod o. ä.), Rate-Limits auf allen öffentlichen Endpunkten, Turnstile bei Formularen
- Strikte CSP und Security-Header
- Personenbezogene Demo-Daten automatisch löschen (Frist steht im Konzept)
- Kurze Datenschutzseite in der App, Impressum-Link auf https://tiryaki.eu/impressum

### 8. Bezug zu tiryaki.eu
- Footer jeder App: „Built by Ömer Tiryaki · tiryaki.eu“ mit Link
- Nutze für die Demo die im Konzept genannte Subdomain. Bis zum Go-live bleibt es bei der Vorschau-Adresse, die Domain trägt Ömer ein (OFFEN.md).

