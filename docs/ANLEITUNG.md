# Bedienungsanleitung

Diese Anleitung beschreibt die Regie (`control.html`), das Overlay (`overlay.html`) und die Fernbedienung (`remote.html`).

## 1. Aufbau der Regie

```
┌ Kopfzeile: Verbindungsstatus · Overlay öffnen · Fernbedienung · Tastaturkürzel ┐
├──────────────────────────────────────────────┬─────────────────────────────────┤
│ Live-Vorschau (zeigt exakt das Overlay)      │ Tabs: Timer · Links · Mitte ·    │
│ Timer-Steuerung: ◀ Start/Pause ▶  Reset      │       Rechts · Layout · Szenen · │
│ Schnellzugriff: Zonen ein/aus · Szenen 1–9   │       Stream                     │
└──────────────────────────────────────────────┴─────────────────────────────────┘
```

Alle Änderungen erscheinen **sofort** im Overlay. Es gibt keinen „Speichern“-Knopf für Texte – im Server-Modus wird automatisch in `data/state.json` gesichert, im Testmodus im Browser.

**Verbindungsstatus oben links**

| Anzeige | Bedeutung |
|---|---|
| ● grün „Server verbunden“ | Lokaler Server läuft – OBS, Regie und Handy sind synchron |
| ● gelb „Lokaler Testmodus“ | Ohne Server (z. B. Testlink): Sync nur zwischen Tabs dieses Browsers |
| ● rot „Server getrennt“ | Server beendet oder Netzwerk weg – verbindet sich automatisch neu |

## 2. Timer (Tab „Timer“)

### Modi

| Modus | Beispiel | Einstellungen |
|---|---|---|
| **Countdown** | AMRAP 12 | Dauer |
| **Stoppuhr** | For Time, Cap 15 | Time Cap (0 = offen) |
| **EMOM** | 10 × jede Minute | „Alle“ (Intervall), Runden |
| **Arbeit/Pause** | Tabata 8 × 20/10 | Runden, Arbeit, Pause, Sätze, Satzpause, „letzte Pause weglassen“ |
| **Zeitfolge** | `2m + 30 + 1:00` | freie Formel (siehe unten) |

**Schnellstart-Knöpfe** laden fertige Programme (AMRAP 12, For Time · Cap 15, EMOM 10, Tabata, 40/20 × 3 Sätze, Stoppuhr, Zeitfolge, Pause 5:00).

**Zeiteingabe:** `12:00`, `90` (Sekunden), `2m`, `1m30` – alles wird erkannt. Ungültige Eingaben werden rot markiert und nicht übernommen.

**Vorlaufzeit:** Sekunden vor dem Start (z. B. 10). Optional erscheint der Countdown groß in der Bildmitte, danach „Los!“.

**Zählrichtung:** „Automatisch“ zählt Countdown/EMOM/Intervalle abwärts und die Stoppuhr aufwärts. Kann erzwungen werden.

**Titel:** Text über dem Timer, z. B. „AMRAP 12“. Leer = automatisch („TABATA 8 × 0:20 / 0:10“).

### Zeitfolge (Formel)

| Schreibweise | Bedeutung |
|---|---|
| `90` | 90 Sekunden |
| `1:30` · `1m30` · `1.5m` | 1 Minute 30 Sekunden |
| `2m` · `2 min` | 2 Minuten |
| `+` oder `,` | nächstes Intervall |
| `4*1m` · `4x1m` | viermal 1 Minute |
| `4*(1m + 30)` | Gruppe viermal wiederholen |
| `10p` · `30 pause` · `1:00r` | als **Pause** markieren (andere Farbe, „Pause“-Anzeige) |

Beispiele: `2m + 30 + 1:00` · `8*(20 + 10p)` (Tabata) · `3*(5m + 1mp)` · `10:00 + 3*(2m + 1mp)`

Unter dem Eingabefeld werden die erkannten Intervalle als Liste angezeigt; Fehler werden mit Position erklärt („Schließende Klammer fehlt (Zeichen 9)“).

### Steuerung

| Aktion | Regie | Tastatur | Fernbedienung |
|---|---|---|---|
| Start / Pause / Weiter | großer Knopf | Leertaste | großer Knopf |
| Intervall vor / zurück | ◀ ▶ | ← → | ◀ ▶ |
| Reset | 2× klicken („Sicher?“) | 2× R | gedrückt halten (~1 s) |

**Programm ändern während der Timer läuft:** Änderungen werden erst nach „Übernehmen & zurücksetzen“ aktiv – so wird ein laufendes Workout nicht versehentlich abgebrochen. Titel und Zählrichtung ändern sich sofort.

### Signaltöne

Töne bei 3-2-1, beim Wechsel Arbeit/Pause und am Ende (Hupe). „Abspielen in“:

- **Overlay (OBS)** – Ton kommt aus der OBS-Browserquelle (für den Stream „Audio über OBS steuern“ aktivieren)
- **Dieser Regie** – Ton aus dem Regie-Browser
- **Beide**

Die Töne werden synthetisch erzeugt – keine Audiodateien, keine Lizenzfragen. Browser erlauben Ton erst nach einem Klick auf die Seite; OBS spielt sofort ab.

## 3. Zonen und Inhalte (Tabs „Links“, „Mitte“, „Rechts“)

Jeder Tab zeigt oben die Karte **„Position & Fläche“** der Zone und darunter die **Elemente** dieser Zone.

