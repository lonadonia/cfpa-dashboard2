# 02 · Creative Design Blueprint — CrossFit Streaming Overlay

## 1. Experience thesis

For CrossFit coaches streaming a live class, the overlay should feel **like a competition broadcast — legible from across the room, energetic, and calm to operate** by using a sports-scoreboard grammar (graphite plates, a red signal edge, condensed caps, tabular timer digits) and a control room UI with one big transport button, leading to classes that look professional while the coach never fights the software.

## 2. Three territories considered

| Territory | Proposition | Layout DNA | Type | Verdict |
|---|---|---|---|---|
| **A · Competition Floor** (chosen) | The CrossFit-Games broadcast brought to the home WOD | Edge-anchored graphite plates with a 7 px red signal edge and a 26 px cut corner (bumper-plate bevel); timer as a scoreboard tab at the bottom centre | Barlow Condensed 800 caps for titles/digits, Inter for body | Best legibility over arbitrary camera video, strongest brand fit (red from client logo), scales from minimal to full |
| B · Chalk & Steel | The box whiteboard on screen | Loose chalk lettering on dark slate, ring timer at the side | Cabin Sketch + condensed sans | Closest to reference; weaker legibility for body text over video → kept as preset "Kreidetafel (wie Referenz)" |
| C · Floating Glass | Minimal translucent cards | Blurred glass cards, soft radii | Inter | Generic, GPU-heavy blur in OBS, low brand character → rejected (blur kept only as opt-in) |

Scoring (fidelity 30 / task clarity 25 / originality 20 / a11y 15 / feasibility 10): A 4.6 · B 3.9 · C 2.8.

## 3. Distinctive motif

- **Signal edge:** red bar on the screen-side edge of each plate (left plate → left edge, right → right edge, timer → top edge).
- **Bevelled corner:** one corner cut at 26 px, like the chamfer of a bumper plate.
- **Round pips:** completed rounds shown as a row of skewed bars ("plates on the bar"); current round pulses in the timer colour.
- **Parallelogram chips:** phase ("ARBEIT", "PAUSE", "ZEIT!") and labels ("COACH", "LIVE") as skewed chips.

## 4. Design tokens

| Token | Value | Use |
|---|---|---|
| Accent | `#E30613` | signal edge, chips, bullets (taken from client logo red) |
| Plate | `#111214` @ 80 % | zone panels |
| Text | `#FFFFFF` / `#D5D8DE` / `#C9CCD3` | titles / subtitle / notes |
| Timer base / ok / warn / alert | `#FFFFFF` / `#35D07F` / `#FFC531` / `#FF3B30` | idle / > warn / ≤ 10 s / ≤ 5 s |
| Rest / prep | `#5AB8FF` / `#FFC531` | rest intervals / prep countdown |
| Control UI | bg `#0C0D0F`, surfaces `#15171A`…`#252930`, focus `#5AB8FF` | dark control room (no glare next to OBS) |

Type scale (stage px): brand 56/800 caps · title 34/700 caps · body 22–26 Inter · timer digits 190 (prep 460) with measured fixed-width digit cells (no jitter).

Grid: 1920×1080 stage, 48 px safe margin, zones edge-anchored (9-point anchor + offsets), widths 470 / 640 / 450.

## 5. Screens

| Screen | Route | Objective |
|---|---|---|
| Start | `/index.html` | explain, link views, show mode and LAN URL, live preview |
| Control | `/control.html` | edit everything, run timer, scenes; live preview with drag-to-move |
| Overlay | `/overlay.html` | the OBS browser source; `?bg=demo|checker|green|black`, `?camera=1` |
| Remote | `/remote.html` | phone: big transport, hold-to-reset, zones, scenes, quick text |

### Overlay zones (default "Broadcast")
1. **Left (top-left):** logo → brand → title (accent) → subtitle → free text (hidden by default).
2. **Centre (bottom-centre):** title ("AMRAP 12") → digits → progress bar → phase chip + round text → round pips.
3. **Right (top-right):** "WOD" → WOD rich text (headings, bullets, bold) → COACH chip + name → notes → LIVE clock.
4. **Prep:** full-stage number 10…1 with pulse, then "LOS!"; small timer face dims while shown.

### Control layout
Desktop: preview + transport + quick bar (left), tabbed panel 360–460 px (right): Timer · Links · Mitte · Rechts · Layout · Szenen · Stream. ≤ 900 px: stacked, tabs wrap ≤ 640 px.

## 6. Responsive behaviour

- Overlay: fixed 1920×1080 stage scaled by `min(w/1920, h/1080)`; identical pixels in OBS (scale 1).
- Control: 1440 two-column; 1024 two-column (panel 360); 768/390/360 stacked; no horizontal overflow (verified).
- Remote: single column ≤ 720 px, two columns above; 72 px transport buttons; safe-area insets.

## 7. Motion storyboard

| Element | Trigger | Property | Duration/easing | Reduced motion |
|---|---|---|---|---|
| Zone show/hide | visibility toggle | opacity + translate 70 px toward screen edge (slide) / opacity (fade) / scale .82 (zoom) | `animMs` (450) `cubic-bezier(.2,.8,.2,1)` | instant |
| Element show/hide | switch | grid-rows 1fr→0fr + opacity | `animMs` | instant |
| Timer colour | threshold | color | 350 ms | kept (state, not motion) |
| Prep number | each second | scale 1.35→1, opacity | 900 ms | instant |
| Paused | status | digits blink | 1.4 s steps | single |
| Done | status | chip pulse | 0.9 s | single |
| Live dot | always | opacity | 1.6 s | single |

## 8. Accessibility & performance

- Control UI: semantic tabs (roles, arrow-key navigation), labelled inputs, visible focus, 30–72 px touch targets, `prefers-reduced-motion`, dialogs via `<dialog>`.
- Overlay: no backdrop blur by default (OBS GPU), transforms/opacity for animation, per-frame updates only touch changed digits.
- Security: user text via `textContent`; colours via CSSOM; server validates every write path and type.

## 9. Assets

| Asset | Status |
|---|---|
| Fonts (7 OFL families, latin subset) | bundled locally |
| Placeholder logo, demo background, icons | created for project |
| Client logo | provided by client via upload (not committed – public repo) |
| Beeps | synthesised (Web Audio) |
