/*
 * Bedienoberfläche (control.html)
 *
 * Aufbau:
 *  - Zustand kommt über CFO.sync (Server oder lokal) und wird in onState()
 *    an alle Bereiche verteilt.
 *  - Eingabefelder mit data-path schreiben generisch per "set"-Aktion.
 *  - Timer-Programm (data-cfg) wird gesammelt per "timerConfig" übernommen.
 */
(function () {
  'use strict';
  var CFO = window.CFO;
  var T = CFO.timer;
  var S = CFO.state;
  var $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };

  var state = null;
  var api = null;
  var draft = null; // Timer-Programm, das noch auf Bestätigung wartet
  var expanded = new Set(['logo', 'wod', 'timer']);
  var dragging = null;
  var previewScale = 1;
  var cue = CFO.audio.createCueTracker();

  CFO.icons.hydrate();

  // ---------------------------------------------------------------------------
  // Hilfen
  // ---------------------------------------------------------------------------

  var toastTimer = null;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 2600);
  }

  function confirmDialog(text, okLabel) {
    var dlg = $('#dlg-confirm');
    $('#dlg-confirm-text').textContent = text;
    $('#dlg-confirm-ok').textContent = okLabel || 'OK';
    return new Promise(function (resolve) {
      if (typeof dlg.showModal !== 'function') { resolve(window.confirm(text)); return; }
      dlg.returnValue = '';
      dlg.addEventListener('close', function onClose() {
        dlg.removeEventListener('close', onClose);
        resolve(dlg.returnValue === 'ok');
      });
      dlg.showModal();
    });
  }

  function dispatch(action) {
    if (!api) return;
    api.dispatch(action);
  }

  var debouncers = {};
  function debounce(key, ms, fn) {
    clearTimeout(debouncers[key]);
    debouncers[key] = setTimeout(fn, ms);
  }

  function toHexColor(v) {
    v = String(v || '').trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
    if (/^#[0-9a-f]{3}$/i.test(v)) return ('#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3]).toLowerCase();
    return '#000000';
  }

  function download(name, data) {
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function readJsonFile(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { try { resolve(JSON.parse(r.result)); } catch (e) { reject(new Error('Datei ist kein gültiges JSON')); } };
      r.onerror = function () { reject(new Error('Datei konnte nicht gelesen werden')); };
      r.readAsText(file);
    });
  }

  // ---------------------------------------------------------------------------
  // Tabs
  // ---------------------------------------------------------------------------

  var tabs = $$('.tabs [role="tab"]');
  function selectTab(btn) {
    tabs.forEach(function (b) {
      var on = b === btn;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
      document.getElementById(b.getAttribute('aria-controls')).hidden = !on;
    });
    try { sessionStorage.setItem('cfo:tab', btn.id); } catch (e) { /* egal */ }
  }
  tabs.forEach(function (b, i) {
    b.addEventListener('click', function () { selectTab(b); });
    b.addEventListener('keydown', function (ev) {
      if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
      ev.preventDefault();
      ev.stopPropagation();
      var next = tabs[(i + (ev.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      next.focus();
      selectTab(next);
    });
  });
  try {
    var savedTab = sessionStorage.getItem('cfo:tab');
    if (savedTab && document.getElementById(savedTab)) selectTab(document.getElementById(savedTab));
  } catch (e) { /* egal */ }

  // ---------------------------------------------------------------------------
  // Vorschau
  // ---------------------------------------------------------------------------

  var preview = $('#preview');
  var previewStage = $('#preview-stage');
  var renderer = CFO.render.create(previewStage, { mode: 'preview' });
  var guideV = document.createElement('div');
  var guideH = document.createElement('div');
  guideV.className = 'guide guide--v';
  guideH.className = 'guide guide--h';
  previewStage.appendChild(guideV);
  previewStage.appendChild(guideH);
  S.ZONES.forEach(function (z) { renderer.zoneNode(z).setAttribute('data-label', CFO.controlZones.ZONE_NAMES[z]); });

  function fitPreview() { previewScale = CFO.render.fit(previewStage, preview, 'width'); }
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(fitPreview).observe(preview);
  window.addEventListener('resize', fitPreview);
  fitPreview();

  var bgSeg = $('#preview-bg');
  function setPreviewBg(v) {
    preview.setAttribute('data-bg', v);
    $$('button', bgSeg).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-value') === v ? 'true' : 'false'); });
    try { localStorage.setItem('cfo:previewBg', v); } catch (e) { /* egal */ }
  }
  bgSeg.addEventListener('click', function (ev) {
    var b = ev.target.closest('button[data-value]');
    if (b) setPreviewBg(b.getAttribute('data-value'));
  });
  var storedBg = 'demo';
  try { storedBg = localStorage.getItem('cfo:previewBg') || 'demo'; } catch (e) { /* egal */ }
  setPreviewBg(storedBg);

  $('#edit-layout').addEventListener('change', function (ev) {
    preview.classList.toggle('is-editing', ev.target.checked);
  });

  // Zonen mit der Maus/dem Finger verschieben
  preview.addEventListener('pointerdown', function (ev) {
    if (!preview.classList.contains('is-editing') || !state) return;
    var zoneNode = ev.target.closest('.cfo-zone');
    if (!zoneNode) return;
    ev.preventDefault();
    var id = zoneNode.getAttribute('data-zone');
    var z = state.zones[id];
    dragging = { id: id, node: zoneNode, x0: ev.clientX, y0: ev.clientY, mx0: z.mx, my0: z.my, h: z.h, v: z.v, last: 0, pointerId: ev.pointerId };
    zoneNode.classList.add('is-dragging');
    preview.setPointerCapture(ev.pointerId);
  });

  preview.addEventListener('pointermove', function (ev) {
    if (!dragging) return;
    var dx = (ev.clientX - dragging.x0) / previewScale;
    var dy = (ev.clientY - dragging.y0) / previewScale;
    var step = ev.shiftKey ? 1 : 4;
    var mx = dragging.mx0 + (dragging.h === 'right' ? -dx : dx);
    var my = dragging.my0 + (dragging.v === 'bottom' ? -dy : dy);
    mx = Math.round(mx / step) * step;
    my = Math.round(my / step) * step;
    var snapV = dragging.h === 'center' && Math.abs(mx) < 14;
    var snapH = dragging.v === 'middle' && Math.abs(my) < 14;
    if (snapV) mx = 0;
    if (snapH) my = 0;
    guideV.classList.toggle('is-on', snapV);
    guideH.classList.toggle('is-on', snapH);
    dragging.mx = mx;
    dragging.my = my;
    var entries = [['zones.' + dragging.id + '.mx', mx], ['zones.' + dragging.id + '.my', my]];
    renderer.update(S.reduce(state, { type: 'setMany', entries: entries }));
    var now = Date.now();
    if (now - dragging.last > 120) {
      dragging.last = now;
      dispatch({ type: 'setMany', entries: entries });
    }
  });

  function endDrag() {
    if (!dragging) return;
    var d = dragging;
    dragging = null;
    d.node.classList.remove('is-dragging');
    guideV.classList.remove('is-on');
    guideH.classList.remove('is-on');
    if (typeof d.mx === 'number') dispatch({ type: 'setMany', entries: [['zones.' + d.id + '.mx', d.mx], ['zones.' + d.id + '.my', d.my]] });
  }
  preview.addEventListener('pointerup', endDrag);
  preview.addEventListener('pointercancel', endDrag);

  // ---------------------------------------------------------------------------
  // Generische Felder (data-path)
  // ---------------------------------------------------------------------------

  function valueFromInput(el) {
    var kind = el.getAttribute('data-kind');
    if (el.type === 'checkbox') return el.checked;
    if (el.type === 'number' || el.type === 'range' || kind === 'int') {
      var n = Number(el.value);
      return el.value === '' || !isFinite(n) ? undefined : n;
    }
    if (kind === 'color') return /^#[0-9a-f]{6}$/i.test(el.value.trim()) ? el.value.trim().toLowerCase() : undefined;
    return el.value;
  }

  function onFieldInput(ev) {
    var el = ev.target;
    var path = el.getAttribute && el.getAttribute('data-path');
    if (!path) return;
    var value = valueFromInput(el);
    if (value === undefined) return;
    var isText = el.tagName === 'TEXTAREA' || (el.type === 'text' && el.getAttribute('data-kind') !== 'color');
    var wait = isText ? 180 : el.type === 'color' ? 50 : 60;
    if (el.type === 'checkbox' || el.tagName === 'SELECT') wait = 0;
    var send = function () { dispatch({ type: 'set', path: path, value: value }); };
    if (wait) debounce(path, wait, send); else send();
  }
  document.addEventListener('input', function (ev) {
    if (ev.target.type === 'checkbox' || ev.target.tagName === 'SELECT') return; // kommt per "change"
    onFieldInput(ev);
  });
  document.addEventListener('change', function (ev) {
    if (ev.target.type === 'checkbox' || ev.target.tagName === 'SELECT') onFieldInput(ev);
  });

  // Segment-Schalter und Chips
  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest('.seg[data-path] button[data-value]');
    if (btn) {
      var segEl = btn.parentNode;
      var v = btn.getAttribute('data-value');
      dispatch({ type: 'set', path: segEl.getAttribute('data-path'), value: segEl.getAttribute('data-kind') === 'int' ? Number(v) : v });
      return;
    }
    var chip = ev.target.closest('.chip[data-path]');
    if (chip && state) {
      var p = chip.getAttribute('data-path');
      dispatch({ type: 'set', path: p, value: !S.getIn(state, p.split('.')) });
    }
  });

  function syncFields() {
    var active = document.activeElement;
    $$('[data-path]').forEach(function (el) {
      var val = S.getIn(state, el.getAttribute('data-path').split('.'));
      if (val === undefined) return;
      if (el.classList.contains('seg')) {
        $$('button[data-value]', el).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-value')) === String(val) ? 'true' : 'false'); });
        return;
      }
      if (el.classList.contains('chip')) { el.setAttribute('aria-pressed', val ? 'true' : 'false'); return; }
      if (el === active && el.type !== 'checkbox') return;
      if (el.type === 'checkbox') { el.checked = !!val; return; }
      if (el.type === 'color') { el.value = toHexColor(val); return; }
      if (el.getAttribute('data-kind') === 'color') { if (el.value.toLowerCase() !== String(val).toLowerCase()) el.value = String(val).toUpperCase(); return; }
      if (String(el.value) !== String(val)) el.value = String(val);
    });
    $$('output[data-out]').forEach(function (o) {
      o.textContent = S.getIn(state, o.getAttribute('data-out').split('.')) + (o.getAttribute('data-unit') || '');
    });
    $$('.el-card[data-el]').forEach(function (card) {
      var el = state.elements[card.getAttribute('data-el')];
      card.classList.toggle('is-off', !!el && !el.visible);
    });
    $$('[data-logo-thumb]').forEach(function (thumb) {
      var el = state.elements[thumb.getAttribute('data-logo-thumb')];
      var img = thumb.querySelector('img');
      var src = el && el.src ? el.src : '';
      if (img.getAttribute('src') !== src) {
        if (src) img.setAttribute('src', src); else img.removeAttribute('src');
      }
      img.hidden = !src;
    });
  }

  // ---------------------------------------------------------------------------
  // Zonen-Tabs, Karten, Reihenfolge, Logo
  // ---------------------------------------------------------------------------

  function renderZones() {
    S.ZONES.forEach(function (z) {
      var rebuilt = CFO.controlZones.renderZoneTab(document.getElementById('tab-' + z), z, state, expanded);
      if (rebuilt) CFO.icons.hydrate(document.getElementById('tab-' + z));
    });
  }

  document.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-action]');
    if (!t || !state) return;
    var action = t.getAttribute('data-action');
    var id = t.getAttribute('data-id');
    if (action === 'card-toggle') {
      var open = t.getAttribute('aria-expanded') !== 'true';
      t.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.getElementById(t.getAttribute('aria-controls')).hidden = !open;
      if (open) expanded.add(id); else expanded.delete(id);
    } else if (action === 'order-up' || action === 'order-down') {
      var el = state.elements[id];
      var list = S.zoneElements(state, el.zone).map(function (it) { return it.id; });
      var i = list.indexOf(id);
      var j = action === 'order-up' ? i - 1 : i + 1;
      if (j < 0 || j >= list.length) return;
      list[i] = list[j];
      list[j] = id;
      dispatch({ type: 'setMany', entries: list.map(function (eid, k) { return ['elements.' + eid + '.order', k + 1]; }) });
    } else if (action === 'logo-remove') {
      dispatch({ type: 'set', path: 'elements.' + id + '.src', value: '' });
      toast('Logo entfernt');
    } else if (action === 'logo-default') {
      dispatch({ type: 'set', path: 'elements.' + id + '.src', value: S.defaults().elements.logo.src });
      dispatch({ type: 'set', path: 'elements.' + id + '.visible', value: true });
    }
  });

  document.addEventListener('change', function (ev) {
    var input = ev.target;
    if (input.getAttribute && input.getAttribute('data-action') === 'logo-upload' && input.files && input.files[0]) {
      uploadLogo(input.getAttribute('data-id'), input.files[0]);
      input.value = '';
    }
  });

  document.addEventListener('dragover', function (ev) {
    var thumb = ev.target.closest && ev.target.closest('[data-logo-thumb]');
    if (!thumb) return;
    ev.preventDefault();
    thumb.classList.add('is-drop');
  });
  document.addEventListener('dragleave', function (ev) {
    var thumb = ev.target.closest && ev.target.closest('[data-logo-thumb]');
    if (thumb) thumb.classList.remove('is-drop');
  });
  document.addEventListener('drop', function (ev) {
    var thumb = ev.target.closest && ev.target.closest('[data-logo-thumb]');
    if (!thumb) return;
    ev.preventDefault();
    thumb.classList.remove('is-drop');
    var file = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
    if (file) uploadLogo(thumb.getAttribute('data-logo-thumb'), file);
  });

  /** Verkleinert Bilder auf max. 800 px (Transparenz bleibt erhalten). */
  function imageToDataUrl(file) {
    return new Promise(function (resolve, reject) {
      if (!/^image\/(png|jpeg|webp|gif|svg\+xml)$/.test(file.type)) return reject(new Error('Bitte PNG, JPG, WebP, GIF oder SVG verwenden'));
      if (file.size > 15 * 1024 * 1024) return reject(new Error('Datei ist größer als 15 MB'));
      if (file.type === 'image/svg+xml') {
        if (file.size > 1.5 * 1024 * 1024) return reject(new Error('SVG ist größer als 1,5 MB'));
        var r = new FileReader();
        r.onload = function () { resolve(r.result); };
        r.onerror = function () { reject(new Error('Datei konnte nicht gelesen werden')); };
        r.readAsDataURL(file);
        return;
      }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var max = 800;
        var scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.naturalWidth * scale));
        c.height = Math.max(1, Math.round(img.naturalHeight * scale));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        var out = c.toDataURL('image/webp', 0.92);
        if (out.indexOf('data:image/webp') !== 0) out = c.toDataURL('image/png');
        resolve(out);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Bild konnte nicht geladen werden')); };
      img.src = url;
    });
  }

  function uploadLogo(id, file) {
    imageToDataUrl(file).then(function (dataUrl) {
      dispatch({ type: 'setMany', entries: [['elements.' + id + '.src', dataUrl], ['elements.' + id + '.visible', true]] });
      toast('Logo aktualisiert');
    }).catch(function (err) { toast(err.message); });
  }

  // ---------------------------------------------------------------------------
  // Timer-Programm
  // ---------------------------------------------------------------------------

  var MODE_HINTS = {
    countdown: 'Zählt eine feste Zeit herunter – z. B. AMRAP oder Countdown.',
    stopwatch: 'Zählt hoch, optional bis zum Time Cap – z. B. For Time.',
    emom: 'Gleich lange Intervalle, Runde für Runde – z. B. jede Minute.',
    interval: 'Automatischer Wechsel Arbeit/Pause, optional in mehreren Sätzen – z. B. Tabata.',
    sequence: 'Beliebige Folge von Intervallen als Formel, z. B. „2m + 30 + 1:00“.'
  };

  var TIMER_PRESETS = S.TIMER_PRESETS;

  var presetWrap = $('#timer-presets');
  TIMER_PRESETS.forEach(function (p, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = p[0];
    b.setAttribute('data-preset', String(i));
    presetWrap.appendChild(b);
  });
  presetWrap.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-preset]');
    if (!b || !state) return;
    var cfg = TIMER_PRESETS[Number(b.getAttribute('data-preset'))][1];
    var go = function () {
      draft = null;
      dispatch({ type: 'timerConfig', config: cfg });
      toast('Timer: ' + b.textContent);
    };
    if (state.timer.run.status !== 'idle') {
      confirmDialog('Der Timer läuft. Neues Programm laden und Timer zurücksetzen?', 'Laden').then(function (ok) { if (ok) go(); });
    } else go();
  });

  function currentCfg() { return draft || (state && state.timer.config); }

  function cfgChange(key, value) {
    if (!state) return;
    var patch = {};
    patch[key] = value;
    if (key === 'title' || key === 'direction') {
      if (draft) draft[key] = value;
      dispatch({ type: 'timerConfig', config: patch });
      return;
    }
    if (state.timer.run.status !== 'idle') {
      draft = Object.assign({}, currentCfg(), patch);
      syncCfgForm();
      return;
    }
    dispatch({ type: 'timerConfig', config: patch });
  }

  $('#cfg-apply').addEventListener('click', function () {
    if (!draft) return;
    dispatch({ type: 'timerConfig', config: draft });
    draft = null;
    syncCfgForm();
    toast('Neues Programm übernommen');
  });
  $('#cfg-discard').addEventListener('click', function () {
    draft = null;
    syncCfgForm();
  });

  $$('[data-cfg]').forEach(function (el) {
    var key = el.getAttribute('data-cfg');
    var kind = el.getAttribute('data-kind');
    if (el.classList.contains('seg')) {
      el.addEventListener('click', function (ev) {
        var b = ev.target.closest('button[data-value]');
        if (b) cfgChange(key, b.getAttribute('data-value'));
      });
      return;
    }
    if (kind === 'bool') {
      el.addEventListener('change', function () { cfgChange(key, el.checked); });
      return;
    }
    el.addEventListener('input', function () {
      if (kind === 'time') {
        var sec = T.parseDuration(el.value);
        var okZero = key === 'capSec' || key === 'restSec' || key === 'setRestSec';
        var valid = isFinite(sec) && (sec > 0 || (okZero && sec === 0));
        el.setAttribute('aria-invalid', valid ? 'false' : 'true');
        if (valid) debounce('cfg:' + key, 450, function () { cfgChange(key, sec); });
      } else if (kind === 'int') {
        var n = parseInt(el.value, 10);
        if (isFinite(n)) debounce('cfg:' + key, 350, function () { cfgChange(key, n); });
      } else if (key === 'sequence') {
        var ok = renderSequencePreview(el.value);
        if (ok) debounce('cfg:' + key, 450, function () { cfgChange(key, el.value); });
      } else {
        debounce('cfg:' + key, 300, function () { cfgChange(key, el.value); });
      }
    });
    el.addEventListener('blur', function () {
      if (kind === 'time') { el.removeAttribute('aria-invalid'); syncCfgForm(true); }
    });
  });

  function renderSequencePreview(src) {
    var box = $('#seq-preview');
    var err = $('#seq-error');
    var input = $('#cfg-sequence');
    while (box.firstChild) box.removeChild(box.firstChild);
    try {
      var items = T.parseSequence(src);
      err.textContent = '';
      input.setAttribute('aria-invalid', 'false');
      items.slice(0, 48).forEach(function (it) {
        var s = document.createElement('span');
        s.className = it.kind === 'rest' ? 'rest' : '';
        s.textContent = T.formatClock(it.sec) + (it.kind === 'rest' ? ' P' : '');
        box.appendChild(s);
      });
      if (items.length > 48) {
        var more = document.createElement('span');
        more.className = 'more';
        more.textContent = '+' + (items.length - 48) + ' weitere';
        box.appendChild(more);
      }
      return true;
    } catch (e) {
      err.textContent = e.message + (typeof e.pos === 'number' ? ' (Zeichen ' + (e.pos + 1) + ')' : '');
      input.setAttribute('aria-invalid', 'true');
      return false;
    }
  }

  function syncCfgForm(force) {
    var cfg = currentCfg();
    if (!cfg) return;
    var active = document.activeElement;
    $$('[data-cfg]').forEach(function (el) {
      var key = el.getAttribute('data-cfg');
      var kind = el.getAttribute('data-kind');
      var val = cfg[key];
      if (el.classList.contains('seg')) {
        $$('button[data-value]', el).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-value') === String(val) ? 'true' : 'false'); });
        return;
      }
      if (el === active && !force) return;
      if (kind === 'bool') el.checked = !!val;
      else if (kind === 'time') { el.value = T.formatClock(val); }
      else if (String(el.value) !== String(val)) el.value = val;
    });
    $$('[data-mode]').forEach(function (g) { g.hidden = g.getAttribute('data-mode') !== cfg.mode; });
    $('#mode-hint').textContent = MODE_HINTS[cfg.mode] || '';
    $('#cfg-title').placeholder = T.autoTitle(cfg);
    $('#cfg-pending').hidden = !draft;
    if (cfg.mode === 'sequence' && active !== $('#cfg-sequence')) renderSequencePreview(cfg.sequence);

    var program = T.buildProgram(cfg);
    var body = program.segments.filter(function (s) { return s.kind !== 'prep'; });
    var bodySec = 0;
    body.forEach(function (s) { bodySec += s.sec; });
    var parts = [];
    if (program.openEnded) parts.push('Offen – läuft bis zum Stopp');
    else parts.push('Gesamtdauer ' + T.formatClock(bodySec));
    if (body.length > 1) parts.push(body.length + ' Abschnitte');
    if (program.hasPrep) parts.push('+ ' + program.segments[0].sec + ' s Vorlauf');
    if (program.error) parts.push('⚠ ' + program.error);
    $('#program-summary').textContent = parts.join(' · ');
  }

  // ---------------------------------------------------------------------------
  // Transport
  // ---------------------------------------------------------------------------

  var toggleBtn = $('#btn-toggle');
  var resetBtn = $('#btn-reset');
  var resetArmed = 0;

  toggleBtn.addEventListener('click', function () { CFO.audio.unlock(); dispatch({ type: 'timer', cmd: 'toggle' }); });
  $$('.tbtn[data-cmd]').forEach(function (b) {
    b.addEventListener('click', function () { dispatch({ type: 'timer', cmd: b.getAttribute('data-cmd') }); });
  });
  resetBtn.addEventListener('click', function () {
    if (!state || state.timer.run.status === 'idle') return;
    if (Date.now() < resetArmed) {
      resetArmed = 0;
      resetBtn.classList.remove('is-armed');
      resetBtn.lastChild.textContent = 'Reset';
      dispatch({ type: 'timer', cmd: 'reset' });
      return;
    }
    resetArmed = Date.now() + 2500;
    resetBtn.classList.add('is-armed');
    resetBtn.lastChild.textContent = 'Sicher?';
    setTimeout(function () {
      if (Date.now() >= resetArmed) { resetBtn.classList.remove('is-armed'); resetBtn.lastChild.textContent = 'Reset'; }
    }, 2600);
  });

  var lastToggleState = null;
  function updateTransport(desc) {
    $('#ro-time').textContent = desc.time;
    $('#ro-time').style.setProperty('--tc', desc.color);
    $('#ro-title').textContent = desc.title;
    $('#ro-phase').textContent = desc.line || (desc.snap.status === 'idle' ? 'Bereit' : '');
    var st = desc.snap.status;
    if (st !== lastToggleState) {
      lastToggleState = st;
      var label = st === 'running' ? 'Pause' : st === 'paused' ? 'Weiter' : st === 'done' ? 'Neu starten' : 'Start';
      toggleBtn.setAttribute('data-state', st);
      toggleBtn.setAttribute('aria-label', label + ' (Leertaste)');
      while (toggleBtn.firstChild) toggleBtn.removeChild(toggleBtn.firstChild);
      toggleBtn.appendChild(CFO.icons.icon(st === 'running' ? 'pause' : 'play'));
      var span = document.createElement('span');
      span.textContent = label;
      toggleBtn.appendChild(span);
      resetBtn.disabled = state.timer.run.status === 'idle';
    }
  }

  function loop() {
    if (state && api && !dragging) {
      var now = api.now();
      var snap = renderer.tick(now);
      var desc = CFO.render.describe(state, renderer.program(), now);
      updateTransport(desc);
      var c = snap ? cue(snap) : null;
      var snd = state.timer.sound;
      if (c && snd.enabled && (snd.output === 'control' || snd.output === 'both')) CFO.audio.play(c, snd.volume / 100);
    }
    requestAnimationFrame(loop);
  }

  document.addEventListener('pointerdown', function () { CFO.audio.unlock(); }, { once: true });
  $('#sound-test').addEventListener('click', function () {
    var vol = state ? state.timer.sound.volume / 100 : 0.8;
    CFO.audio.play('tick', vol);
    setTimeout(function () { CFO.audio.play('go', vol); }, 450);
  });

  // ---------------------------------------------------------------------------
  // Szenen
  // ---------------------------------------------------------------------------

  $('#scene-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var input = $('#scene-name');
    dispatch({ type: 'sceneSave', name: input.value });
    toast('Szene gespeichert');
    input.value = '';
  });

  function sceneButton(cls, label, iconName, action, id) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.setAttribute('data-scene-action', action);
    b.setAttribute('data-id', id);
    b.setAttribute('aria-label', label);
    b.title = label;
    if (iconName) b.appendChild(CFO.icons.icon(iconName));
    if (cls.indexOf('btn--icon') < 0) { var s = document.createElement('span'); s.textContent = label; b.appendChild(s); }
    return b;
  }

  var lastScenesKey = null;
  function renderScenes() {
    var key = JSON.stringify(state.scenes.map(function (s) { return [s.id, s.name, s.savedAt]; })) + state.activeSceneId;
    if (key === lastScenesKey) return;
    lastScenesKey = key;
    var list = $('#scene-list');
    var quick = $('#quick-scenes');
    while (list.firstChild) list.removeChild(list.firstChild);
    while (quick.firstChild) quick.removeChild(quick.firstChild);
    if (!state.scenes.length) {
      var empty = document.createElement('li');
      empty.className = 'scene-empty';
      empty.textContent = 'Noch keine Szenen gespeichert.';
      list.appendChild(empty);
      var q = document.createElement('span');
      q.className = 'hint';
      q.textContent = 'Noch keine – im Tab „Szenen“ speichern';
      quick.appendChild(q);
      return;
    }
    state.scenes.forEach(function (sc, i) {
      var li = document.createElement('li');
      li.classList.toggle('is-active', sc.id === state.activeSceneId);
      var k = document.createElement('kbd');
      k.className = 'key';
      k.textContent = i < 9 ? String(i + 1) : '–';
      var info = document.createElement('div');
      var name = document.createElement('div');
      name.className = 'scene-name';
      name.textContent = sc.name;
      var meta = document.createElement('div');
      meta.className = 'scene-meta';
      meta.textContent = sc.savedAt ? 'gespeichert ' + new Date(sc.savedAt).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : '';
      info.appendChild(name);
      info.appendChild(meta);
      var actions = document.createElement('div');
      actions.className = 'actions';
      actions.appendChild(sceneButton('btn btn--sm btn--primary', 'Laden', null, 'load', sc.id));
      actions.appendChild(sceneButton('btn btn--sm btn--ghost btn--icon', 'Mit aktuellem Layout überschreiben', 'save', 'overwrite', sc.id));
      actions.appendChild(sceneButton('btn btn--sm btn--ghost btn--icon', 'Umbenennen', 'edit', 'rename', sc.id));
      actions.appendChild(sceneButton('btn btn--sm btn--ghost btn--icon btn--danger', 'Löschen', 'trash', 'delete', sc.id));
      li.appendChild(k);
      li.appendChild(info);
      li.appendChild(actions);
      list.appendChild(li);

      if (i < 9) {
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip';
        chip.setAttribute('data-scene-action', 'load');
        chip.setAttribute('data-id', sc.id);
        chip.setAttribute('aria-pressed', sc.id === state.activeSceneId ? 'true' : 'false');
        var n = document.createElement('span');
        n.className = 'num';
        n.textContent = String(i + 1);
        chip.appendChild(n);
        chip.appendChild(document.createTextNode(sc.name));
        quick.appendChild(chip);
      }
    });
  }

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-scene-action]');
    if (!b || !state) return;
    var id = b.getAttribute('data-id');
    var sc = state.scenes.filter(function (s) { return s.id === id; })[0];
    if (!sc) return;
    var action = b.getAttribute('data-scene-action');
    if (action === 'load') {
      dispatch({ type: 'sceneLoad', id: id });
      toast('Szene „' + sc.name + '“ geladen');
    } else if (action === 'overwrite') {
      confirmDialog('Szene „' + sc.name + '“ mit dem aktuellen Layout überschreiben?', 'Überschreiben').then(function (ok) {
        if (ok) { dispatch({ type: 'sceneSave', id: id, name: sc.name }); toast('Szene aktualisiert'); }
      });
    } else if (action === 'rename') {
      var nameEl = b.closest('li').querySelector('.scene-name');
      var input = document.createElement('input');
      input.type = 'text';
      input.value = sc.name;
      input.maxLength = 60;
      input.setAttribute('aria-label', 'Neuer Name');
      nameEl.replaceWith(input);
      input.focus();
      input.select();
      var done = false;
      var finish = function (save) {
        if (done) return;
        done = true;
        if (save && input.value.trim()) dispatch({ type: 'sceneRename', id: id, name: input.value });
        lastScenesKey = null;
        renderScenes();
      };
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') finish(true);
        if (e.key === 'Escape') finish(false);
      });
      input.addEventListener('blur', function () { finish(true); });
    } else if (action === 'delete') {
      confirmDialog('Szene „' + sc.name + '“ löschen?', 'Löschen').then(function (ok) {
        if (ok) dispatch({ type: 'sceneDelete', id: id });
      });
    }
  });

  $('#btn-export-scenes').addEventListener('click', function () {
    if (!state) return;
    download('overlay-szenen-' + new Date().toISOString().slice(0, 10) + '.json', { app: 'crossfit-overlay', type: 'scenes', version: S.VERSION, exportedAt: new Date().toISOString(), scenes: state.scenes });
  });
  $('#btn-export-all').addEventListener('click', function () {
    if (!state) return;
    var copy = S.clone(state);
    copy.timer.run = T.idleRun();
    download('overlay-konfiguration-' + new Date().toISOString().slice(0, 10) + '.json', { app: 'crossfit-overlay', type: 'config', version: S.VERSION, exportedAt: new Date().toISOString(), state: copy });
  });
  $('#file-import-scenes').addEventListener('change', function (ev) {
    var file = ev.target.files[0];
    ev.target.value = '';
    if (!file) return;
    readJsonFile(file).then(function (data) {
      var scenes = Array.isArray(data) ? data : data && Array.isArray(data.scenes) ? data.scenes : data && data.state && data.state.scenes;
      if (!scenes || !scenes.length) throw new Error('Keine Szenen in der Datei gefunden');
      dispatch({ type: 'sceneImport', scenes: scenes });
      toast(scenes.length + ' Szene(n) importiert');
    }).catch(function (e) { toast(e.message); });
  });
  $('#file-import-all').addEventListener('change', function (ev) {
    var file = ev.target.files[0];
    ev.target.value = '';
    if (!file) return;
    readJsonFile(file).then(function (data) {
      var st = data && data.type === 'config' ? data.state : data;
      if (!st || typeof st !== 'object' || !st.elements) throw new Error('Keine Overlay-Konfiguration in der Datei gefunden');
      return confirmDialog('Aktuelle Konfiguration inklusive Szenen durch die Datei ersetzen?', 'Ersetzen').then(function (ok) {
        if (ok) { dispatch({ type: 'replace', state: st }); toast('Konfiguration geladen'); }
      });
    }).catch(function (e) { toast(e.message); });
  });

  // ---------------------------------------------------------------------------
  // Layout-Tab
  // ---------------------------------------------------------------------------

  var PRESET_THUMBS = {
    broadcast: [[3, 5, 26, 34, 1], [70, 5, 27, 46, 1], [32, 70, 36, 25, 1]],
    classic: [[3, 5, 32, 60, 0], [76, 5, 21, 40, 0], [76, 50, 21, 30, 0]],
    minimal: []
  };
  Object.keys(S.PRESETS).forEach(function (id) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'preset';
    var thumb = document.createElement('span');
    thumb.className = 'preset__thumb';
    (PRESET_THUMBS[id] || []).forEach(function (r) {
      var i = document.createElement('i');
      i.style.cssText = 'left:' + r[0] + '%;top:' + r[1] + '%;width:' + r[2] + '%;height:' + r[3] + '%';
      thumb.appendChild(i);
      if (r[4]) {
        var s = document.createElement('i');
        s.className = 's';
        s.style.cssText = 'left:' + r[0] + '%;top:' + r[1] + '%;width:3px;height:' + r[3] + '%';
        thumb.appendChild(s);
      }
    });
    if (id === 'minimal') {
      var t = document.createElement('i');
      t.style.cssText = 'left:30%;top:72%;width:40%;height:18%;background:transparent;border-bottom:3px solid #fff';
      thumb.appendChild(t);
    }
    var label = document.createElement('span');
    label.textContent = S.PRESETS[id].name;
    b.appendChild(thumb);
    b.appendChild(label);
    b.addEventListener('click', function () {
      confirmDialog('Vorlage „' + S.PRESETS[id].name + '“ anwenden? Positionen und Gestaltung werden ersetzt – Texte, Logo und Timer bleiben.', 'Anwenden').then(function (ok) {
        if (ok) dispatch({ type: 'preset', id: id });
      });
    });
    $('#preset-list').appendChild(b);
  });

  $('#btn-reset-layout').addEventListener('click', function () {
    confirmDialog('Standardlayout wiederherstellen? Texte, Logo, Timer und Szenen bleiben erhalten.', 'Wiederherstellen').then(function (ok) {
      if (ok) { dispatch({ type: 'resetLayout' }); toast('Standardlayout wiederhergestellt'); }
    });
  });
  $('#btn-reset-all').addEventListener('click', function () {
    confirmDialog('Alles auf Werkseinstellung zurücksetzen? Texte, Logo und Gestaltung gehen verloren – nur gespeicherte Szenen bleiben.', 'Zurücksetzen').then(function (ok) {
      if (ok) { draft = null; dispatch({ type: 'resetAll' }); toast('Werkseinstellungen geladen'); }
    });
  });

  // ---------------------------------------------------------------------------
  // Stream-Tab, Hilfe, Verbindung
  // ---------------------------------------------------------------------------

  function baseUrl() { return location.href.replace(/[?#].*$/, '').replace(/[^/]*$/, ''); }

  function setupStreamTab(info) {
    var base = baseUrl();
    var keyQ = api.key ? '?key=' + encodeURIComponent(api.key) : '';
    $('#url-overlay').value = base + 'overlay.html';
    $('#url-camera').value = base + 'overlay.html?camera=1';
    var remoteBase = info.lanUrls && info.lanUrls.length && /localhost|127\.0\.0\.1/.test(location.hostname) ? info.lanUrls[0] : base;
    $('#url-remote').value = remoteBase + 'remote.html' + keyQ;
    $('#open-remote').href = 'remote.html' + keyQ;
    $('#open-overlay').href = 'overlay.html?bg=demo';
    var notice = $('#mode-notice');
    while (notice.firstChild) notice.removeChild(notice.firstChild);
    var p = document.createElement('p');
    if (api.mode === 'server') {
      notice.className = 'notice';
      p.textContent = 'Server-Modus: OBS, diese Regie und Smartphones im selben WLAN sind live verbunden. Einstellungen werden auf diesem Rechner gespeichert (data/state.json).';
      var lan = info.lanUrls || [];
      var hint = lan.length ? 'Smartphone muss im selben WLAN sein.' : 'Server läuft nur lokal (HOST=127.0.0.1) – für das Handy HOST=0.0.0.0 setzen.';
      if (lan.length > 1) hint += ' Weitere Adressen dieses Rechners: ' + lan.slice(1).map(function (u) { return u + 'remote.html'; }).join(', ');
      $('#remote-hint').textContent = hint;
    } else {
      notice.className = 'notice notice--local';
      p.textContent = 'Lokaler Testmodus (ohne Server): Overlay und Regie synchronisieren sich nur innerhalb dieses Browsers. Für OBS und die Handy-Fernbedienung den lokalen Server starten (siehe README).';
      $('#remote-hint').textContent = 'Im Testmodus funktioniert die Fernbedienung nur als weiterer Tab in diesem Browser.';
    }
    notice.appendChild(p);
  }

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-copy]');
    if (!b) return;
    var input = document.getElementById(b.getAttribute('data-copy'));
    var done = function () { toast('Kopiert'); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(input.value).then(done, function () { input.select(); document.execCommand('copy'); done(); });
    else { input.select(); document.execCommand('copy'); done(); }
  });

  var keysList = $('#keys-list');
  CFO.shortcuts.LIST.forEach(function (k) {
    var dt = document.createElement('dt');
    k[0].forEach(function (key, i) {
      if (i) dt.appendChild(document.createTextNode(' '));
      if (key === '…') { dt.appendChild(document.createTextNode('…')); return; }
      var kb = document.createElement('kbd');
      kb.textContent = key;
      dt.appendChild(kb);
    });
    var dd = document.createElement('dd');
    dd.textContent = k[1];
    keysList.appendChild(dt);
    keysList.appendChild(dd);
  });
  function openHelp() { var d = $('#dlg-help'); if (d.showModal && !d.open) d.showModal(); }
  $('#btn-help').addEventListener('click', openHelp);
  $$('[data-close]').forEach(function (b) { b.addEventListener('click', function () { b.closest('dialog').close(); }); });

  function setStatus(st) {
    var el = $('#conn');
    if (st.mode === 'local') { el.setAttribute('data-state', 'local'); el.textContent = 'Lokaler Testmodus'; el.title = 'Ohne Server: nur dieser Browser'; }
    else if (st.connected) { el.setAttribute('data-state', 'ok'); el.textContent = 'Server verbunden'; el.title = ''; }
    else { el.setAttribute('data-state', 'error'); el.textContent = 'Server getrennt – verbinde neu …'; }
    if (st.error) toast(st.error);
  }

  // ---------------------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------------------

  function onState(s) {
    state = s;
    if (!dragging) renderer.update(s);
    renderZones();
    syncFields();
    syncCfgForm();
    renderScenes();
  }

  CFO.sync.connect({ onState: onState, onStatus: setStatus }).then(function (a) {
    api = a;
    setupStreamTab(a.info);
    CFO.shortcuts.bind({
      getState: function () { return state; },
      dispatch: dispatch,
      notify: toast,
      onHelp: openHelp
    });
    requestAnimationFrame(loop);
  });
})();
