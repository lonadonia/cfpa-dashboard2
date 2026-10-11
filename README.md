# CrossFit-Streaming-Overlay

Browser-Overlay für CrossFit-Livestreams und Online-Trainings – mit **Timer, Logo, WOD-Infos und Live-Uhr** in drei frei anpassbaren Zonen. Läuft als **Browserquelle in OBS Studio und Streamlabs** und über die **OBS Virtual Camera in Zoom**. Gesteuert wird über eine getrennte **Regie-Oberfläche** am Laptop oder über die **Smartphone-/Tablet-Fernbedienung**.

- Reines **HTML5, CSS und JavaScript** – kein Build-Schritt, **keine npm-Abhängigkeiten**, keine Fremd-Bibliotheken
- **Full HD 1920 × 1080**, transparenter Hintergrund, skaliert proportional auf jede Fenstergröße
- **Keine laufenden Kosten**, kein Konto, keine Cloud: läuft lokal auf dem Streaming-PC
- Vollständiger, kommentierter Quellcode – auf jedem Server oder Webspace weiter betreibbar

| Ansicht | Datei | Zweck |
|---|---|---|
| Startseite | `public/index.html` | Überblick, Links, Verbindungsstatus |
| **Regie** (Bedienoberfläche) | `public/control.html` | Texte, Logo, Timer, Zonen, Szenen, Live-Vorschau |
| **Overlay** | `public/overlay.html` | Die Seite für die Browserquelle in OBS/Streamlabs |
| **Fernbedienung** | `public/remote.html` | Start/Pause/Reset, Szenen, Einblendungen vom Handy |
| Kamera-Modus | `public/overlay.html?camera=1` | Webcam + Overlay in einem Fenster (Alternative ohne OBS) |

---

## Schnellstart

### 1 · Ohne Installation testen (Testlink / Browser)

Die statische Version (z. B. auf Vercel oder per Doppelklick auf einen beliebigen Webserver) läuft im **Testmodus**: Regie und Overlay synchronisieren sich zwischen Tabs **desselben Browsers**. Zum Ausprobieren `control.html` öffnen – die Live-Vorschau zeigt das Overlay direkt an.

> Für OBS und die Handy-Fernbedienung wird der lokale Server (Schritt 2) benötigt, weil OBS einen eigenen Browser verwendet.

### 2 · Für den echten Stream: lokaler Server (empfohlen)

