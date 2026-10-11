# Streaming-Einrichtung: OBS Studio, Streamlabs, Zoom

**Übertragungsweg (empfohlen):**

```
Kamera ─┐
        ├─► OBS Studio (Szene: Kamera + Browserquelle overlay.html) ─┬─► Stream (YouTube, Facebook, Twitch …)
Overlay ┘                                                             └─► OBS Virtual Camera ─► Zoom
                 ▲
   Regie (Laptop) / Fernbedienung (Handy) ── lokaler Server (server.js) ──┘
```

## 0. Benötigte Programme

| Programm | Kosten | Zweck |
|---|---|---|
| [Node.js](https://nodejs.org) LTS (ab 18) | kostenlos | startet den lokalen Overlay-Server |
| [OBS Studio](https://obsproject.com) (ab 28 empfohlen) | kostenlos, Open Source | Kamera + Overlay zusammensetzen, streamen, Virtuelle Kamera |
| Zoom-Desktop-App | vorhanden | Teilnehmer sehen das OBS-Bild als Kamera |
| Chrome/Edge/Firefox | kostenlos | Regie-Oberfläche |
| optional: Streamlabs Desktop | kostenlos (Grundfunktionen) | Alternative zu OBS |

Keine weiteren Programme, Konten oder Lizenzen nötig.

## 1. Server starten

Doppelklick auf `start-windows.bat` (Windows) bzw. `start-mac.command` (macOS) – oder im Projektordner `npm start`. Das Fenster zeigt die Adressen an und muss während des Streams geöffnet bleiben. Die Regie öffnet sich automatisch.

> Windows fragt beim ersten Start evtl. nach der Firewall: **„Zugriff zulassen“ für private Netzwerke**, sonst erreicht das Handy den Server nicht.

## 2. OBS Studio

1. OBS-Einstellungen → Video: **Basis- und Ausgabeauflösung 1920 × 1080**.
2. Szene anlegen, zuerst die Kamera hinzufügen (Quellen → **+** → *Videoaufnahmegerät*).
3. Quellen → **+** → **Browser**:
   - URL: `http://localhost:8080/overlay.html`
   - Breite **1920**, Höhe **1080**
   - **„Audio über OBS steuern“** aktivieren, wenn die Signaltöne in den Stream sollen (Lautstärke dann im OBS-Audiomixer)
   - Benutzerdefiniertes CSS kann auf dem OBS-Standard bleiben (transparenter Hintergrund)
4. Die Browserquelle muss **über** der Kamera liegen (in der Quellenliste weiter oben).
5. Quelle nicht skalieren – sie füllt genau das 1920×1080-Bild. Positionen und Größen werden in der Regie eingestellt.

**Regie direkt in OBS (optional):** Docks → *Benutzerdefinierte Browser-Docks* → Name „Overlay-Regie“, URL `http://localhost:8080/control.html`. Die Regie erscheint dann als Fenster in OBS.

**Töne in der Regie statt im Overlay:** Wer die Töne nur im Raum hören möchte (z. B. weil das Mikrofon sie aufnimmt), stellt in der Regie unter Timer → Signaltöne „Abspielen in: Dieser Regie“ ein.

## 3. Zoom (über OBS Virtual Camera)

1. In OBS rechts unten **„Virtuelle Kamera starten“**.
2. Zoom → Einstellungen → **Video** → Kamera: **„OBS Virtual Camera“**.
3. **„Mein Video spiegeln“ ausschalten** – sonst sehen *Sie selbst* die Schrift gespiegelt (für Teilnehmer ist sie immer richtig herum).
4. Empfehlung: in Zoom „HD“ aktivieren, damit Timer und Text scharf übertragen werden.

**Töne für Zoom-Teilnehmer:** Zoom überträgt nur das Mikrofon. Einfachster Weg: Töne über die PC-Lautsprecher abspielen („Abspielen in: Dieser Regie“), das Mikrofon nimmt sie mit. Alternative für saubereren Ton: OBS-Audioausgabe über ein virtuelles Audiokabel (z. B. VB-CABLE, Donationware) als Zoom-Mikrofon nutzen.

Hinweise zur Virtuellen Kamera:
- Windows: in OBS ab Version 26.1 enthalten.
- macOS: OBS ab Version 30 auf macOS 13 oder neuer installiert die Kamera als Systemerweiterung (einmalige Freigabe in den Systemeinstellungen).
- Linux: benötigt das Kernel-Modul `v4l2loopback`.

## 4. Streamlabs Desktop

1. Quelle hinzufügen → **Browserquelle** → URL `http://localhost:8080/overlay.html`, 1920 × 1080.
2. Streamlabs nutzt ebenfalls eine Chromium-Browserquelle; Darstellung, Transparenz und Animationen entsprechen OBS.
3. Für Zoom die virtuelle Kamera von Streamlabs verwenden, sofern in der installierten Version verfügbar – sonst OBS nutzen.

## 5. Alternative ohne OBS: Kamera-Modus

`http://localhost:8080/overlay.html?camera=1` zeigt die Webcam mit dem Overlay in einem Browserfenster (wie `index_cam.html` der Referenz-Demo).

- **F** = Vollbild, **C** = nächste Kamera, `&mirror=1` = Bild spiegeln
- In Zoom: *Bildschirm freigeben* → dieses Browserfenster → **„Für Videoclip optimieren“**
- Einschränkung: Bildschirmfreigabe statt Kamerabild, geringere Bildrate; für regelmäßige Trainings ist der OBS-Weg besser.

## 6. Fehlerbehebung

| Problem | Lösung |
|---|---|
| Overlay in OBS leer/weiß | Läuft der Server? Adresse im Browser testen. In OBS: Rechtsklick auf Quelle → *Aktualisieren* |
| Regie ändert nichts im OBS-Overlay | Regie muss über den Server geöffnet sein (`http://localhost:8080/control.html`), nicht als Datei oder Testlink |
| Handy verbindet nicht | Selbes WLAN? Firewall freigegeben? Gast-WLAN blockiert Geräte untereinander. Adresse aus dem Server-Fenster verwenden |
| Schrift unscharf | Browserquelle exakt 1920 × 1080, OBS-Leinwand 1920 × 1080, Quelle nicht skalieren |
| Keine Töne im Stream | Browserquelle → „Audio über OBS steuern“; im Audiomixer nicht stumm; Regie → „Abspielen in: Overlay“ |
| Zoom zeigt Text gespiegelt | Nur in der eigenen Vorschau – „Mein Video spiegeln“ ausschalten |
| Port 8080 belegt | `PORT=8081 npm start` bzw. unter Windows `set PORT=8081 && npm start`, URLs entsprechend anpassen |
| Timer geht nach Neuladen falsch? | Nein – der Timer rechnet mit Zeitstempeln und läuft nach Neuladen exakt weiter |

## 7. Testprotokoll

**In der Entwicklungsumgebung geprüft** (Chromium 141 headless über Playwright, 11.10.2026):

| Prüfung | Ergebnis |
|---|---|
| Overlay 1920 × 1080 mit transparentem Hintergrund (71 % der Pixel vollständig transparent, nur Zonen sichtbar) | bestanden |
| Live-Synchronisation Regie → Overlay → Fernbedienung über den Server | bestanden |
| Timer: Start, Pause, Fortsetzen, Reset, Vorlauf, Arbeit/Pause, Zeitfolge, Rundenanzeige, Farbwechsel | bestanden |
| Kamera-Modus mit (simulierter) Webcam | bestanden |
| 36 automatische Browser-Prüfungen (`npm run test:e2e`) und 27 Unit-Tests (`npm test`) | bestanden |

**Noch auf der Zielhardware zu bestätigen** (in der Entwicklungsumgebung ist kein OBS, Zoom oder Kamera verfügbar). Bitte bei der Abnahme ausfüllen:

| Nr. | Prüfung | Erwartung | Ergebnis | Datum / OBS- & Zoom-Version |
|---|---|---|---|---|
| S-1 | OBS-Browserquelle 1920×1080 über Kamera | Overlay transparent, Kamera sichtbar | ☐ | |
| S-2 | Timer in OBS starten (Regie und Handy) | läuft synchron, Farbwechsel sichtbar | ☐ | |
| S-3 | Signaltöne mit „Audio über OBS steuern“ | Töne im Audiomixer/Aufnahme | ☐ | |
| S-4 | OBS Virtual Camera in Zoom | Teilnehmer sehen Kamera + Overlay | ☐ | |
| S-5 | Zoom-Meeting 10 min mit laufendem Timer | flüssig, kein Ausfall | ☐ | |
| S-6 | Streamlabs Browserquelle (falls genutzt) | wie S-1 | ☐ | |
| S-7 | Handy-Fernbedienung im Studio-WLAN | Start/Pause/Szenen funktionieren | ☐ | |
| S-8 | OBS-Dock mit Regie (optional) | Bedienung in OBS möglich | ☐ | |
