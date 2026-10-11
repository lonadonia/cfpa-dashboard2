# 01 · Client Brief Analysis — CrossFit Streaming Overlay

## 1. Project snapshot

| | |
|---|---|
| Client | CrossFit box (reference demo branded "CrossFit Passau Home WOD Overlay" / logo "The Online Box – Fitness die funktioniert") |
| Project type | Freelance job: custom browser overlay for live streams/online classes, fixed price ≤ 200 € |
| Phase | Offer + testable prototype (milestones 1–3 implemented; milestone 4 field test on client hardware outstanding) |
| Goal | Replace/extend the reference overlay with an editable, three-zone, transparent 1920×1080 overlay with timer, usable in OBS/Streamlabs and Zoom, with source-code ownership |
| Deliverables | Working overlay + separate control UI, readable source, docs, binding offer with per-feature classification and 4 milestone payments |

## 2. Verified sources

| Source | Inspected | Notes |
|---|---|---|
| Brief (German, user message, 11.10.2026) | full text | quoted below in original language |
| Uploaded ZIP (saved copy of the reference page) | `index.html`, `scripts/*.js`, `styles/style.css`, images | timer modes TIME CAP, Work/Rest, EMOM, Custom formula (`2m + 30 + 1:0`, `4*(1m+30)`), countdown overlay, webcam background (`camera.js`), chalk font, logo PNG, chalkboard JPG. `requests.js`, `facebook_lib.js`, `location.js` are browser-extension injections, not part of the reference |
| Reference URL `https://cfpa-dashboard.firebaseapp.com/index_cam.html` | **NOT VERIFIED / UNAVAILABLE** (network policy 403) | ZIP used instead |

## 3. What the client actually wants

- A **stable, good-looking overlay for CrossFit live classes**: logo + titles left, timer in the middle, WOD/coach/notes/clock right.
- **Operate it during training** without touching code: separate control page, keyboard shortcuts, phone remote.
- **CrossFit timer semantics**: AMRAP/countdown, For Time with time cap, EMOM, Tabata/work-rest, custom sequences, prep countdown, beeps, round display, colour cues.
- **Streaming path that works in Zoom** (via OBS Virtual Camera) — explicitly mandatory.
- **Ownership and independence**: full readable source, no paid licences, no developer accounts, no hidden fees, runnable elsewhere, extension guide.
- Budget-aware: honest per-feature classification, core before extras.

## 4. Scope boundary

- **Must build:** all KERN/GESTALTUNG items, timer options, OBS/Zoom path + docs, source/rights/docs package, offer.
- **Also built (requested as "Zusätzlich"):** phone/tablet remote, scenes, animations, restore default layout.
- **Prepared only (later extension):** participant names, sponsor logos, chat/info fields, internet remote.
- **Out of scope:** native apps, platform chat integrations, cloud backend, production deployment on client infrastructure.

## 5. Requirements matrix

Classification: EXPLICIT / CONSTRAINT / INFERRED. Priority: MUST / SHOULD / COULD. Status after implementation; evidence IDs refer to `04_QA_ACCEPTANCE_CHECKLIST.md`.

