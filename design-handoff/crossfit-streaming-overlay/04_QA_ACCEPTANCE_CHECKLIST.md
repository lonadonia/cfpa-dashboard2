# 04 · QA & Acceptance Checklist — CrossFit Streaming Overlay

Environment: Linux container, Node.js 22.22.0, Chromium 141.0.7390.37 (Playwright 1.56.1, headless), 11.10.2026.
Statuses: VERIFIED_PASS · IMPLEMENTED_NOT_TESTED · BLOCKED_EXTERNAL · NOT_APPLICABLE.

## 1. Automated tests

| Test | Command | Result |
|---|---|---|
| Unit tests (timer engine, sequence parser, reducer, scenes, normalisation) | `npm test` | VERIFIED_PASS – 28/28 |
| Browser E2E (server mode, own temp data dir) | `npm run test:e2e` | VERIFIED_PASS – 36/36, no console errors |
| Static/test mode (http-server on `public/`, two tabs) | scratch script `local.js` | VERIFIED_PASS – LOCAL-01…05, no page errors |
| Syntax | `node --check` on all JS | VERIFIED_PASS |

E2E coverage (IDs in `tests/e2e/e2e.js`): E2E-01 connect · 02/03 duration & custom title · 04 text sync · 05 Space + big prep countdown · 06 countdown runs · 07 green colour shift · 08–10 pause/resume · 11 two-step reset · 12 Tabata phase/round/pips · 13 skip interval · 14 rest colour · 15 confirm banner while running · 16 sequence error · 17 sequence `2m + 30 + 1:00` · 18 scene save + key 1 · 19 quick zone toggle · 20–24 phone remote (zones, start, same time, hold-to-reset, text edit) · 25/26 logo upload/remove · 27 reset layout keeps text · 28 server persistence · 30/31 drag zone in preview · 32/33 Shift+3 / H · 34 camera mode (fake webcam) · 35/36 shortcuts in overlay window.

## 2. Visual checks (screenshots inspected)

| ID | Check | Result |
|---|---|---|
| QA-V01 | Overlay default (demo bg): three zones, logo, titles, WOD, coach, live clock, timer | VERIFIED_PASS |
| QA-V02 | Overlay transparent (`omitBackground`): corners/centre alpha 0, 71.3 % pixels fully transparent | VERIFIED_PASS |
| QA-V03 | Tabata work 0:06 yellow (warn), phase chip, "Runde 2 / 8", pips | VERIFIED_PASS |
| QA-V04 | Prep: full-stage "9" above timer plate, small face dimmed | VERIFIED_PASS (after fix: number moved up, face dimmed) |
| QA-V05 | Preset "Kreidetafel": chalk WOD left, logo + ring timer right, "TIME CAP 10:00" | VERIFIED_PASS (after fix: ring digits full size, timer below logo plate) |
| QA-V06 | Preset "Minimal" paused EMOM: no plates, "PAUSIERT · Runde 3 / 10" | VERIFIED_PASS |
| QA-V07 | Done state: red "0:00", "ZEIT!" chip pulsing | VERIFIED_PASS |

## 3. Responsive (no horizontal overflow measured via `scrollWidth`)

| ID | Page | Widths | Result |
|---|---|---|---|
| QA-R01 | Control | 1440, 1024, 768, 390, 360 | VERIFIED_PASS (360 px overflow of 13 px found and fixed: grid `minmax(0,1fr)`) |
| QA-R02 | Remote | 768, 390, 360 | VERIFIED_PASS (chip dot squeeze fixed) |
| QA-R03 | Start page | 1440, 390 | VERIFIED_PASS |
| QA-R04 | Overlay scaling | 1920×1080 (scale 1), control preview, start-page preview | VERIFIED_PASS |
| QA-R05 | Timer form hidden groups | `[hidden]` vs `display:grid` bug found and fixed | VERIFIED_PASS |

## 4. UI / accessibility

| ID | Check | Result |
|---|---|---|
| QA-U01 | Tabs: roles, `aria-selected`, arrow keys | IMPLEMENTED_NOT_TESTED (manual keyboard pass recommended) |
| QA-U02 | Typography controls (font, size, weight, colour, align, caps) apply in overlay | IMPLEMENTED_NOT_TESTED per control; generic `set` path verified by E2E-04 |
| QA-U03 | Timer appearance controls (font, size, ring/bar, colours, thresholds, labels) | IMPLEMENTED_NOT_TESTED per control; ring/bar verified visually (QA-V05) |
| QA-U04 | Focus visible, labelled inputs, dialog for confirmations, reduced motion | IMPLEMENTED_NOT_TESTED (no automated axe run) |
| QA-U05 | Help dialog lists shortcuts | VERIFIED_PASS (screenshot) |

## 5. Server / security

| ID | Check | Result |
|---|---|---|
| QA-S01 | `OVERLAY_KEY`: no key → 401, wrong key → 401, right key → 200 | VERIFIED_PASS |
| QA-S02 | Body > 8 MB → 413 | VERIFIED_PASS (after fix; previously socket destroyed) |
| QA-S03 | Invalid JSON → 400; `__proto__` path ignored | VERIFIED_PASS |
| QA-S04 | Dotfiles 403, path traversal not served | VERIFIED_PASS |
| QA-S05 | Persistence across server restart (`data/state.json`) | VERIFIED_PASS |
| QA-S06 | Logo `src` restricted to data:image/…, assets/, http(s) | VERIFIED_PASS (unit test) |

## 6. Streaming (client hardware)

| ID | Check | Result |
|---|---|---|
| S-1…S-8 | OBS browser source, timer sync, OBS audio, Virtual Camera → Zoom, 10 min Zoom session, Streamlabs, phone in studio Wi-Fi, OBS dock | BLOCKED_EXTERNAL – no OBS/Zoom/camera/audio device in the container. Protocol in `docs/STREAMING.md` §7 to be completed in milestone 4 |
| Audible beeps | Web Audio output | BLOCKED_EXTERNAL – no audio device; cue logic covered by code review |

## 7. Open risks

- Older OBS CEF versions: grid-row collapse animation degrades to instant (acceptable).
- Zoom audio requires mic/virtual cable (documented).
- Wake lock unavailable over plain-HTTP LAN (documented).
