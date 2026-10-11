#!/usr/bin/env node
/*
 * End-to-End-Test mit echtem Browser (Playwright/Chromium).
 * Startet einen eigenen Server mit leerem Datenordner, prüft alle Kernfunktionen
 * (Timer, Synchronisation, Szenen, Fernbedienung, Logo, Kamera-Modus) und beendet ihn.
 *
 *   npm run test:e2e
 *
 * Voraussetzung (einmalig, nur für Entwickler – nicht für den Betrieb nötig):
 *   npm install --no-save playwright && npx playwright install chromium
 */
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

let chromium;
try {
  ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright'));
} catch (e) {
  console.error('Playwright fehlt. Einmalig installieren:\n  npm install --no-save playwright && npx playwright install chromium');
  process.exit(2);
}

const ROOT = path.join(__dirname, '..', '..');
const PORT = Number(process.env.E2E_PORT) || 18080;
const BASE = 'http://localhost:' + PORT + '/';
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'overlay-e2e-'));
// 1×1-PNG als Test-Logo
const LOGO = path.join(DATA, 'logo.png');
fs.writeFileSync(LOGO, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64'));

const results = [];
const log = (id, ok, msg) => { results.push({ id, ok, msg }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' – ' + msg); };

function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: Object.assign({}, process.env, { PORT: String(PORT), HOST: '127.0.0.1', DATA_DIR: DATA, OVERLAY_KEY: '' }) });
    proc.stdout.on('data', (d) => { if (/läuft/.test(String(d))) resolve(proc); });
    proc.stderr.on('data', (d) => process.stderr.write(d));
    proc.on('exit', (code) => reject(new Error('Server beendet (' + code + ')')));
  });
}

