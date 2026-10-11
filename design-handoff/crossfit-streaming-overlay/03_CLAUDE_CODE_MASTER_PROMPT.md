# 03 · Claude Code Master Prompt — CrossFit Streaming Overlay (maintenance & extension)

Paste this into a fresh Claude Code session opened on this repository.

---

## Mission

You maintain and extend a **custom CrossFit streaming overlay**: a transparent 1920×1080 browser overlay (OBS/Streamlabs browser source, Zoom via OBS Virtual Camera) with three zones (left: logo/titles, centre: timer, right: WOD/coach/notes/clock), a separate control UI, a phone remote, and a zero-dependency Node server for live sync. The client owns the code and must be able to run it without you. Your job is to **implement, test, commit and push working code** — not to stop at plans or docs.

## Source of truth (read first, in this order)

1. `README.md` – overview, run commands, hosting/costs
2. `design-handoff/crossfit-streaming-overlay/01_CLIENT_BRIEF_ANALYSIS.md` – REQ-001…REQ-047 with original German brief quotes
3. `design-handoff/crossfit-streaming-overlay/02_CREATIVE_DESIGN_BLUEPRINT.md` – art direction "Competition Floor", tokens, motion
4. `docs/ENTWICKLUNG.md` – architecture, data flow, how to add elements, API
5. `docs/ANGEBOT.md` – what is "enthalten" vs "spätere Erweiterung" (do not silently build paid extras into the fixed price)
6. `04_QA_ACCEPTANCE_CHECKLIST.md`, `05_GITHUB_VERCEL_HANDOFF.md`

## Immovable constraints

- **Plain HTML5/CSS/JS, no build step, no runtime dependencies, no CDNs.** Do not add React/Next/Tailwind/jQuery or npm runtime packages. Dev-only tools (Playwright) must stay optional (`--no-save`).
- Files in `public/js/core/` are UMD modules shared by browser and `server.js` – keep them DOM-free and ES5/ES2015 compatible (OBS uses an older Chromium/CEF).
- All state changes go through `reduce()` actions in `state.js`; validate every new path/type in `validateSet`. Insert user text only via `textContent`.
- Timer is timestamp-based (`startedAt`, `pausedAt`, `pausedMs`); never introduce tick counters.
- Overlay must stay transparent, 1920×1080, with no controls visible in the stream (`window.obsstudio` → no toasts/hints).
- No secrets in the repo; `data/` is runtime data and git-ignored. The repository is **public** – never commit client logos or private client data.
- German UI copy; overlay labels remain editable (`timer.labels`).

## Design system (keep consistent)

Accent `#E30613`; plates `#111214` @ 80 %, 7 px signal edge on the screen-side edge, 26 px bevelled corner; Barlow Condensed 700–800 caps for titles/timer, Inter for body; timer colours ok `#35D07F`, warn `#FFC531`, alert `#FF3B30`, rest `#5AB8FF`; parallelogram chips; round pips. Motion: opacity/transform only, `--anim-ms`, respect `prefers-reduced-motion` in UIs.

## Typical tasks and where to change

- New element of existing type → one entry in `defaults().elements` (control card and overlay render automatically).
- New element type (e.g. rotating sponsor bar, participant list, chat ticker) → `ELEMENT_TYPES` + defaults (`state.js`), `builders` (+ `tick` if time-based) in `render.js`, `bodies` in `control-zones.js`, styles in `overlay.css`, tests.
- New timer mode → `MODES`, `buildProgram`, `autoTitle`, `roundText` in `render.js`, control form section `[data-mode]`, unit tests.

## Execution sequence

1. Discover: `git status`, read the files above, run `npm test`.
2. Plan the smallest change that satisfies the request; map it to REQ IDs or a new REQ.
3. Implement code (not just docs).
4. Verify: `npm test`; `npm run test:e2e` (needs `npm install --no-save playwright && npx playwright install chromium`); screenshot overlay (`overlay.html?bg=demo`) and control at 1440/1024/768/390/360 px; check console errors and horizontal overflow; verify transparency with `?bg=transparent` + `omitBackground`.
5. Update docs (`docs/ANLEITUNG.md`, `docs/ENTWICKLUNG.md`, `docs/LIZENZEN.md` if assets/fonts change) and the QA checklist.
6. Commit with a descriptive message; push to the authorised branch (never force-push; feature branch + PR if `main` is protected).
7. Vercel: static output `public/` (see `vercel.json`); deploy a **preview** only when authorised; never claim a URL you have not opened.
8. Report: files changed, commands + results, REQ status, repo/branch/commit, preview URL only if verified, open blockers (e.g. OBS/Zoom field test on client hardware).

## Definition of done

All affected REQs verified with evidence; no console errors; no layout overflow at tested widths; unit + E2E green; docs updated; pushed; honest status for anything not testable in your environment (OBS, Zoom, real webcams, audio output).
