# E-Rechnung Kit · Arbeitsplan

Arbeite die Meilensteine der Reihe nach ab. Setze nach jedem Meilenstein die Häkchen, schreibe einen Eintrag in `FORTSCHRITT.md` und mach **ohne Rückfrage** weiter.

## Meilenstein 0 · Recherche und Setup
- [ ] Recherche-Aufgaben aus KONZEPT.md erledigt, ADRs geschrieben
- [ ] Repo angelegt, Branch `build`, CI-Grundgerüst grün
- [ ] `.gitignore` enthält `ERKLAERT.md`, `.env`, `.dev.vars`

## Meilenstein 1 · Gerüst
- [ ] Monorepo, CI, Lint, Tests laufen
- [ ] Regel-Toolchain kompiliert Schematron zu SEF

## Meilenstein 2 · Parsen und Modell
- [ ] CII, UBL und ZUGFeRD-PDF werden ins Modell überführt
- [ ] Mindestens 30 offizielle Testdateien (KoSIT-Testsuite, ZUGFeRD-Beispiele) werden korrekt gelesen

## Meilenstein 3 · Prüfen
- [ ] Gültige Testrechnungen ergeben 0 Fehler
- [ ] Ungültige Testrechnungen liefern die erwarteten Regel-IDs
- [ ] Fehlermeldungen in DE/EN/TR verständlich

## Meilenstein 4 · Erstellen
- [ ] Alle Sonderfälle aus der Funktionsliste als Testfall
- [ ] Erzeugte Dateien bestehen KoSIT-Validator und veraPDF in der CI

## Meilenstein 5 · Konvertieren
- [ ] Roundtrip CII → UBL → CII ohne Datenverlust bei allen Pflichtfeldern

## Meilenstein 6 · Web-App
- [ ] Anzeigen, Prüfen, Erstellen, Konvertieren in DE/EN/TR
- [ ] IndexedDB-Speicher mit Export/Import/Löschen
- [ ] Lighthouse und a11y-Grenzwerte erfüllt
- [ ] E2E-Test: Rechnung erstellen, herunterladen, wieder hochladen, prüfen = gültig

## Meilenstein 7 · Release
- [ ] npm-Paket gebaut (`npm pack` getestet), Doku mit API-Beispielen
- [ ] portfolio.json, Fallstudie, ERKLAERT.md, OFFEN.md

## Definition of Done (gesamt)
- [ ] Alle Funktionen aus KONZEPT.md umgesetzt (oder per ADR begründet angepasst)
- [ ] Testabdeckung Kernlogik ≥ 80 %, E2E-Hauptablauf grün, CI grün
- [ ] Lighthouse Mobile: Performance ≥ 90, Accessibility = 100 (bei Web-Oberflächen)
- [ ] Oberfläche in DE/EN/TR vollständig (außer Entwickler-Tools)
- [ ] README (EN) + README.de.md mit Badges, Screenshot/GIF, Mermaid-Diagramm, Schnellstart, Free-Tier-Limits
- [ ] Mindestens 3 ADRs, CHANGELOG, SECURITY.md, CONTRIBUTING.md
- [ ] Vorschau-Deploy erreichbar, Adresse in FORTSCHRITT.md
- [ ] `portfolio.json` vollständig (Schema: `portfolio.schema.json`)
- [ ] `docs/fallstudie.de.mdx` geschrieben
- [ ] `ERKLAERT.md` für Ömer geschrieben (nicht committet)
- [ ] `OFFEN.md` aktuell, Release `v1.0.0` getaggt auf `build`
