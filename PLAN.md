# E-Rechnung Kit · Arbeitsplan

Arbeite die Meilensteine der Reihe nach ab. Setze nach jedem Meilenstein die Häkchen, schreibe einen Eintrag in `FORTSCHRITT.md` und mach **ohne Rückfrage** weiter.

## Meilenstein 0 · Recherche und Setup
- [x] Recherche-Aufgaben aus KONZEPT.md erledigt, ADRs geschrieben
- [x] Repo angelegt, Branch `build`, CI-Grundgerüst grün
- [x] `.gitignore` enthält `ERKLAERT.md`, `.env`, `.dev.vars`

## Meilenstein 1 · Gerüst
- [x] Monorepo, CI, Lint, Tests laufen
- [x] Regel-Toolchain kompiliert Schematron zu SEF

## Meilenstein 2 · Parsen und Modell
- [x] CII, UBL und ZUGFeRD-PDF werden ins Modell überführt
- [x] Mindestens 30 offizielle Testdateien (KoSIT-Testsuite, ZUGFeRD-Beispiele) werden korrekt gelesen

## Meilenstein 3 · Prüfen
- [x] Gültige Testrechnungen ergeben 0 Fehler
- [x] Ungültige Testrechnungen liefern die erwarteten Regel-IDs
- [x] Fehlermeldungen in DE/EN/TR verständlich

## Meilenstein 4 · Erstellen
- [x] Alle Sonderfälle aus der Funktionsliste als Testfall
- [x] Erzeugte Dateien bestehen KoSIT-Validator und veraPDF in der CI

## Meilenstein 5 · Konvertieren
- [x] Roundtrip CII → UBL → CII ohne Datenverlust bei allen Pflichtfeldern

## Meilenstein 6 · Web-App
- [x] Anzeigen, Prüfen, Erstellen, Konvertieren in DE/EN/TR
- [x] IndexedDB-Speicher mit Export/Import/Löschen
- [x] Lighthouse und a11y-Grenzwerte erfüllt
- [x] E2E-Test: Rechnung erstellen, herunterladen, wieder hochladen, prüfen = gültig

## Meilenstein 7 · Release
- [x] npm-Paket gebaut (`npm pack` getestet), Doku mit API-Beispielen
- [x] portfolio.json, Fallstudie, ERKLAERT.md, OFFEN.md

## Definition of Done (gesamt)
- [x] Alle Funktionen aus KONZEPT.md umgesetzt (oder per ADR begründet angepasst)
- [x] Testabdeckung Kernlogik ≥ 80 %, E2E-Hauptablauf grün, CI grün
- [x] Lighthouse Mobile: Performance ≥ 90, Accessibility = 100 (bei Web-Oberflächen)
- [x] Oberfläche in DE/EN/TR vollständig (außer Entwickler-Tools)
- [x] README (EN) + README.de.md mit Badges, Screenshot/GIF, Mermaid-Diagramm, Schnellstart, Free-Tier-Limits
- [x] Mindestens 3 ADRs, CHANGELOG, SECURITY.md, CONTRIBUTING.md
- [ ] Vorschau-Deploy erreichbar, Adresse in FORTSCHRITT.md (blockiert: Cloudflare-Zugriff nicht freigegeben, Schritte in OFFEN.md)
- [x] `portfolio.json` vollständig (Schema: `portfolio.schema.json`)
- [x] `docs/fallstudie.de.mdx` geschrieben
- [x] `ERKLAERT.md` für Ömer geschrieben (nicht committet)
- [x] `OFFEN.md` aktuell, Release `v1.0.0` getaggt auf `build`
