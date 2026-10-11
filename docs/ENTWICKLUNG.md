# Weiterentwicklung

Dieses Dokument richtet sich an alle, die das Overlay ohne den ursprünglichen Entwickler ändern oder erweitern möchten. Es werden nur Grundkenntnisse in HTML, CSS und JavaScript benötigt.

## 1. Grundprinzipien

- **Kein Build-Schritt.** Jede Datei in `public/` wird so ausgeliefert, wie sie im Editor steht. Ändern, speichern, Browser neu laden.
- **Keine Abhängigkeiten.** Weder Frameworks noch npm-Pakete. `package.json` enthält nur Skripte.
- **Ein Zustand, viele Ansichten.** Der komplette Inhalt (Texte, Layout, Timer, Szenen) ist ein JSON-Objekt. Regie, Overlay und Fernbedienung zeigen nur diesen Zustand an.
- **Änderungen nur über Aktionen.** Jede Änderung ist eine kleine Aktion (`{ type: 'set', path: 'elements.wod.text', value: '…' }`), die eine einzige Funktion (`reduce` in `state.js`) ausführt – im Browser und im Server identisch.
- **Timer ohne Sekundenzähler.** Gespeichert werden nur Zeitstempel (Start, Pause). Jede Ansicht berechnet die Anzeige selbst. Dadurch laufen alle Geräte synchron und nichts geht beim Neuladen verloren.

## 2. Datenfluss

```
Regie / Fernbedienung                     Server (server.js)                       Overlay (OBS)
  Eingabe ──► dispatch(action) ──POST /api/action──► reduce(state, action) ──┐
                                                       state.json speichern  │
  Anzeige ◄────────────── Server-Sent Events (/api/events) ◄─────────────────┴──► Anzeige
```

Ohne Server (statisches Hosting) ersetzt `sync.js` den Server durch `localStorage` + `BroadcastChannel` (nur innerhalb eines Browsers).

## 3. Dateien

| Datei | Aufgabe |
|---|---|
| `server.js` | HTTP-Server (Dateien + API), Zustand im Speicher, `data/state.json`, Server-Sent Events, optionaler Zugriffsschlüssel |
| `public/js/core/timer.js` | Timer-Programme (Countdown, Stoppuhr, EMOM, Intervalle, Zeitfolge), Zeitfolgen-Parser, Berechnung der Anzeige, Befehle Start/Pause/Reset/Vor/Zurück |
| `public/js/core/state.js` | Standardwerte (`defaults()`), Schriften, Vorlagen, Schnellstart-Programme, Prüfung von Eingaben, `reduce()` für alle Aktionen, Szenen |
| `public/js/client/sync.js` | Verbindung: Server-Modus (fetch + EventSource) oder lokaler Testmodus |
| `public/js/client/render.js` | Zeichnet die 1920×1080-Bühne mit Zonen und Elementen; `tick()` aktualisiert Timer und Uhr pro Bild |
| `public/js/client/overlay.js` | Overlay-Seite: Skalierung, Töne, Kamera-Modus, Tastaturkürzel |
| `public/js/client/control.js` | Regie: Formulare, Timer-Steuerung, Szenen, Vorschau mit Drag & Drop |
| `public/js/client/control-zones.js` | Baut die Tabs „Links/Mitte/Rechts“ (Zonen- und Element-Karten) |
| `public/js/client/remote.js` | Fernbedienung |
| `public/js/client/audio.js` | Signaltöne (Web Audio) und Erkennung, wann ein Ton fällig ist |
| `public/js/client/shortcuts.js` | Tastaturkürzel |
| `public/css/overlay.css` | **Aussehen des Overlays** (Flächen, Timer, Animationen) |
| `public/css/ui.css`, `control.css`, `remote.css`, `start.css` | Aussehen der Bedienoberflächen |

## 4. Typische Änderungen

### Standardtexte oder -farben ändern
`public/js/core/state.js` → Funktion `defaults()`. Danach in der Regie „Alles auf Werkseinstellung“ oder `data/state.json` löschen.

### Aussehen des Overlays anpassen
`public/css/overlay.css`. Beispiele: Breite der Signalkante (`.has-stripe::before`), Schräge Ecke (`clip-path`), Rundenpunkte (`.cfo-timer__pips i`).

### Neue Schrift einbinden
1. `.woff2`-Datei nach `public/assets/fonts/<name>/` kopieren (Lizenz beachten, z. B. Google Fonts = SIL OFL).
2. `@font-face` in `public/css/fonts.css` ergänzen.
3. Eintrag in `FONTS` in `state.js` hinzufügen – erscheint automatisch in allen Schrift-Auswahlfeldern.

### Neues Schnellstart-Programm
`TIMER_PRESETS` in `state.js` um eine Zeile ergänzen, z. B. `['E2MOM 8', { mode: 'emom', emomIntervalSec: 120, emomRounds: 8, title: 'E2MOM' }]`.

### Neues Element (z. B. Sponsorenlogo, Teilnehmername, Infofeld)

