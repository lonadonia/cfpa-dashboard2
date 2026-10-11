# Angebot: Individuelles CrossFit-Streaming-Overlay

> **Entwurf zur Abgabe** – Preise, Termine und Formulierungen vor dem Versenden prüfen und ggf. anpassen.

**Festpreis: 200 € Entwicklerhonorar** (verbindlich, keine weiteren Kosten für die unten als „enthalten“ gekennzeichneten Funktionen)
**Technik:** HTML5, CSS, JavaScript · keine Bibliotheken, keine npm-Abhängigkeiten, keine Lizenzkosten, kein Konto
**Laufende Kosten:** 0 € (Betrieb lokal auf dem Streaming-PC)
**Testbarer Prototyp:** liegt bereits vor (Quellcode im Repository, Testlink siehe Übergabe)

---

## 1. Leistungsumfang je Funktion

Legende: **enthalten** = im Festpreis vollständig umgesetzt · **eingeschränkt enthalten** = umgesetzt mit genannter Einschränkung · **spätere Erweiterung** = nicht im Festpreis, vorbereitet

### Kern und Gestaltung

| # | Funktion | Status | Anteil am Festpreis |
|---|---|---|---:|
| 1 | Architektur, Projektstruktur, lokaler Server mit Live-Synchronisation, automatisches Speichern | enthalten | 20 € |
| 2 | Overlay mit linker, mittlerer und rechter Zone, Full HD 1920 × 1080, transparenter Hintergrund, proportional skalierend (responsive), Broadcast-Design | enthalten | 25 € |
| 3 | Getrennte Bedienoberfläche (Regie) mit Live-Vorschau, responsiv bis Smartphone-Breite | enthalten | 20 € |
| 4 | **Links:** Logo hochladen/wechseln/entfernen; Marken-, Trainings-/Veranstaltungstitel, Untertitel, freier Text; Schriftart, Größe, Farbe, Stärke, Ausrichtung; jedes Element ein-/ausblendbar | enthalten | 12 € |
| 5 | **Mitte:** Countdown/Stoppuhr; Start/Pause/Fortsetzen/Reset; Dauer und Vorlaufzeit (inkl. großem 3-2-1); Runden/Intervalle; Timerfarben und -größe; Farbwechsel Grün–Gelb–Rot mit einstellbaren Schwellen; Balken oder Ring | enthalten | 25 € |
| 6 | **Rechts:** WOD/Trainingsinfos (mit Überschriften, Aufzählung, Fettdruck), Trainername, Hinweise, Live-Uhr; Formatierung; ein-/ausblendbar | enthalten | 8 € |
| 7 | Zonen anpassbar: Position (auch per Maus/Finger ziehen), Verankerung, Breite, Skalierung, Hintergrundfläche; Elemente zwischen Zonen verschieben und sortieren | enthalten | 10 € |

### Timer und Optionen

| # | Funktion | Status | Anteil |
|---|---|---|---:|
| 8 | Time Cap, Rundenzahl, Arbeits-/Pausenzeiten, wiederholte Intervalle (Sätze mit Satzpause), automatischer Wechsel Arbeit/Pause, Anzeige aktueller Runde/Intervall (Text + Rundenpunkte), EMOM | enthalten | 12 € |
| 9 | Zeitfolgen-Eingabe, z. B. `2m + 30 + 1:00`, `4*(1m + 30)`, `8*(20 + 10p)` mit verständlichen Fehlermeldungen | enthalten | 8 € |
| 10 | Signaltöne (3-2-1, Wechsel, Ende), wählbar im Overlay/OBS oder in der Regie | enthalten · in **Zoom eingeschränkt**: Ton gelangt über das Mikrofon oder ein virtuelles Audiokabel zu den Teilnehmern | 4 € |
| 11 | Tastaturkürzel (Start/Pause, Reset, Intervall vor/zurück, Szenen 1–9, Zonen, Overlay ein/aus) | enthalten | 3 € |
| 12 | Smartphone-/Tablet-Fernsteuerung (Start/Pause, Reset durch Gedrückthalten, Intervall, Szenen, Einblendungen, Texte) | enthalten **im lokalen WLAN** · Steuerung über das Internet = spätere Erweiterung | 12 € |
| 13 | Speicherbare Layouts/Szenen, Export/Import als Datei, Komplettsicherung | enthalten | 8 € |
| 14 | Ein-/Ausblendanimationen (Gleiten, Blenden, Zoom, aus; Dauer einstellbar) | enthalten | 3 € |
| 15 | Standardlayout wiederherstellen, drei Vorlagen (Broadcast, Kreidetafel wie Referenz, Minimal) | enthalten | 3 € |
| 16 | Kamera-Modus (Webcam + Overlay in einem Fenster, wie `index_cam.html` der Referenz) | eingeschränkt enthalten: für Zoom nur per Bildschirmfreigabe; empfohlen ist die OBS Virtual Camera | 2 € |