| ID | Class | Source (brief) | Requirement | Prio | Implementation | Status |
|---|---|---|---|---|---|---|
| REQ-001 | EXPLICIT | „linker, mittlerer und rechter Zone“ | Three zones modeled on the demo | MUST | `render.js` zones, `state.zones` | Verified (QA-V01) |
| REQ-002 | EXPLICIT | „Timer“ | Timer in overlay | MUST | `timer.js`, timer element | Verified (E2E-02…17) |
| REQ-003 | EXPLICIT | „editierbare Texte“ | Editable texts | MUST | text/rich/labeled elements | Verified (E2E-04, 24) |
| REQ-004 | EXPLICIT | „Logos“ | Logo display | MUST | logo element | Verified (E2E-25) |
| REQ-005 | EXPLICIT | „transparenter Hintergrund“ | Transparent background | MUST | `overlay-page.css` | Verified (QA-V02: 71 % fully transparent px) |
| REQ-006 | EXPLICIT | „Full HD 1920×1080, responsive“ | 1920×1080 stage, scales | MUST | `CFO.render.fit` | Verified (QA-R01–R05) |
| REQ-007 | EXPLICIT | „getrennte Bedienoberfläche und Overlay-Ansicht“ | Separate control + overlay | MUST | `control.html` / `overlay.html` | Verified |
| REQ-008 | EXPLICIT | „testbarer Prototyp“ | Testable prototype | MUST | local server + static test mode | Verified (LOCAL-01…05) |
| REQ-009 | EXPLICIT | „vollständiger, lesbarer Quellcode, Projektdateien sowie Dokumentation“ | Source + docs | MUST | repo, `docs/` | Verified |
| REQ-010 | EXPLICIT | „Logo hochladen/wechseln/entfernen“ | Upload/change/remove logo | MUST | logo card, drag&drop | Verified (E2E-25, 26) |
| REQ-011 | EXPLICIT | „Marken-/Trainings-/Veranstaltungstitel, Untertitel, freie Texte“ | Title fields | MUST | brand, title, subtitle, freeText | Verified |
| REQ-012 | EXPLICIT | „Schriftart, Größe, Farbe, Ausrichtung“ | Typography controls | MUST | style row per element | Implemented (manual UI check QA-U02) |
| REQ-013 | EXPLICIT | „Elemente ein-/ausblenden“ | Per-element visibility | MUST | switch per card | Verified (E2E-26) |
| REQ-014 | EXPLICIT | „Countdown/Stoppuhr“ | Countdown + stopwatch | MUST | modes countdown/stopwatch | Verified (unit + E2E-06) |
| REQ-015 | EXPLICIT | „Start/Pause/Fortsetzen/Reset“ | Transport | MUST | `T.command` | Verified (E2E-05, 08, 10, 11) |
| REQ-016 | EXPLICIT | „Zeitdauer/Vorlaufzeit“ | Duration + prep | MUST | `durationSec`, `prepSec` | Verified (E2E-05) |
| REQ-017 | EXPLICIT | „Runden/Intervalle“ | Rounds/intervals | MUST | emom/interval/sequence | Verified (E2E-12, 17) |
| REQ-018 | EXPLICIT | „Timerfarben/-größe“ | Timer colour + size | MUST | `timer.style` | Implemented (QA-U03) |
| REQ-019 | EXPLICIT | „optionaler Farbwechsel Grün–Gelb–Rot“ | Colour shift | MUST | `timerColor()` | Verified (E2E-07, QA-V03) |
| REQ-020 | EXPLICIT | „WOD-/Trainingsinfos, Trainername, Hinweise, Live-Uhr“ | Right zone content | MUST | wod, coach, notes, clock | Verified (QA-V01) |
| REQ-021 | EXPLICIT | „Formatierung und Ein-/Ausblenden“ | Right zone formatting | MUST | style row, switches, rich text | Verified |
| REQ-022 | EXPLICIT | „Zonen anpassbar“ | Adjustable zones | MUST | zone card + drag | Verified (E2E-30, 31) |
| REQ-023 | EXPLICIT | „Time Cap“ | Time cap | SHOULD | stopwatch `capSec` | Verified (QA-V05) |
| REQ-024 | EXPLICIT | „Rundenzahl, Arbeits-/Pausenzeiten, wiederholte/aufeinanderfolgende Intervalle, automatischer Wechsel“ | Interval engine | SHOULD | `buildProgram` | Verified (unit tests) |
| REQ-025 | EXPLICIT | „Anzeige aktueller Runde/Intervall“ | Round display | SHOULD | round text + pips | Verified (E2E-12, 17) |
| REQ-026 | EXPLICIT | „Signaltöne“ | Beeps | SHOULD | `audio.js` | Implemented (audible test needs speakers: NOT_TESTED audibly) |
| REQ-027 | EXPLICIT | „Tastaturkürzel“ | Shortcuts | SHOULD | `shortcuts.js` | Verified (E2E-05, 13, 18, 32, 33, 35, 36) |
| REQ-028 | EXPLICIT | „Zeitfolgen-Eingabe (z. B. „2m + 30 + 1:00“)“ | Sequence parser | SHOULD | `parseSequence` | Verified (unit + E2E-16, 17) |
| REQ-029 | EXPLICIT | „Smartphone-/Tablet-Fernsteuerung“ | Remote | SHOULD | `remote.html` | Verified (E2E-20…24) |
| REQ-030 | EXPLICIT | „speicherbare Layouts/Szenen“ | Scenes | SHOULD | scenes + export/import | Verified (E2E-18, 28) |
| REQ-031 | EXPLICIT | „Ein-/Ausblendanimationen“ | Animations | SHOULD | CSS transitions | Implemented (visual) |
| REQ-032 | EXPLICIT | „Standardlayout wiederherstellen“ | Reset layout | SHOULD | `resetLayout` | Verified (E2E-27) |
| REQ-033 | EXPLICIT | „spätere Erweiterung um Teilnehmernamen, Sponsorenlogos, Chat/Infofelder“ | Extensibility | COULD | element registry, HTTP API, guide | Prepared (docs) |
| REQ-034 | EXPLICIT | „jede Funktion als enthalten/eingeschränkt/spätere Erweiterung“, „Budgetumfang jeder Funktion einzeln“ | Per-feature classification | MUST | `docs/ANGEBOT.md` §1 | Done |
| REQ-035 | CONSTRAINT | „HTML5, CSS, JavaScript; geringe Abhängigkeiten, keine kostenpflichtigen Lizenzen, keine Bindung an Entwicklerkonto“ | Tech constraints | MUST | zero deps, local fonts | Verified (`package.json`) |
| REQ-036 | EXPLICIT | „Hosting/lokale Ausführung und Folgekosten nennen“ | Hosting + costs | MUST | README, ANGEBOT | Done |
| REQ-037 | EXPLICIT | „OBS Studio als Browserquelle; Streamlabs soweit kompatibel“ | OBS/Streamlabs | MUST | overlay.html | BLOCKED_EXTERNAL (no OBS in env) – Chromium-equivalent verified, field protocol S-1/S-6 |
| REQ-038 | EXPLICIT | „Zoom … via OBS Virtual Camera oder Alternative. Zoom muss damit funktionieren.“ | Zoom path | MUST | docs + camera mode | BLOCKED_EXTERNAL – field protocol S-4/S-5 |
| REQ-039 | EXPLICIT | „Übertragungsweg testen/dokumentieren“ | Test + document path | MUST | `docs/STREAMING.md` | Documented; field test pending |
| REQ-040 | EXPLICIT | „Bibliotheken/Lizenzen auflisten“ | Licence list | MUST | `docs/LIZENZEN.md` | Done |
| REQ-041 | CONSTRAINT | „Keine Codeverschleierung, versteckten Abhängigkeiten oder unvereinbarten Gebühren“ | Transparency | MUST | plain source | Verified |
| REQ-042 | EXPLICIT | „Lokal sicherbar und auf anderem Server betreibbar“ | Portability | MUST | static `public/`, Node server, JSON backups | Verified (LOCAL tests, persistence) |
| REQ-043 | EXPLICIT | „Anleitung zur Änderung/Erweiterung und Zugangsdaten/Konfigurationen“ | Dev guide, config | MUST | `docs/ENTWICKLUNG.md`, `.env.example` | Done (no credentials exist) |
| REQ-044 | EXPLICIT | „Nutzungs-, Änderungs- und Weiterentwicklungsrechte … ausschließliche Rechte“ | Rights | MUST | `LICENSE.md` | Done (template, contract governs) |
| REQ-045 | EXPLICIT | „Milestone Payments … Summe entspricht Festpreis“ | Milestones | MUST | ANGEBOT §2 (20/80/60/40) | Done |
| REQ-046 | EXPLICIT | „BEWERBERFRAGEN“ | Answers | MUST | ANGEBOT §3 | Done |
| REQ-047 | EXPLICIT | „Einschränkungen/Zusatzkosten vor Auftrag offenlegen“ | Disclosure | MUST | ANGEBOT §5 | Done |

