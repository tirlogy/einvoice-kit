# Fortschritt · E-Rechnung Kit

Repo: https://github.com/tirlogy/einvoice-kit (Branch `build`) · Vorschau: `https://build.einvoice-kit.pages.dev` nach Freigabe des Deploys (siehe OFFEN.md, Punkt 1) · CI: https://github.com/tirlogy/einvoice-kit/actions

## Meilenstein 0 · Recherche und Setup (21.11.2026)
- Recherche: EN 16931 1.3.17 (EUPL-1.2), XRechnung-Schematron 2.6.0 für XRechnung 3.0.2 (Apache-2.0), KoSIT-Validator 1.6.3 und Konfiguration 2026-08-31, SaxonJS 2.7 (Saxonica-Lizenz erlaubt Weitergabe als Teil einer Anwendung), ZUGFeRD 2.x = Factur-X 1.0.0x. Ergebnis in ADR 0002, 0003 und THIRD_PARTY.md.
- Repo `tirlogy/einvoice-kit` öffentlich angelegt, Arbeit auf `build`, `.gitignore` enthält `ERKLAERT.md`, `.env`, `.dev.vars`.
- CI-Grundgerüst beim ersten Push grün.

## Meilenstein 1 · Gerüst
- pnpm-Monorepo: `packages/einvoice`, `apps/web`, `tools/rules`, `tools/ci`.
- Regel-Toolchain `tools/rules/build.mjs`: gepinnte Downloads mit SHA-256, XSLT → SEF mit xslt3, Update-Check (`--check-updates`, `--pin`).
- ESLint, TypeScript strict, Vitest mit Coverage-Gate 80 %, Dependabot.

## Meilenstein 2 · Parsen und Modell
- Modell nach EN 16931 (BT-1 bis BT-165), Parser für CII, UBL Invoice/CreditNote und ZUGFeRD-PDF (Namensbaum und `/AF`).
- Getestet: 135 offizielle Dateien (86 KoSIT-Testsuite, 36 EN-16931-Beispiele, 13 ZUGFeRD-2.5.2-PDFs aller Profile) werden korrekt gelesen, Summenprüfung BR-CO-10 je Datei.

## Meilenstein 3 · Prüfen
- SaxonJS mit EN 16931 und XRechnung, KoSIT-Schwereanpassungen, Plausibilitätsprüfungen (IBAN, Leitweg-ID, USt-IdNr., Fälligkeit, Kleinunternehmer).
- Getestet: alle gültigen offiziellen Rechnungen ergeben 0 Fehler; manipulierte Rechnungen liefern BR-02, BR-CO-10, BR-CO-15, BR-DE-15, BR-DE-6, BR-CL-04, BR-E-10; MINIMUM wird als „keine E-Rechnung nach § 14 UStG“ markiert.
- Rund 100 Regeln mit Erklärung auf DE/EN/TR, Rest nach Regelfamilie (ADR 0008).

## Meilenstein 4 · Erstellen
- Builder für CII, UBL und ZUGFeRD PDF/A-3b (zwei Layouts, Logo, Akzentfarbe, DE/EN/TR).
- Alle 10 Sonderfälle als Testfall (`exampleDraft`): Standard 19/7 %, Kleinunternehmer, Reverse Charge, IG-Lieferung, Rabatte/Zuschläge, Anzahlung, Schlussrechnung, Gutschrift, Storno, öffentlicher Auftraggeber mit Leitweg-ID (ADR 0007).
- CI: alle 20 erzeugten XRechnungen vom KoSIT-Validator akzeptiert (XSD + Schematron), alle 10 PDFs von veraPDF als PDF/A-3b bestätigt.

## Meilenstein 5 · Konvertieren
- `convertInvoice`: XRechnung CII/UBL ↔ ZUGFeRD EN 16931, CII ↔ UBL, Warnungen bei Spezifikationswechsel und EXTENDED.
- Getestet: Roundtrip CII → UBL → CII für alle KoSIT-Standardfälle ohne Verlust der Pflichtfelder, für die eigenen Beispiele sogar ohne jeden Unterschied im Modell.

## Meilenstein 6 · Web-App
- Anzeigen & Prüfen, Erstellen mit Live-Vorschau, Konvertieren, Meine Daten (IndexedDB, Export/Import mit Validierung, alles löschen), Datenschutzseite, Footer mit tiryaki.eu und Impressum.
- DE/EN/TR (Browsersprache, sonst Englisch), Dunkel/Hell nach System, PWA mit Service Worker, strenge CSP.
- Getestet: 38 Playwright-Tests auf Desktop und Mobil (Hauptablauf erstellen → herunterladen → hochladen → gültig, XRechnung UBL, Konvertieren, Stammdaten, Netzwerk-Datenschutztest, axe WCAG 2.1 AA hell und dunkel, Tastatur).
- Lighthouse mobil: Performance 0,98 (Ansicht) und 0,96 (Editor), Barrierefreiheit 1,0, Best Practices 1,0, SEO 1,0. Preact-Laufzeit für das Performance-Budget (ADR 0004).
- Ein SaxonJS-Rechenfehler im Browser (BR-DE-19 bei korrekter IBAN) gefunden und abgefangen (ADR 0010).

## Meilenstein 7 · Release
- `npm pack` getestet: 665 KB, Installation in leerem Projekt, Prüfen und PDF-Erzeugung funktionieren. README des Pakets mit API-Beispielen, das Beispiel läuft als Test.
- README (EN) und README.de.md mit Badges, Screenshots, Mermaid-Diagramm, Schnellstart, Konfiguration und Free-Tier-Grenzen.
- 11 ADRs, CHANGELOG, SECURITY, CONTRIBUTING, Issue- und PR-Vorlagen, `.env.example`, `docs/DESIGN.md`.
- `portfolio.json` gegen `portfolio.schema.json` validiert, `docs/fallstudie.de.mdx`, `ERKLAERT.md` (nicht committet), `OFFEN.md`.
- Tag `v1.0.0` auf `build`.
- Offen: Vorschau-Deploy, weil der Zugriff auf das Cloudflare-Konto nicht freigegeben wurde (OFFEN.md, Punkt 1).
