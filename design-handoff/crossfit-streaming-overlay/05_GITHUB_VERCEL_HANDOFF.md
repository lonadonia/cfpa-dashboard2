# 05 · GitHub & Vercel Handoff — CrossFit Streaming Overlay

```
Project:            crossfit-streaming-overlay (CrossFit-Streaming-Overlay, HTML5 · Timer · Logo · OBS/Zoom)
Implementation:     BUILT – overlay, control UI, phone remote, zero-dependency server, docs, offer draft
Stack:              Plain HTML5/CSS/JavaScript (no build, no runtime deps) + Node.js ≥ 18 server (node:http only)
                    Verified with Node.js 22.22.0, Chromium 141 (Playwright 1.56.1)
Local path:         /home/user/cfpa-dashboard2
Local build:        NOT_APPLICABLE (no build step) – `npm test` PASS 28/28, `npm run test:e2e` PASS 36/36
GitHub status:      PUSHED
GitHub repo URL:    https://github.com/lonadonia/cfpa-dashboard2
Visibility:         public (verified via GitHub API) – client logo and chalkboard image committed at the user's request
Branch:             claude/elegant-feynman-ieql5j
Commit SHA:         4c6318cb8cf5656901e94e88eb9a781ce3da8879 (initial implementation; later handoff commits on the same branch)
Vercel readiness:   VERIFIED_READY – static output `public/`, `vercel.json` (framework null, no install/build, outputDirectory public);
                    static test mode verified on a plain static server (LOCAL-01…05)
Vercel preview:     PREVIEW_NOT_DEPLOYED
Vercel URL:         NOT_AVAILABLE
Blocker:            Vercel API 403 "Not authorized: Trying to access resource under scope hakims-projects-8cc34b62"
                    when creating the deployment (the connected token can list projects but not deploy); no Vercel CLI
                    in the environment
Alternative test link: claude.ai Artifact (private, owner must share it): https://claude.ai/artifact/UnGB5kfJ7g4SdhcQCRZhsB
                    – static test mode; not render-verified inside the artifact viewer; camera mode, file downloads
                    and new-tab links may be restricted by the viewer sandbox
Environment keys:   PORT, HOST, OVERLAY_KEY, DATA_DIR (all optional, see .env.example) – none needed on Vercel
Production:         UNCHANGED (no production deployment, no DNS, no secrets)
```

## Why the server matters

The static deployment (Vercel/any web host) runs in **test mode**: control and overlay sync only between tabs of one browser (localStorage + BroadcastChannel). OBS uses its own browser profile, so for OBS, the phone remote and multi-device use the client runs `server.js` locally (double-click `start-windows.bat` / `start-mac.command`). This is disclosed in the offer (§5.1).

## Next user actions

1. **Vercel preview (optional):** in the Vercel dashboard → *Add New Project* → import `lonadonia/cfpa-dashboard2`, branch `claude/elegant-feynman-ieql5j`; settings are read from `vercel.json` (Framework: Other, no build, output `public`). Or re-authorise the Vercel connector for the scope and ask for the preview again.
2. **Share the test link** with the client via the artifact's Share menu (it is private until shared), or send the Vercel preview once it exists.
3. **Field test (milestone 4):** on a Windows/macOS PC with OBS Studio + Zoom run protocol S-1…S-8 in `docs/STREAMING.md` and record versions/results.
4. **Before sending the offer:** review `docs/ANGEBOT.md` (prices per feature, dates, wording) – it is marked as a draft.
5. **Repository visibility:** the repo is public and now contains the client's logo and the reference chalkboard image (restored at the user's request). Switch the repo to private if the client does not want these published.
6. **Merge:** open a pull request from `claude/elegant-feynman-ieql5j` into `main` when ready (not created automatically).