### Streaming, Test, Übergabe

| # | Leistung | Status | Anteil |
|---|---|---|---:|
| 17 | Tests (27 Unit-Tests, 36 automatische Browser-Prüfungen) und Praxistest OBS Studio → OBS Virtual Camera → Zoom sowie Streamlabs-Browserquelle mit Protokoll; Behebung vereinbarter Fehler | enthalten | 15 € |
| 18 | Vollständiger lesbarer Quellcode, Projektdateien, Anleitungen (Bedienung, Streaming-Einrichtung, Weiterentwicklung), Lizenzliste, Rechteübertragung | enthalten | 10 € |
| | **Summe** | | **200 €** |

### Spätere Erweiterungen (nicht im Festpreis)

Die Architektur ist dafür vorbereitet (neue Elemente brauchen nur wenige Zeilen, siehe `docs/ENTWICKLUNG.md`; externe Programme können über eine HTTP-Schnittstelle Inhalte setzen).

| Erweiterung | Status | Hinweis |
|---|---|---|
| Teilnehmernamen (Liste, Rotation, Ergebnisse) | spätere Erweiterung | einzelnes Namensfeld ist bereits mit dem Element „Trainer“ möglich |
| Sponsorenlogos (mehrere, rotierend) | spätere Erweiterung | ein zusätzliches festes Logo lässt sich per Eintrag in `state.js` ergänzen |
| Chat-/Infofelder (z. B. Live-Chat von YouTube/Twitch, Ticker) | spätere Erweiterung | freie Texte und Hinweise sind bereits enthalten; Chat-Anbindung hängt von der Plattform-API ab |
| Fernsteuerung über das Internet (außerhalb des WLAN), HTTPS-Hosting | spätere Erweiterung | erfordert einen erreichbaren Server; Hosting-Kosten je nach Anbieter |

Preise für Erweiterungen nur nach separatem schriftlichem Angebot.

---

## 2. Meilensteine und Zahlungen

Freigabe jeder Zahlung erst nach Prüfung der jeweiligen Lieferung. „T“ = Tag der Auftragserteilung, Angaben in Werktagen.

| Meilenstein | Lieferung | Termin | Betrag |
|---|---|---|---:|
| **1 · Konzept** | Schriftliche Bestätigung von Architektur, Leistungsumfang (Tabelle oben), Zeitplan und Festpreis | T + 1 | 20 € |
| **2 · Testbarer Prototyp** | Drei Zonen, Timer mit Start/Pause/Reset, Texte, Logo-Option, Transparenz, Browseransicht – per Testlink und lokal prüfbar | T + 2 | 80 € |
| **3 · Bestätigte Erweiterungen** | Funktionen 8–16 (Timer-Optionen, Fernsteuerung, Szenen, Animationen, Vorlagen, Kamera-Modus) nach Abstimmung des Auftraggebers | T + 4 | 60 € |
| **4 · Test, Fehlerbehebung, Übergabe** | Praxistest OBS/Zoom/Streamlabs mit Protokoll, Behebung vereinbarter Fehler, vollständige Code- und Dokumentationsübergabe, Rechteübertragung | T + 6 | 40 € |
| | | **Summe** | **200 €** |

Abnahmekriterien je Meilenstein: siehe Abschnitt 4 sowie das Testprotokoll in `docs/STREAMING.md`.

---

## 3. Antworten auf die Bewerberfragen

**Umsetzung und Funktionen für 200 €**
Alle Kern-Funktionen und die zusätzlich gewünschten Optionen (Fernsteuerung, Szenen, Animationen, Standardlayout, Zeitfolgen, Signaltöne, Tastaturkürzel) sind im Festpreis enthalten – siehe Tabelle. Nicht enthalten sind nur Teilnehmerlisten, Sponsoren-Rotation, Chat-Anbindung und Steuerung über das Internet.

**Spätere Erweiterungen durch den Anwender**
Ohne Programmierung: Texte, Logos, Farben, Schriften, Positionen, Timer-Programme und Szenen direkt in der Regie. Mit Grundkenntnissen: Der Code ist kommentiert, ohne Build-Schritt und ohne Fremdbibliotheken; neue Elemente (z. B. Sponsorenlogo, Teilnehmerfeld) benötigen einen Eintrag im Zustand und erscheinen automatisch in Regie, Overlay und Szenen. Eine Schritt-für-Schritt-Anleitung liegt in `docs/ENTWICKLUNG.md`, automatische Tests sichern Änderungen ab.