Voraussetzung: [Node.js](https://nodejs.org) ab Version 18 (kostenlos, „LTS“-Version wählen).

```bash
npm start            # oder: node server.js
```

oder einfach doppelklicken:

- **Windows:** `start-windows.bat`
- **macOS:** `start-mac.command` (beim ersten Mal: Rechtsklick → Öffnen)

Danach im Browser:

| | Adresse |
|---|---|
| Regie | `http://localhost:8080/control.html` |
| Overlay für OBS | `http://localhost:8080/overlay.html` |
| Handy-Fernbedienung | `http://<IP-des-PCs>:8080/remote.html` (wird beim Start angezeigt) |

Der Server speichert alle Einstellungen (Texte, Logo, Szenen) in `data/state.json`. Diese Datei ist das komplette Backup – einfach kopieren.

### 3 · In OBS, Streamlabs und Zoom einbinden

Kurzfassung (ausführlich mit Fehlerbehebung: [`docs/STREAMING.md`](docs/STREAMING.md)):

1. **OBS:** Quellen → **+** → **Browser** → URL `http://localhost:8080/overlay.html`, Breite **1920**, Höhe **1080** → über die Kameraquelle legen.
2. **Töne in den Stream:** bei der Browserquelle „Audio über OBS steuern“ aktivieren.
3. **Zoom:** in OBS **„Virtuelle Kamera starten“** → in Zoom unter Video die Kamera **„OBS Virtual Camera“** wählen.

---

## Funktionen

**Linke Zone** – Logo hochladen/wechseln/entfernen, Marken-, Trainings-/Veranstaltungstitel, Untertitel, freier Text; Schriftart, Größe, Farbe, Stärke, Ausrichtung, Großbuchstaben; jedes Element ein-/ausblendbar.

**Mitte** – Timer mit Countdown/AMRAP, Stoppuhr/For Time (mit Time Cap), EMOM, Arbeit/Pause (Tabata, Sätze mit Satzpause), freie **Zeitfolge** (`2m + 30 + 1:00`, `4*(1m + 30)`, `8*(20 + 10p)`); Start/Pause/Fortsetzen/Reset, Intervall vor/zurück, Vorlaufzeit mit großem 3-2-1, Runden- und Intervallanzeige, Farbwechsel **Grün – Gelb – Rot**, Balken oder Ring, Signaltöne.

**Rechte Zone** – WOD/Trainingsinfos (mit `# Überschrift`, `- Aufzählung`, `**fett**`), Trainername, Hinweise, Live-Uhr (optional mit Sekunden/Datum).

**Zonen** – Position per Maus/Finger in der Vorschau verschieben oder exakt per Zahl, Verankerung, Breite, Skalierung, Hintergrundfläche (Farbe, Deckkraft, Ecken, Signalkante). Elemente lassen sich zwischen den Zonen verschieben und umsortieren.

**Weiteres** – Szenen speichern/laden (Tasten 1–9), Export/Import als JSON, drei Vorlagen (Broadcast, Kreidetafel wie Referenz, Minimal), Standardlayout wiederherstellen, Ein-/Ausblendanimationen, Tastaturkürzel, Fernbedienung mit „Gedrückt halten zum Reset“, Kamera-Modus, optionaler Zugriffsschlüssel.

Bedienungsanleitung: [`docs/ANLEITUNG.md`](docs/ANLEITUNG.md)

---

## Projektstruktur

```
server.js                 Lokaler Server (Node.js, ohne Pakete): Dateien, Zustand, Live-Sync (SSE)
public/                   Alles, was im Browser läuft – kann auch allein statisch gehostet werden
  index.html              Startseite
  control.html            Regie / Bedienoberfläche
  overlay.html            Overlay (OBS-Browserquelle)
  remote.html             Smartphone-Fernbedienung
  css/                    ui.css (Bedien-Design), overlay.css (Overlay-Design), …
  js/core/timer.js        Timer-Engine + Zeitfolgen-Parser (auch im Server genutzt)
  js/core/state.js        Standardwerte, Vorlagen, Szenen, Reducer (auch im Server genutzt)
  js/client/*.js          Renderer, Synchronisation, Regie, Fernbedienung, Töne, Kürzel
  assets/fonts/           Schriften (SIL Open Font License, lokal – kein Google-Fonts-Zugriff)
tests/                    Unit-Tests (node --test) und Browser-Test (Playwright, optional)
docs/                     Anleitung, Streaming, Weiterentwicklung, Lizenzen, Angebot
design-handoff/           Analyse, Gestaltungskonzept, QA-Protokoll, Übergabe
start-windows.bat         Start per Doppelklick (Windows)
start-mac.command         Start per Doppelklick (macOS/Linux)
```

## Tests

```bash
npm test                 # 27 Unit-Tests: Timer, Zeitfolgen-Parser, Zustand, Szenen
npm run test:e2e         # 36 Browser-Prüfungen (benötigt einmalig: npm install --no-save playwright && npx playwright install chromium)
```

## Konfiguration (optional)

| Variable | Standard | Bedeutung |
|---|---|---|
| `PORT` | `8080` | Port des Servers |
| `HOST` | `0.0.0.0` | `0.0.0.0` = im WLAN erreichbar (Handy), `127.0.0.1` = nur dieser PC |
| `OVERLAY_KEY` | leer | Zugriffsschlüssel für Änderungen; Regie/Fernbedienung dann mit `?key=…` öffnen |
| `DATA_DIR` | `./data` | Speicherort von `state.json` |

Beispiel: `PORT=9000 OVERLAY_KEY=meinSchluessel npm start` (Windows: `set PORT=9000 && npm start`). Vorlage: `.env.example`.

## Hosting & laufende Kosten

| Variante | Kosten | Hinweis |
|---|---|---|
| **Lokal auf dem Streaming-PC** (empfohlen) | **0 €** | Node.js ist kostenlos; keine Internetverbindung für das Overlay nötig |
| Statischer Testlink (Vercel, Netlify, Firebase Hosting, eigener Webspace) | 0 € im Gratis-Tarif | nur Testmodus (ein Browser); für OBS + Handy lokalen Server nutzen |
| Eigener Node-Server/VPS | ab ca. 4–6 €/Monat beim Anbieter | nur nötig, wenn über das Internet ferngesteuert werden soll |

Keine Bindung an ein Entwicklerkonto, keine kostenpflichtigen Lizenzen, keine externen Dienste. Details: [`docs/ENTWICKLUNG.md`](docs/ENTWICKLUNG.md).

## Rechte & Lizenzen

Individuell erstellter Code: siehe [`LICENSE.md`](LICENSE.md). Verwendete Schriften (SIL OFL 1.1) und Herkunft aller Dateien: [`docs/LIZENZEN.md`](docs/LIZENZEN.md).