Elemente sind in `state.elements` gespeichert und haben einen **Typ** (`logo`, `text`, `rich`, `labeled`, `clock`, `timer`). Ein weiteres Element eines vorhandenen Typs braucht **nur einen Eintrag** in `defaults()`:

```js
// state.js → defaults() → elements
sponsor: { type: 'logo', name: 'Sponsorenlogo', zone: 'left', order: 6, visible: true, src: '', size: 180, shape: 'none', align: 'zone' },
athlete: { type: 'labeled', name: 'Teilnehmer', zone: 'right', order: 6, visible: true, label: 'Athlet', text: 'Max Mustermann', style: style('barlow', 32, '#FFFFFF', 700, true) },
```

Die Regie erzeugt die Bedienkarte automatisch (Upload, Textfelder, Formatierung, Zone, Reihenfolge), das Overlay zeigt das Element an, Szenen speichern es mit. Gespeicherte Daten älterer Versionen werden durch `normalize()` automatisch ergänzt.

Für einen **neuen Typ** (z. B. rotierende Sponsorenleiste, Teilnehmerliste mit Ergebnissen, Chat-/Info-Ticker):
1. `state.js`: Typnamen in `ELEMENT_TYPES` aufnehmen und Standardelement in `defaults()` anlegen.
2. `render.js`: in `builders` einen Eintrag mit `build(inner)` (DOM einmalig anlegen) und `update(ref, el, ctx)` (Werte setzen, `true` zurückgeben, wenn Inhalt vorhanden) ergänzen. Für zeitabhängige Anzeigen (Rotation, Ticker) zusätzlich in `tick()` aktualisieren.
3. `control-zones.js`: in `bodies` die Eingabefelder für den Typ beschreiben – nur Felder mit `data-path` anlegen, Speichern geschieht automatisch.
4. `overlay.css`: Aussehen ergänzen.
5. Test in `tests/state.test.js` ergänzen.

Sicherheitsregel: Nutzertexte immer mit `textContent` einfügen, nie mit `innerHTML`.

### Chat-/Live-Daten von außen
Externe Programme können Aktionen per HTTP senden:

```bash
curl -X POST http://localhost:8080/api/action \
  -H "Content-Type: application/json" \
  -d '{"action":{"type":"set","path":"elements.notes.text","value":"Neue Frage aus dem Chat"}}'
```

Mehrere Aktionen auf einmal: `{"actions":[…]}`. Bei gesetztem `OVERLAY_KEY` Header `X-Overlay-Key` mitsenden. So lassen sich später Chatbots, Streamdeck-Tasten oder Ergebnis-Systeme anbinden.

## 5. API des Servers

| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/api/info` | Version, Modus, WLAN-Adressen |
| GET | `/api/state` | aktueller Zustand (JSON) |
| GET | `/api/events` | Server-Sent Events: `state` bei jeder Änderung, `time` alle 15 s |
| POST | `/api/action` | `{ action }` oder `{ actions: [] }` ausführen |

Aktionen (`reduce` in `state.js`): `set`, `setMany`, `timer` (`cmd`: `start`, `pause`, `resume`, `toggle`, `reset`, `next`, `prev`), `timerConfig`, `sceneSave`, `sceneLoad`, `sceneDelete`, `sceneRename`, `sceneImport`, `preset`, `resetLayout`, `resetAll`, `replace`.

## 6. Tests

```bash
npm test          # Unit-Tests (Node, ohne Zusatzpakete)
npm run test:e2e  # Browser-Test: einmalig `npm install --no-save playwright && npx playwright install chromium`
```

Vor jeder Übergabe beide Befehle ausführen. Der Browser-Test startet einen eigenen Server mit leerem Datenordner und verändert keine echten Daten.

## 7. Betrieb auf anderen Servern

- **Statisch** (Vercel, Netlify, Firebase Hosting, Apache/Nginx, beliebiger Webspace): Ordner `public/` hochladen. Läuft im Testmodus (ein Browser). Für Vercel liegt `vercel.json` bei (Ausgabeordner `public`, kein Build).
- **Mit Server** (Synchronisation über Geräte und Internet): beliebiger Rechner mit Node.js ≥ 18, `node server.js`. Hinter einem Reverse-Proxy (Nginx/Caddy) für HTTPS betreiben und `OVERLAY_KEY` setzen, wenn der Server aus dem Internet erreichbar ist. Server-Sent Events benötigen beim Proxy deaktiviertes Puffern (der Server sendet dafür `X-Accel-Buffering: no`).
- **Prozess dauerhaft laufen lassen:** z. B. als Windows-Autostart-Verknüpfung auf `start-windows.bat`, unter Linux als systemd-Dienst.

## 8. Browser-Kompatibilität

Ziel ist die Chromium-Version der OBS-Browserquelle. Verwendet werden nur weit verbreitete Funktionen (ES5/ES2015-Syntax ohne Build, CSS Grid/Flexbox, `clip-path`, `aspect-ratio`). Neuere Effekte (z. B. animiertes Ein-/Ausklappen von Elementen) verschlechtern sich in älteren Versionen nur zu „ohne Animation“.