## 6. Reference audit (ZIP)

Strengths to preserve: chalkboard identity, ring timer, big full-screen countdown before start, formula input with `*` and parentheses, webcam background mode.
Gaps: workout text only editable via modal (no formatting), no logo upload, no zone control, timer settings in a modal that is disabled while running, no persistence, no remote, Bootstrap/jQuery dependencies, sounds referenced but not shipped (`sounds/*.wav` missing in ZIP), overlay and controls mixed in one page (control buttons visible in the stream).

## 7. Assumptions & open points

| ID | Assumption | Confidence | Validation |
|---|---|---|---|
| A-001 | "Mitte" means the timer zone, placed bottom-centre by default (keeps athletes visible) | medium | client can drag zone; preset "Kreidetafel" mirrors reference placement |
| A-002 | A small local Node server is acceptable (free) because OBS uses its own browser storage | high | stated in offer §5 |
| A-003 | Client logo must not be published in the public GitHub repo | high | neutral placeholder shipped; client uploads logo |
| A-004 | German UI; overlay labels editable for English sessions | high | labels editor in timer card |

## 8. Risks

- Real OBS/Zoom versions on client hardware not testable in this environment → field protocol prepared (milestone 4).
- Zoom audio path for beeps depends on microphone/virtual cable.
- Public repository: avoid client-confidential material.
