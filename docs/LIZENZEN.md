# Verwendete Komponenten und Lizenzen

Stand: Version 1.0.0 (11.10.2026)

## Laufzeit-Abhängigkeiten

**Keine.** Weder im Browser noch im Server werden Bibliotheken oder npm-Pakete geladen. Es gibt keine Verbindungen zu externen Diensten, CDNs, Analyse- oder Werbe-Servern. Das Overlay funktioniert vollständig offline.

| Laufzeit | Lizenz | Kosten |
|---|---|---|
| Node.js ≥ 18 (nur für den lokalen Server) | MIT-Lizenz (Node.js Foundation / OpenJS) | kostenlos |
| Webbrowser / OBS-Browserquelle | – | kostenlos |

## Schriften (lokal in `public/assets/fonts/`)

Alle Schriften stehen unter der **SIL Open Font License 1.1** (OFL). Sie dürfen kostenlos – auch kommerziell – genutzt, eingebettet und weitergegeben werden; nur der Verkauf der Schriftdateien allein ist untersagt. Der Lizenztext liegt jeweils als `LICENSE.txt` neben den Dateien. Bezogen über die npm-Pakete von Fontsource (`@fontsource/*` 5.3.0), nur Zeichensatz „latin“ (enthält ä, ö, ü, ß).

| Schrift | Urheber | Verwendung |
|---|---|---|
| Barlow Condensed | The Barlow Project Authors | Titel, Timer (Standard) |
| Oswald | The Oswald Project Authors | Auswahl |
| Bebas Neue | The Bebas Neue Project Authors | Auswahl |
| Anton | The Anton Project Authors | Auswahl |
| Cabin Sketch | The Cabin Project Authors | „Kreide“-Look (Vorlage Kreidetafel) |
| Inter | The Inter Project Authors | Fließtext, Bedienoberfläche |
| Roboto Mono | The Roboto Mono Project Authors | Auswahl, Codefelder |

## Grafiken

| Datei | Herkunft | Rechte |
|---|---|---|
| `public/assets/logos/logo-platzhalter.svg` | für dieses Projekt erstellt | gehört zum individuellen Code (siehe `LICENSE.md`) |
| `public/assets/demo/demo-bg.svg` | für dieses Projekt erstellt (stilisierte Trainingsfläche, nur Vorschau) | wie oben |
| `public/assets/icon.svg`, Icons in `js/client/icons.js` | für dieses Projekt gezeichnet | wie oben |
| Hochgeladene Logos (in `data/state.json`) | vom Anwender | Rechte beim Anwender |

**Nicht enthalten:** Logo, Hintergrundbild und Schrift „Chalkboy“ der Referenz-Demo sowie Bootstrap, jQuery, Popper und Font Awesome aus der Referenz. Die Referenz diente nur als funktionales Vorbild; es wurde kein Code daraus übernommen.

## Signaltöne

Werden zur Laufzeit per Web Audio API erzeugt – keine Audiodateien, keine Lizenzen.

## Entwicklungswerkzeuge (optional, nicht Teil der Auslieferung)

| Werkzeug | Lizenz | Zweck |
|---|---|---|
| Playwright | Apache-2.0 | automatischer Browser-Test (`npm run test:e2e`), wird nicht mitgeliefert |