(async () => {
  const server = await startServer();
  const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['camera'] });
  const errors = [];
  const watch = (p, name) => {
    p.on('console', (m) => { if (m.type() === 'error') errors.push(name + ': ' + m.text()); });
    p.on('pageerror', (e) => errors.push(name + ' pageerror: ' + e.message));
  };
  try {
    const control = await ctx.newPage(); watch(control, 'control');
    const overlay = await ctx.newPage(); watch(overlay, 'overlay');
    await overlay.setViewportSize({ width: 1920, height: 1080 });
    await control.goto(BASE + 'control.html');
    await overlay.goto(BASE + 'overlay.html?hint=0');
    await control.waitForSelector('#conn[data-state="ok"]', { timeout: 5000 });
    log('E2E-01', true, 'Regie verbunden (Server-Modus)');

    // Reset to known state
    await control.evaluate(() => fetch('api/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actions: [{ type: 'resetAll' }, { type: 'timerConfig', config: { mode: 'countdown', durationSec: 60, prepSec: 3, title: 'TEST 1' } }] }) }));
    await overlay.waitForTimeout(500);
    const t0 = await overlay.textContent('.cfo-timer__digits');
    log('E2E-02', t0 === '1:00', 'overlay shows configured duration 1:00 (got ' + t0 + ')');
    const title = await overlay.textContent('.cfo-timer__title');
    log('E2E-03', title === 'TEST 1', 'overlay shows custom title (got ' + title + ')');

    // Text sync: change brand in control (left tab)
    await control.click('#t-left');
    const brandInput = control.locator('textarea[data-path="elements.brand.text"]');
    await control.click('[data-action="card-toggle"][data-id="brand"]');
    await brandInput.fill('CrossFit Passau');
    await overlay.waitForTimeout(700);
    const brand = await overlay.textContent('.cfo-el[data-id="brand"] .cfo-text');
    log('E2E-04', brand === 'CrossFit Passau', 'brand text syncs control → overlay (got ' + brand + ')');

    // Start via keyboard space in control (focus body)
    await control.click('.monitor__bar .section-title');
    await control.keyboard.press('Space');
    await overlay.waitForTimeout(1200);
    const prepOn = await overlay.evaluate(() => document.querySelector('.cfo-prep').classList.contains('is-on'));
    const prepNum = await overlay.textContent('.cfo-prep__num');
    log('E2E-05', prepOn && /^[123]$/.test(prepNum), 'Space starts timer, overlay shows big prep countdown (' + prepNum + ')');
    await overlay.waitForTimeout(3000);
    const running = await overlay.textContent('.cfo-timer__digits');
    const status = await overlay.getAttribute('.cfo-timer', 'data-status');
    log('E2E-06', status === 'running' && /^0:5\d$/.test(running), 'after prep the countdown runs (' + running + ', ' + status + ')');
    const tc = await overlay.evaluate(() => getComputedStyle(document.querySelector('.cfo-timer')).getPropertyValue('--tc').trim());
    log('E2E-07', tc.toLowerCase() === '#35d07f', 'colour shift: green while > warn threshold (' + tc + ')');

    // Pause via button
    await control.click('#btn-toggle');
    await overlay.waitForTimeout(400);
    const paused1 = await overlay.textContent('.cfo-timer__digits');
    await overlay.waitForTimeout(1500);
    const paused2 = await overlay.textContent('.cfo-timer__digits');
    const pStatus = await overlay.getAttribute('.cfo-timer', 'data-status');
    log('E2E-08', pStatus === 'paused' && paused1 === paused2, 'pause freezes time (' + paused1 + ' = ' + paused2 + ')');
    const btnLabel = await control.textContent('#btn-toggle');
    log('E2E-09', /Weiter/.test(btnLabel), 'toggle button shows "Weiter" while paused (' + btnLabel.trim() + ')');

    // Resume
    await control.click('#btn-toggle');
    await overlay.waitForTimeout(1300);
    const resumed = await overlay.textContent('.cfo-timer__digits');
    log('E2E-10', resumed !== paused2, 'resume continues counting (' + paused2 + ' → ' + resumed + ')');

    // Reset needs two clicks
    await control.click('#btn-reset');
    await overlay.waitForTimeout(300);
    const stillRunning = await overlay.getAttribute('.cfo-timer', 'data-status');
    await control.click('#btn-reset');
    await overlay.waitForTimeout(500);
    const afterReset = await overlay.getAttribute('.cfo-timer', 'data-status');
    const resetDigits = await overlay.textContent('.cfo-timer__digits');
    log('E2E-11', stillRunning === 'running' && afterReset === 'idle' && resetDigits === '1:00', 'reset requires confirmation click and restores 1:00');

    // Tabata preset → work/rest phase + rounds + pips
    await control.click('#t-timer');
    await control.click('#timer-presets [data-preset="3"]');
    await control.evaluate(() => fetch('api/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actions: [{ type: 'timerConfig', config: { prepSec: 0 } }, { type: 'timer', cmd: 'start' }] }) }));
    await overlay.waitForTimeout(800);
    const phase = await overlay.textContent('.cfo-timer__phase');
    const round = await overlay.textContent('.cfo-timer__round');
    const pips = await overlay.locator('.cfo-timer__pips i').count();
    log('E2E-12', /arbeit/i.test(phase) && /1 \/ 8/.test(round) && pips === 8, 'Tabata: phase "' + phase + '", "' + round + '", ' + pips + ' pips');
    await control.keyboard.press('ArrowRight');
    await overlay.waitForTimeout(600);
    const phase2 = await overlay.textContent('.cfo-timer__phase');
    log('E2E-13', /pause/i.test(phase2), 'ArrowRight skips to rest interval ("' + phase2 + '")');
    const restColor = await overlay.evaluate(() => getComputedStyle(document.querySelector('.cfo-timer')).getPropertyValue('--tc').trim());
    log('E2E-14', restColor.toLowerCase() === '#5ab8ff', 'rest colour applied (' + restColor + ')');

    // Sequence parse error in UI
    await control.click('.seg[data-cfg="mode"] button[data-value="sequence"]');
    await control.waitForTimeout(200);
    // timer running → change goes to draft (pending banner)
    const pendingVisible = await control.isVisible('#cfg-pending');
    log('E2E-15', pendingVisible, 'changing program while running shows confirmation banner');
    await control.click('#cfg-discard');
    await control.evaluate(() => fetch('api/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actions: [{ type: 'timer', cmd: 'reset' }] }) }));
    await control.waitForTimeout(300);
    await control.click('.seg[data-cfg="mode"] button[data-value="sequence"]');
    await control.waitForTimeout(300);
    await control.fill('#cfg-sequence', '2m + (30');
    await control.waitForTimeout(200);
    const seqErr = await control.textContent('#seq-error');
    log('E2E-16', /Klammer/.test(seqErr), 'invalid sequence shows readable error ("' + seqErr + '")');
    await control.fill('#cfg-sequence', '2m + 30 + 1:00');
    await control.waitForTimeout(800);
    const chips = await control.locator('#seq-preview span').allTextContents();
    const ovRound = await overlay.textContent('.cfo-timer__round');
    log('E2E-17', chips.join(',') === '2:00,0:30,1:00' && /1 \/ 3/.test(ovRound), 'sequence "2m + 30 + 1:00" parsed: ' + chips.join(',') + ' / overlay "' + ovRound + '"');

    // Scenes: save, change, load via key 1
    await control.click('#t-scenes');
    await control.fill('#scene-name', 'Fran');
    await control.click('#scene-form button[type="submit"]');
    await control.waitForTimeout(400);
    await control.evaluate(() => fetch('api/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actions: [{ type: 'set', path: 'elements.brand.text', value: 'Anders' }] }) }));
    await overlay.waitForTimeout(400);
    await control.click('.monitor__bar .section-title');
    await control.keyboard.press('Digit1');
    await overlay.waitForTimeout(600);
    const brand2 = await overlay.textContent('.cfo-el[data-id="brand"] .cfo-text');
    log('E2E-18', brand2 === 'CrossFit Passau', 'scene saved and loaded with key 1 (brand "' + brand2 + '")');

    // Visibility toggle via quick chip → overlay zone hidden
    await control.click('#quick-visibility [data-path="zones.right.visible"]');
    await overlay.waitForTimeout(600);
    const rightHidden = await overlay.evaluate(() => document.querySelector('.cfo-zone[data-zone="right"]').classList.contains('is-hidden'));
    log('E2E-19', rightHidden, 'quick toggle hides right zone in overlay');
    await control.click('#quick-visibility [data-path="zones.right.visible"]');

    // Remote page on phone viewport
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const remote = await phone.newPage(); watch(remote, 'remote');
    await remote.goto(BASE + 'remote.html');
    await remote.waitForSelector('#conn[data-state="ok"]', { timeout: 5000 });
    await remote.tap('#r-vis [data-path="zones.left.visible"]');
    await overlay.waitForTimeout(600);
    const leftHidden = await overlay.evaluate(() => document.querySelector('.cfo-zone[data-zone="left"]').classList.contains('is-hidden'));
    log('E2E-20', leftHidden, 'remote toggles left zone visibility on overlay');
    await remote.tap('#r-vis [data-path="zones.left.visible"]');
    await remote.tap('#r-toggle');
    await overlay.waitForTimeout(700);
    const remoteStart = await overlay.getAttribute('.cfo-timer', 'data-status');
    log('E2E-21', remoteStart === 'running', 'remote start button starts overlay timer (' + remoteStart + ')');
    const remoteTime = await remote.textContent('#r-time');
    const ovTime = await overlay.textContent('.cfo-timer__digits');
    log('E2E-22', remoteTime === ovTime || Math.abs(parseInt(remoteTime.split(':')[1]) - parseInt(ovTime.split(':')[1])) <= 1, 'remote and overlay show same time (' + remoteTime + ' / ' + ovTime + ')');
    // hold-to-reset
    const box = await remote.locator('#r-reset').boundingBox();
    await remote.mouse.move(box.x + 20, box.y + 20);
    await remote.mouse.down();
    await remote.waitForTimeout(1100);
    await remote.mouse.up();
    await overlay.waitForTimeout(500);
    const afterHold = await overlay.getAttribute('.cfo-timer', 'data-status');
    log('E2E-23', afterHold === 'idle', 'remote hold-to-reset resets timer (' + afterHold + ')');

    // Remote quick text edit
    await remote.click('.r-edit summary');
    await remote.fill('#e-coach', 'Lena');
    await overlay.waitForTimeout(800);
    const coach = await overlay.textContent('.cfo-labeled__value');
    log('E2E-24', coach === 'Lena', 'remote text edit reaches overlay (coach "' + coach + '")');

    // Logo upload via file input (left tab)
    await control.click('#t-left');
    const fileInput = control.locator('input[data-action="logo-upload"]');
    await fileInput.setInputFiles(LOGO);
    await overlay.waitForTimeout(1200);
    const src = await overlay.getAttribute('.cfo-logo', 'src');
    log('E2E-25', /^data:image\/(webp|png)/.test(src || ''), 'logo upload replaces overlay logo (' + (src || '').slice(0, 22) + '…)');
    await control.click('[data-action="logo-remove"]');
    await overlay.waitForTimeout(600);
    const logoHidden = await overlay.evaluate(() => document.querySelector('.cfo-el[data-id="logo"]').classList.contains('is-hidden'));
    log('E2E-26', logoHidden, 'logo remove hides logo element');
    await control.click('[data-action="logo-default"]');

    // Reset layout keeps text
    await control.evaluate(() => fetch('api/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actions: [{ type: 'set', path: 'zones.left.width', value: 900 }, { type: 'resetLayout' }] }) }));
    await overlay.waitForTimeout(500);
    const w = await overlay.evaluate(() => document.querySelector('.cfo-zone[data-zone="left"]').style.width);
    const brand3 = await overlay.textContent('.cfo-el[data-id="brand"] .cfo-text');
    log('E2E-27', w === '470px' && brand3 === 'CrossFit Passau', 'reset layout restores width (' + w + ') and keeps texts');

    // Persistence: GET state from server
    const persisted = await control.evaluate(() => fetch('api/state').then((r) => r.json()));
    log('E2E-28', persisted.state.scenes.length === 1, 'server state holds saved scene');


      const c = control;
      const o = overlay;
    // Drag left zone in preview
    await c.check('#edit-layout');
    const zone = c.locator('#preview .cfo-zone[data-zone="left"]');
    const b = await zone.boundingBox();
    await c.mouse.move(b.x + 40, b.y + 40); await c.mouse.down();
    await c.mouse.move(b.x + 140, b.y + 90, { steps: 8 }); await c.mouse.up();
    await c.waitForTimeout(500);
    const dragState = await c.evaluate(() => fetch('api/state').then((r) => r.json()));
    log('E2E-30', dragState.state.zones.left.mx > 150 && dragState.state.zones.left.my > 90, 'dragging left zone in preview updates position (mx ' + dragState.state.zones.left.mx + ', my ' + dragState.state.zones.left.my + ')');
    const ovLeft = await o.evaluate(() => document.querySelector('.cfo-zone[data-zone="left"]').style.left);
    log('E2E-31', ovLeft === dragState.state.zones.left.mx + 'px', 'overlay follows dragged position (' + ovLeft + ')');
    await c.uncheck('#edit-layout');

    // Keyboard zone toggles
    await c.click('.monitor__bar .section-title');
    await c.keyboard.press('Shift+Digit3'); await o.waitForTimeout(500);
    const rightHidden2 = await o.evaluate(() => document.querySelector('.cfo-zone[data-zone="right"]').classList.contains('is-hidden'));
    log('E2E-32', rightHidden2, 'Shift+3 hides right zone');
    await c.keyboard.press('Shift+Digit3');
    await c.keyboard.press('KeyH'); await o.waitForTimeout(500);
    const allHidden = await o.evaluate(() => [...document.querySelectorAll('.cfo-zone')].every((z) => z.classList.contains('is-hidden')));
    log('E2E-33', allHidden, 'H hides the whole overlay');
    await c.keyboard.press('KeyH');

    // Camera mode (eigene Seite mit Fake-Kamera)
    const camPage = await ctx.newPage(); watch(camPage, 'camera');
    await camPage.goto(BASE + 'overlay.html?camera=1&hint=0');
    await camPage.waitForTimeout(1200);
    const cam = await camPage.evaluate(() => { const v = document.querySelector('video.ov-camera'); return v && v.srcObject ? v.srcObject.getVideoTracks().length : 0; });
    log('E2E-34', cam === 1, 'camera mode attaches a webcam stream behind the overlay (fake device)');
  
    // Overlay keyboard: space toggles timer from overlay window
    await camPage.bringToFront();
    await camPage.keyboard.press('Space'); await camPage.waitForTimeout(600);
    const s2 = await c.evaluate(() => fetch('api/state').then((r) => r.json()));
    log('E2E-35', s2.state.timer.run.status === 'running', 'Space in overlay window starts timer (camera/standalone use)');
    await camPage.keyboard.press('KeyR'); await camPage.keyboard.press('KeyR'); await camPage.waitForTimeout(500);
    const s3 = await c.evaluate(() => fetch('api/state').then((r) => r.json()));
    log('E2E-36', s3.state.timer.run.status === 'idle', 'R R in overlay window resets timer');


    log('E2E-99', errors.length === 0, errors.length ? 'Konsolenfehler:\n' + errors.join('\n') : 'keine Konsolenfehler');
  } finally {
    await browser.close();
    await new Promise((r) => { server.once('exit', r); server.kill(); });
    fs.rmSync(DATA, { recursive: true, force: true });
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log('\n' + (results.length - failed) + '/' + results.length + ' bestanden');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