**OBS-/Zoom-Erfahrung und Test**
Das Overlay ist für die OBS-Browserquelle (Chromium) gebaut: 1920 × 1080, transparenter Hintergrund, Töne über „Audio über OBS steuern“, optional Regie als OBS-Dock. Für Zoom wird die OBS Virtual Camera verwendet, Alternative ist der Kamera-Modus per Bildschirmfreigabe. Getestet wird im Meilenstein 4 der komplette Weg Kamera → OBS → Virtuelle Kamera → Zoom sowie die Streamlabs-Browserquelle; das ausgefüllte Testprotokoll (Versionen, Datum, Ergebnis) wird übergeben. Bereits automatisch geprüft: Transparenz, Synchronisation, Timer-Logik, Fernbedienung, Kamera-Modus.

**Smartphone-Steuerung**
Keine App nötig: `remote.html` im Browser des Smartphones/Tablets im selben WLAN öffnen (Adresse wird beim Start angezeigt). Große Touch-Flächen, Reset nur durch Gedrückthalten (kein versehentliches Zurücksetzen), Szenen, Einblendungen und schnelle Textänderung. Optionaler Zugriffsschlüssel verhindert Eingriffe anderer Geräte.

**Rechteübergabe**
Nach vollständiger Zahlung: unbeschränkte Nutzungs-, Änderungs- und Weiterentwicklungsrechte sowie, soweit rechtlich übertragbar, ausschließliche Rechte am individuell erstellten Code (`LICENSE.md`). Rechte bestehender Komponenten (Schriften unter SIL OFL) bleiben unberührt (`docs/LIZENZEN.md`). Keine Codeverschleierung, keine versteckten Abhängigkeiten, keine Bindung an ein Entwicklerkonto.

**Hostingkosten**
Betrieb lokal auf dem Streaming-PC: **0 €** (Node.js ist kostenlos). Ein statischer Testlink ist bei Vercel, Netlify oder Firebase Hosting im kostenlosen Tarif möglich. Nur für eine Steuerung über das Internet wäre ein eigener Server nötig (bei üblichen Anbietern ab ca. 4–6 € im Monat) – nicht erforderlich für den beschriebenen Einsatz.

**Zeitplan**
Gesamt 6 Werktage ab Auftrag (siehe Meilensteine). Der Prototyp ist bereits testbar.

---

## 4. Abnahme

- Vereinbarte Funktionen laut Tabelle funktionieren in Regie, Overlay und Fernbedienung.
- Streamingweg OBS → Virtual Camera → Zoom funktioniert (Testprotokoll S-1 bis S-8 in `docs/STREAMING.md`).
- Speicherfunktionen (Szenen, Export/Import, automatisches Speichern) funktionieren, auch nach Neustart.
- Prototyp per Testlink bzw. lokal testbar.
- Dateien und Dokumente vollständig (Quellcode, Projektdateien, Assets, Anleitungen, Lizenzliste).
- Keine unvereinbarten laufenden Kosten.

## 5. Einschränkungen und Voraussetzungen (vor Auftrag offengelegt)

1. **Lokaler Server für OBS und Handy:** OBS nutzt einen eigenen Browser. Damit Regie, OBS und Handy synchron sind, läuft auf dem Streaming-PC ein kleiner Server (Doppelklick auf `start-windows.bat`, benötigt das kostenlose Node.js). Der reine Testlink synchronisiert nur Tabs eines Browsers.
2. **Töne in Zoom:** Zoom überträgt nur das Mikrofon – Töne über Lautsprecher/Mikrofon oder ein virtuelles Audiokabel.
3. **Fernsteuerung nur im selben WLAN;** Gäste-WLANs blockieren teils Verbindungen zwischen Geräten.
4. **Bildschirm des Handys:** Die Sperre „Bildschirm anlassen“ funktioniert im lokalen Netz (ohne HTTPS) nicht automatisch – ggf. Display-Timeout am Handy verlängern.
5. **Signaltöne in normalen Browserfenstern** starten erst nach einem Klick (Browser-Regel); in OBS sofort.
6. **Logo und Inhalte** stellt der Auftraggeber bereit; das Logo der Referenz-Demo ist aus Rechtegründen nicht im Repository enthalten und wird per Upload eingesetzt.
7. Keine Zusatzkosten, keine Abos, keine Lizenzgebühren.