**Zone**
- Schalter: Zone ein-/ausblenden
- Verankerung horizontal/vertikal (z. B. rechts-oben), Abstand X/Y, Breite, Skalierung, Textausrichtung
- Hintergrundfläche: Farbe, Deckkraft, Ecken-Radius, Innenabstand, Signalkante, schräge Ecke, Weichzeichner
- **Mit der Maus verschieben:** über der Vorschau „Zonen verschieben“ einschalten und die Zone ziehen (Umschalt = pixelgenau, rastet an der Bildmitte ein)

**Elemente** (aufklappbar)
- Schalter links: Element ein-/ausblenden (mit Animation)
- Pfeile: Reihenfolge innerhalb der Zone
- „Zone“: Element in eine andere Zone verschieben
- Text-Formatierung: Schrift, Größe, Stärke, Farbe, Ausrichtung, Großbuchstaben

**Logo:** „Hochladen / wechseln“ oder Bilddatei auf das Vorschaubild ziehen. PNG/SVG mit transparentem Hintergrund empfohlen. Große Bilder werden automatisch auf 800 px verkleinert. „Entfernen“ blendet das Logo aus, „Standard“ stellt das Logo „The Online Box“ wieder her.

**WOD-Text:** jede Zeile wird eine Zeile im Overlay.

```
AMRAP 12 Min
- 10 Burpees
- 15 Air Squats
# Skalierung
- Burpees ohne Sprung
**Wichtig:** Technik vor Tempo
```

**Timer-Darstellung (Tab „Mitte“ → Karte „Timer“):** Schrift, Größe, Balken/Ring/aus, Titel/Phase/Runde/Rundenpunkte ein-/aus, Farben, Farbwechsel Grün–Gelb–Rot mit Schwellen („Gelb ab 10 s Rest“, „Rot ab 5 s“), Pausen- und Vorlauffarbe, Beschriftungen (z. B. für englische Sessions: Work/Rest/Round).

## 4. Layout (Tab „Layout“)

- **Vorlagen:** Broadcast (Standard), Kreidetafel (Aufbau wie die Referenz-Demo), Minimal (ohne Flächen). Vorlagen ändern nur die Gestaltung.
- **Ein-/Ausblenden:** ganzes Overlay (Taste H), Animation Gleiten/Blenden/Zoom/Keine, Dauer.
- **Hintergrundbild:** ein-/ausschalten, eigenes Bild hochladen (wird auf 1920 px verkleinert), „Kreidetafel“ = Bild der Referenz, Abdunkeln 0–90 %. Achtung: das Bild verdeckt in OBS die Kamera – für Pausen-, Start- oder Infoszenen gedacht; per Szene speicherbar.
- **Akzentfarbe** und **Textschatten**.
- **Standardlayout wiederherstellen:** setzt Positionen und Gestaltung zurück, behält Texte, Logo, Timer und Szenen.
- **Alles auf Werkseinstellung:** behält nur die gespeicherten Szenen.

## 5. Szenen (Tab „Szenen“)

Eine Szene speichert den kompletten Look: Texte, Logo, Zonen, Gestaltung und Timer-Programm.

- Namen eingeben → **Speichern**
- **Laden** (oder Taste 1–9, oder Chip unter der Vorschau, oder Fernbedienung)
- Überschreiben, Umbenennen, Löschen
- **Exportieren/Importieren** als JSON-Datei – z. B. zum Übertragen auf einen anderen PC
- **Komplette Konfiguration sichern/laden** – Vollbackup inklusive Szenen

Läuft der Timer und hat die geladene Szene dasselbe Timer-Programm, läuft er weiter.

## 6. Fernbedienung (Smartphone/Tablet)

1. Server auf dem Streaming-PC starten. Die Adresse für das Handy wird im Server-Fenster und in der Regie (Tab „Stream“) angezeigt, z. B. `http://192.168.1.20:8080/remote.html`.
2. Handy ins **selbe WLAN** bringen und Adresse öffnen. Tipp: „Zum Startbildschirm hinzufügen“.
3. Funktionen: großer Start/Pause-Knopf, Intervall vor/zurück, Reset (gedrückt halten), Zonen ein/aus, Szenen, Timer-Schnellstart, Texte schnell ändern (WOD, Trainer, Hinweise, Titel).

Funktioniert die Verbindung nicht: Firewall-Abfrage von Windows beim ersten Start mit „Zulassen“ (privates Netzwerk) beantworten. Gäste-WLANs blockieren oft Verbindungen zwischen Geräten.

## 7. Tastaturkürzel

| Taste | Funktion |
|---|---|
| Leertaste | Start / Pause / Fortsetzen |
| R, R | Timer zurücksetzen |
| ← / → | Intervall zurück / vor |
| 1 … 9 | Szene 1–9 laden |
| Umschalt + 1 / 2 / 3 | Zone links / Mitte / rechts ein/aus |
| H | ganzes Overlay ein/aus |
| ? | Hilfe |

Im Overlay-Fenster (Kamera-Modus) zusätzlich: **C** = Kamera wechseln, **F** = Vollbild.

## 8. Zugriffsschlüssel (optional)

Wer verhindern möchte, dass andere Geräte im WLAN etwas ändern: Server mit `OVERLAY_KEY=meinSchluessel` starten und Regie/Fernbedienung mit `?key=meinSchluessel` öffnen (die Links in der Regie enthalten den Schlüssel automatisch). Das Overlay selbst braucht keinen Schlüssel.
